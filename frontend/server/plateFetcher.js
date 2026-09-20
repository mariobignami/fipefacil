/**
 * Busca o HTML da consulta de placa.
 *
 * O site fonte (tabelafipebrasil.com) está atrás do Cloudflare com desafio
 * JavaScript ("Just a moment..."), que responde 403 para qualquer requisição
 * HTTP simples (fetch/axios/curl) — não importa o User-Agent ou os headers.
 *
 * Estratégia:
 *   1. Tenta um fetch HTTP simples (rápido). Serve para o caso da fonte liberar
 *      acesso direto ou de existir um proxy liberado configurado.
 *   2. Se vier 403/desafio, usa um navegador que executa o JavaScript do desafio
 *      e devolve a página real. Há dois modos:
 *        - local (padrão): Playwright abre um Chromium no próprio host, reaproveitado
 *          entre consultas;
 *        - remoto (PLATE_BROWSER_WS_ENDPOINT): conecta por CDP em um navegador
 *          hospedado (ex.: Browserless). Não consome memória do backend, então
 *          roda tranquilo em planos pequenos.
 */

const {
  SOURCE_URL,
  buildPlateUrl,
  hasFipeContent,
  isCloudflareChallenge,
} = require('./plateScraper.js');

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
];

class PlateFetchError extends Error {
  constructor(code, message, meta = {}) {
    super(message);
    this.name = 'PlateFetchError';
    this.code = code;
    this.meta = meta;
  }
}

const config = {
  requestTimeoutMs: Number(process.env.PLATE_FETCH_TIMEOUT_MS || 25000),
  challengeTimeoutMs: Number(process.env.PLATE_CHALLENGE_TIMEOUT_MS || 20000),
  idleShutdownMs: Number(process.env.PLATE_BROWSER_IDLE_MS || 5 * 60 * 1000),
  browserChannel: process.env.PLATE_BROWSER_CHANNEL || '',
  headless: process.env.PLATE_BROWSER_HEADLESS !== 'false',
  blockAssets: process.env.PLATE_BLOCK_ASSETS !== 'false',
  // Por padrão NÃO sobrescrevemos o User-Agent: o navegador (local ou remoto)
  // já envia um UA coerente com o próprio fingerprint. Forçar um UA diferente
  // cria inconsistência com os Client Hints e facilita a detecção de bot.
  // Use PLATE_USER_AGENT apenas se precisar de um valor específico.
  userAgent: process.env.PLATE_USER_AGENT || '',
  // Endpoint CDP de um navegador remoto (ex.: Browserless).
  // Vazio = navegador local do Playwright.
  //
  // IMPORTANTE: a fonte bloqueia IPs de datacenter, então o endpoint precisa de
  // proxy residencial. URL recomendada (Browserless):
  //   wss://production-sfo.browserless.io/stealth?token=SEU_TOKEN
  //     &emulationOs=windows&proxy=residential&proxyCountry=br&proxySticky=true
  wsEndpoint:
    process.env.PLATE_BROWSER_WS_ENDPOINT || process.env.BROWSER_WS_ENDPOINT || '',
};

/** Como o navegador será obtido: 'remote' (CDP) ou 'local' (Playwright). */
function browserMode() {
  return config.wsEndpoint ? 'remote' : 'local';
}

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (error) {
    throw new PlateFetchError(
      'BROWSER_UNAVAILABLE',
      'Playwright não está instalado no servidor.',
      { hint: 'Execute: npm install && npx playwright install chromium' }
    );
  }
}

let browserPromise = null;
let browserInstance = null;
let contextInstance = null;
let idleTimer = null;
let activeLaunches = 0;
let warnedAboutBrowser = false;

// Quando a fonte responde com desafio para requisições HTTP simples, evitamos
// gastar uma requisição por consulta: só tentamos de novo depois deste intervalo.
const DIRECT_RETRY_MS = Number(process.env.PLATE_DIRECT_RETRY_MS || 10 * 60 * 1000);
let directBlockedUntil = 0;

// Fila simples: um navegador headless consome memória, então evitamos
// navegações simultâneas (importante em planos pequenos de hospedagem).
let queue = Promise.resolve();

function enqueue(task) {
  const result = queue.then(task, task);
  queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function scheduleIdleShutdown() {
  if (idleTimer) clearTimeout(idleTimer);
  if (!config.idleShutdownMs) return;

  idleTimer = setTimeout(() => {
    closeBrowser().catch(() => {});
  }, config.idleShutdownMs);

  if (typeof idleTimer.unref === 'function') idleTimer.unref();
}

async function launchBrowser() {
  const playwright = loadPlaywright();

  // No desenvolvimento local usamos o Chrome/Edge instalado se o Chromium
  // do Playwright não estiver baixado.
  const candidates = [config.browserChannel, '', 'chrome', 'msedge'].filter(
    (channel, index, list) => list.indexOf(channel) === index
  );

  const failures = [];

  for (const channel of candidates) {
    try {
      const browser = await playwright.chromium.launch({
        headless: config.headless,
        args: BROWSER_ARGS,
        ...(channel ? { channel } : {}),
      });

      browser.on('disconnected', () => {
        browserInstance = null;
        contextInstance = null;
        browserPromise = null;
      });

      console.log(
        `[plate-fetcher] Navegador headless pronto (${
          channel ? `canal ${channel}` : 'chromium do Playwright'
        }).`
      );

      return browser;
    } catch (error) {
      failures.push(`${channel || 'chromium'}: ${error.message.split('\n')[0]}`);
    }
  }

  throw new PlateFetchError(
    'BROWSER_UNAVAILABLE',
    'Não foi possível iniciar nenhum navegador headless no servidor.',
    { failures, hint: 'Execute: npx playwright install --with-deps chromium' }
  );
}

async function ensureBrowser() {
  if (browserInstance && browserInstance.isConnected()) return browserInstance;

  if (!browserPromise) {
    activeLaunches += 1;
    browserPromise = launchBrowser()
      .then((browser) => {
        browserInstance = browser;
        return browser;
      })
      .catch((error) => {
        browserPromise = null;
        throw error;
      })
      .finally(() => {
        activeLaunches -= 1;
      });
  }

  return browserPromise;
}

async function buildContextOptions() {
  return {
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    ...(config.userAgent ? { userAgent: config.userAgent } : {}),
    viewport: { width: 1366, height: 900 },
    ignoreHTTPSErrors: false,
  };
}

async function prepareContext(context) {
  context.setDefaultTimeout(config.requestTimeoutMs);
  context.setDefaultNavigationTimeout(config.requestTimeoutMs);

  if (config.blockAssets) {
    await context.route('**/*', (route) => {
      const type = route.request().resourceType();
      const url = route.request().url();

      const isAsset = ['image', 'media', 'font', 'stylesheet'].includes(type);
      const isNoise = /google-analytics|googletagmanager|doubleclick|gstatic/.test(url);

      if (isAsset || isNoise) return route.abort().catch(() => {});
      return route.continue().catch(() => {});
    });
  }

  return context;
}

async function ensureContext(browser) {
  if (contextInstance) return contextInstance;

  const context = await browser.newContext(await buildContextOptions());
  await prepareContext(context);

  contextInstance = context;
  return context;
}

/** Esconde o token do endpoint CDP antes de colocar em log/mensagem de erro. */
function maskEndpoint(endpoint) {
  return String(endpoint || '').replace(/(token=)[^&]+/i, '$1***');
}

/** Abre a página, espera o desafio do Cloudflare resolver e devolve o HTML. */
async function loadPlateHtml(context, url) {
  const page = await context.newPage();

  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: config.requestTimeoutMs,
    });

    const status = response ? response.status() : 0;

    try {
      await page.waitForFunction(
        () => !/just a moment/i.test(document.title || '') && !!document.title,
        { timeout: config.challengeTimeoutMs }
      );
    } catch {
      // Se o desafio não resolveu, validamos o conteúdo abaixo.
    }

    const html = await page.content();

    if (isCloudflareChallenge(html)) {
      throw new PlateFetchError(
        'SOURCE_BLOCKED',
        'O Cloudflare da fonte não liberou o acesso nem para o navegador headless.',
        {
          status,
          url,
          browserMode: browserMode(),
          hint:
            'IPs de datacenter são bloqueados pela fonte. Configure o navegador remoto com proxy residencial (ex.: /stealth?...&proxy=residential&proxyCountry=br).',
        }
      );
    }

    return { ok: status < 400 || status === 0, status, finalUrl: page.url(), html };
  } catch (error) {
    if (error instanceof PlateFetchError) throw error;

    const timedOut = /timeout/i.test(error.message || '');
    throw new PlateFetchError(
      timedOut ? 'SOURCE_TIMEOUT' : 'SOURCE_UNAVAILABLE',
      timedOut
        ? 'A fonte demorou demais para responder.'
        : 'Falha ao carregar a página da fonte no navegador headless.',
      { cause: error.message, browserMode: browserMode() }
    );
  } finally {
    await page.close().catch(() => {});
  }
}

/** Navegador local: Chromium do Playwright, reaproveitado entre consultas. */
async function fetchWithLocalBrowser(url) {
  const context = await ensureContext(await ensureBrowser());

  try {
    return await loadPlateHtml(context, url);
  } finally {
    scheduleIdleShutdown();
  }
}

/**
 * Navegador remoto via CDP (ex.: Browserless). Cada consulta abre e encerra a
 * própria sessão remota — assim o backend não gasta memória com Chromium.
 */
async function fetchWithRemoteBrowser(url) {
  const playwright = loadPlaywright();

  let browser;
  try {
    browser = await playwright.chromium.connectOverCDP(config.wsEndpoint, {
      timeout: config.requestTimeoutMs,
    });
  } catch (error) {
    throw new PlateFetchError(
      'BROWSER_UNAVAILABLE',
      'Não foi possível conectar ao navegador remoto (CDP).',
      {
        endpoint: maskEndpoint(config.wsEndpoint),
        cause: error.message.split('\n')[0],
        hint: 'Confira PLATE_BROWSER_WS_ENDPOINT e o token do serviço.',
      }
    );
  }

  try {
    const context = await browser
      .newContext(await buildContextOptions())
      .then(prepareContext)
      .catch(() => browser.contexts()[0]);

    return await loadPlateHtml(context, url);
  } finally {
    // Encerra a sessão remota e libera a unidade no serviço de navegador.
    await browser.close().catch(() => {});
  }
}

/** Estratégia 2: navegador que resolve o desafio do Cloudflare. */
function fetchWithBrowser(url) {
  return browserMode() === 'remote'
    ? fetchWithRemoteBrowser(url)
    : fetchWithLocalBrowser(url);
}

/** Libera o navegador (chamado no shutdown e depois de um tempo ocioso). */
async function closeBrowser() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }

  const browser = browserInstance;
  browserInstance = null;
  contextInstance = null;
  browserPromise = null;

  if (!browser) return;

  try {
    await browser.close();
    console.log('[plate-fetcher] Navegador headless encerrado.');
  } catch (error) {
    console.error('[plate-fetcher] Falha ao encerrar navegador:', error.message);
  }
}

function isReusablePlateHtml(html) {
  return (
    typeof html === 'string' &&
    html.length > 0 &&
    !isCloudflareChallenge(html) &&
    hasFipeContent(html)
  );
}

/** Estratégia 1: requisição HTTP simples (sem JavaScript). */
async function fetchWithHttp(url, { timeoutMs } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || config.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': config.userAgent || DEFAULT_USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: `${SOURCE_URL}/`,
        'Cache-Control': 'max-age=0',
      },
    });

    const html = await response.text();
    const challenged = isCloudflareChallenge(html, response.headers);

    return {
      ok: response.ok && !challenged,
      status: response.status,
      challenged,
      finalUrl: response.url,
      html,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Busca o HTML de uma placa, tentando HTTP simples e depois navegador headless.
 * @param {string} plate placa já normalizada (ABC1234 / ABC1D23)
 * @returns {Promise<{html: string, via: 'http'|'browser', status: number, attempts: object[]}>}
 */
async function fetchPlateHtml(plate) {
  const url = buildPlateUrl(plate);
  const attempts = [];

  let httpResult = null;
  const shouldTryHttp = Date.now() >= directBlockedUntil;

  if (shouldTryHttp) {
    try {
      httpResult = await fetchWithHttp(url, { timeoutMs: 10000 });
      attempts.push({
        via: 'http',
        status: httpResult.status,
        challenged: httpResult.challenged,
        ok: httpResult.ok,
      });

      if (httpResult.ok && isReusablePlateHtml(httpResult.html)) {
        return { html: httpResult.html, via: 'http', status: httpResult.status, attempts };
      }

      if (httpResult.challenged) {
        directBlockedUntil = Date.now() + DIRECT_RETRY_MS;
        console.log(
          `[plate-fetcher] Fonte bloqueou requisição HTTP simples (status ${httpResult.status}). ` +
            'Usando navegador headless nas próximas consultas.'
        );
      }
    } catch (error) {
      attempts.push({ via: 'http', error: error.message });
    }
  } else {
    attempts.push({ via: 'http', skipped: 'bloqueado recentemente' });
  }

  let browserResult;
  try {
    browserResult = await enqueue(() => fetchWithBrowser(url));
    attempts.push({
      via: 'browser',
      mode: browserMode(),
      status: browserResult.status,
      ok: browserResult.ok,
    });
  } catch (error) {
    attempts.push({
      via: 'browser',
      mode: browserMode(),
      error: error.message,
      code: error.code,
    });
    error.meta = { ...(error.meta || {}), attempts, sourceStatus: httpResult?.status };
    throw error;
  }

  // Alguns status não significam bloqueio: 404 pode ser "placa não encontrada"
  // (aí o parser decide) e 429 é limite temporário de requisições.
  if (!browserResult.ok && browserResult.status >= 400) {
    if (browserResult.status === 429) {
      throw new PlateFetchError(
        'SOURCE_RATE_LIMITED',
        'A fonte limitou temporariamente as consultas (429). Tente novamente em alguns minutos.',
        { status: 429, url, attempts }
      );
    }

    if ([403, 503, 1020].includes(browserResult.status)) {
      throw new PlateFetchError(
        'SOURCE_BLOCKED',
        `A fonte respondeu ${browserResult.status} mesmo com navegador headless.`,
        {
          status: browserResult.status,
          url,
          attempts,
          hint:
            'IPs de datacenter são bloqueados pela fonte. Configure o navegador remoto com proxy residencial (ex.: /stealth?...&proxy=residential&proxyCountry=br).',
        }
      );
    }
  }

  return {
    html: browserResult.html,
    via: 'browser',
    status: browserResult.status,
    attempts,
  };
}

module.exports = {
  PlateFetchError,
  fetchPlateHtml,
  closeBrowser,
  isReusablePlateHtml,
  browserMode,
  config,
};
