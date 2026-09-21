const express = require('express');
const cors = require('cors');

const {
  SOURCE_URL,
  normalizePlateInput,
  isValidPlate,
  parsePlateHtml,
} = require('./plateScraper.js');

const {
  PlateFetchError,
  fetchPlateHtml,
  fetchAssetAsDataUri,
  warmup,
  closeBrowser,
  browserMode,
} = require('./plateFetcher.js');

const app = express();

// Origens permitidas (separadas por vírgula). Padrão: GitHub Pages do projeto.
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || 'https://mariobignami.github.io'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
}));

app.use(express.json());

const PORT = process.env.PORT || 3001;

// Cache em memória: evita abrir o navegador remoto para a mesma placa em
// consultas repetidas. Os dados de veículo praticamente não mudam e os valores
// FIPE são atualizados mensalmente, então um TTL longo é seguro.
const CACHE_TTL_MS = Number(process.env.PLATE_CACHE_TTL_MS || 6 * 60 * 60 * 1000);
const CACHE_MAX_ENTRIES = Number(process.env.PLATE_CACHE_MAX_ENTRIES || 200);
const cache = new Map();

function readCache(plate) {
  const entry = cache.get(plate);
  if (!entry) return null;

  if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
    cache.delete(plate);
    return null;
  }

  return entry.payload;
}

function writeCache(plate, payload) {
  cache.set(plate, { storedAt: Date.now(), payload });

  while (cache.size > CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'fipefacil-api',
    diagnostic: true,
    source: SOURCE_URL,
    browserMode: browserMode(),
  });
});

// Pré-aquecimento: abre o navegador enquanto o usuário ainda está digitando,
// para a consulta em si não pagar os ~5s de abertura da sessão.
app.get('/api/warmup', async (_req, res) => {
  try {
    const result = await warmup();
    return res.json({ status: 'ok', ...result });
  } catch (error) {
    console.warn('[plate-proxy] Warmup falhou:', error?.message);
    return res.status(503).json({
      status: 'error',
      code: error?.code || 'WARMUP_FAILED',
      message: error?.message,
    });
  }
});

// Cache dos logos (data URI) por URL, para não baixar de novo a cada consulta.
const logoCache = new Map();

async function resolveBrandLogo(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (logoCache.has(url)) return logoCache.get(url);

  const dataUri = await fetchAssetAsDataUri(url);
  if (dataUri) logoCache.set(url, dataUri);

  return dataUri || '';
}

app.get('/api/placa', async (req, res) => {
  const normalizedPlate = normalizePlateInput(req.query?.placa);

  if (!isValidPlate(normalizedPlate)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_PLATE',
        message:
          'Placa inválida. Use um formato válido, como ABC1234 ou ABC1D23.',
      },
    });
  }

  const cached = readCache(normalizedPlate);
  if (cached) {
    console.log(`[plate-proxy] Placa ${normalizedPlate} respondida via cache.`);
    return res.json({ ...cached, meta: { ...cached.meta, cached: true } });
  }

  console.log('========================================');
  console.log('[plate-proxy] Nova consulta');
  console.log('[plate-proxy] Placa:', normalizedPlate);
  console.log('[plate-proxy] Fonte:', SOURCE_URL);
  console.log('========================================');

  const startedAt = Date.now();

  try {
    const fetched = await fetchPlateHtml(normalizedPlate);

    const durationMs = Date.now() - startedAt;

    console.log('[plate-proxy] Estratégia usada:', fetched.via);
    console.log('[plate-proxy] HTTP status:', fetched.status);
    console.log('[plate-proxy] Tamanho da resposta:', fetched.html.length);
    console.log('[plate-proxy] Tentativas:', JSON.stringify(fetched.attempts));
    console.log(`[plate-proxy] Tempo total: ${durationMs} ms`);

    const parsed = parsePlateHtml(
      fetched.html,
      normalizedPlate
    );

    console.log(
      '[plate-proxy] Parser result:',
      parsed.type
    );

    if (parsed.type === 'not_found') {
      return res.status(404).json({
        error: {
          code: 'PLATE_NOT_FOUND',
          message: parsed.message,
        },
      });
    }

    if (parsed.type === 'selector_changed') {
      return res.status(502).json({
        error: {
          code: 'SCRAPING_PARSER_ERROR',
          message:
            'Não conseguimos interpretar os dados da fonte agora. Tente novamente mais tarde.',
        },

        meta: {
          source: SOURCE_URL,
          queriedAt: new Date().toISOString(),
          warnings: parsed.warnings || [],
        },
      });
    }

    const payload = {
      ...parsed.data,
      meta: {
        ...parsed.data.meta,
        fetchStrategy: fetched.via,
        durationMs,
        cached: false,
      },
    };

    // O logo da marca vem embutido (data URI): o app não precisa pedir a
    // imagem ao domínio da fonte, que é protegido pelo Cloudflare.
    if (payload.vehicle?.brandLogo) {
      const embutido = await resolveBrandLogo(payload.vehicle.brandLogo);
      if (embutido) payload.vehicle.brandLogo = embutido;
    }

    writeCache(normalizedPlate, payload);

    console.log(
      '[plate-proxy] Consulta concluída com sucesso.'
    );

    return res.json(payload);

  } catch (error) {
    const isPlateFetchError = error instanceof PlateFetchError;

    console.error(
      '[plate-proxy] ERRO NA CONSULTA:'
    );

    console.error({
      name: error?.name,
      code: error?.code,
      message: error?.message,
      meta: error?.meta,
    });

    if (isPlateFetchError && error.code === 'SOURCE_RATE_LIMITED') {
      return res.status(429).json({
        error: {
          code: 'SOURCE_RATE_LIMITED',
          message:
            'A fonte limitou temporariamente as consultas. Aguarde alguns minutos e tente novamente.',
        },
        diagnostic: {
          details: error.meta || null,
        },
      });
    }

    if (isPlateFetchError && error.code === 'SOURCE_BLOCKED') {
      return res.status(503).json({
        error: {
          code: 'SOURCE_BLOCKED',
          message:
            'A fonte de dados está bloqueando as consultas automáticas (Cloudflare). Tente novamente em instantes.',
        },

        diagnostic: {
          source: SOURCE_URL,
          details: error.meta || null,
        },
      });
    }

    if (isPlateFetchError && error.code === 'BROWSER_UNAVAILABLE') {
      return res.status(500).json({
        error: {
          code: 'BROWSER_UNAVAILABLE',
          message:
            'O servidor não conseguiu iniciar o navegador necessário para consultar a placa.',
        },

        diagnostic: {
          details: error.meta || null,
        },
      });
    }

    const isTimeout =
      error?.name === 'AbortError' ||
      (isPlateFetchError && error.code === 'SOURCE_TIMEOUT');

    return res.status(503).json({
      error: {
        code: isTimeout ? 'SOURCE_TIMEOUT' : 'SOURCE_UNAVAILABLE',

        message: isTimeout
          ? 'A consulta demorou mais do que o esperado. Tente novamente.'
          : 'Falha ao consultar a fonte de dados. Verifique a conexão e tente novamente.',
      },

      diagnostic: {
        details: error?.meta || null,
      },
    });
  }
});

const server = app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `[plate-proxy] Running on port ${PORT}`
    );
    console.log(
      `[plate-proxy] Navegador: ${
        browserMode() === 'remote'
          ? 'remoto via CDP (PLATE_BROWSER_WS_ENDPOINT)'
          : 'local (Chromium do Playwright)'
      }`
    );
  }
);

async function shutdown(signal) {
  console.log(`[plate-proxy] Recebido ${signal}, encerrando...`);
  server.close();
  await closeBrowser().catch(() => {});
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    shutdown(signal);
  });
});

module.exports = app;
