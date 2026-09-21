const cheerio = require('cheerio');

const SOURCE_URL = 'https://www.tabelafipebrasil.com/placa';

function normalizePlateInput(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function isValidPlate(value) {
  return /^(?:[A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z]\d{2})$/.test(value);
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildPlateUrl(value) {
  const plate = normalizePlateInput(value);
  return `${SOURCE_URL}/${encodeURIComponent(plate)}`;
}

/**
 * O site real também carrega o script do Cloudflare (`/cdn-cgi/challenge-platform/`),
 * então só consideramos "desafio" quando o conteúdo da FIPE não está presente.
 */
function hasFipeContent(html) {
  return /fipetablepricedetail|fipe-desktop|fipe/i.test(String(html || ''));
}

/**
 * Detecta a página de desafio do Cloudflare ("Just a moment..."), que a fonte
 * usa para bloquear clientes que não executam JavaScript.
 */
function isCloudflareChallenge(html, headers) {
  const mitigated = headers?.get
    ? headers.get('cf-mitigated')
    : headers?.['cf-mitigated'];

  if (mitigated === 'challenge') return true;

  const body = String(html || '');
  if (!body) return false;

  const lower = body.toLowerCase();

  if (lower.includes('just a moment')) return true;
  if (lower.includes('enable javascript and cookies to continue')) return true;
  if (lower.includes('cf_chl_opt')) return true;
  if (lower.includes('challenge-form') || lower.includes('cf-chl-')) return true;

  // Script do Cloudflare presente, mas a página nem chegou na FIPE.
  if (
    lower.includes('/cdn-cgi/challenge-platform/') &&
    !hasFipeContent(body)
  ) {
    return true;
  }

  return false;
}

function normalizeKey(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function findDetail(details, possibleKeys) {
  for (const key of possibleKeys) {
    if (details[key]) return details[key];
  }
  return '';
}

function parseDetailTable($, warnings) {
  const details = {};
  const table = $('.fipeTablePriceDetail');

  if (!table.length) {
    warnings.push('Estrutura principal de detalhes não encontrada; tentando fallback.');
  }

  const rows = table.length ? table.find('tr') : $('table tr');

  rows.each((_, element) => {
    const cells = $(element).find('td');
    if (cells.length < 2) return;

    const key = normalizeKey($(cells[0]).text().replace(':', ''));
    const value = cleanText($(cells[cells.length - 1]).text());
    if (key && value && !details[key]) {
      details[key] = value;
    }
  });

  return details;
}

function parseFipeRows($, warnings) {
  const rows = [];
  const desktopTable = $('.fipe-desktop');
  let dataRows = desktopTable.find('tr');

  if (!desktopTable.length) {
    warnings.push('Tabela de FIPE por ano não encontrada; tentando fallback.');
    const fallback = $('table').filter((_, tableEl) => {
      const header = normalizeKey($(tableEl).find('tr').first().text());
      return header.includes('codigo fipe') && header.includes('modelo');
    }).first();
    dataRows = fallback.find('tr');
  }

  dataRows.each((index, row) => {
    if (index === 0) return;
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    rows.push({
      code: cleanText($(cells[0]).text()),
      model: cleanText($(cells[1]).text()),
      value: cleanText($(cells[2]).text()),
    });
  });

  return rows.filter((row) => row.code || row.model || row.value);
}

function buildVehicleData(details, queriedPlate) {
  return {
    plate: queriedPlate,
    brand: findDetail(details, ['marca', 'fabricante']),
    model: findDetail(details, ['modelo']),
    year: findDetail(details, ['ano modelo', 'ano']),
    manufactureYear: findDetail(details, ['ano']),
    color: findDetail(details, ['cor']),
    fuel: findDetail(details, ['combustivel', 'combustivel principal']),
    category: findDetail(details, ['tipo de veiculo', 'tipo veiculo', 'categoria']),
    species: findDetail(details, ['especie veiculo', 'especie']),
    segment: findDetail(details, ['segmento']),
    engineSize: findDetail(details, ['cilindrada']),
    power: findDetail(details, ['potencia']),
    passengers: findDetail(details, ['passageiros']),
    imported: findDetail(details, ['importado']),
    chassis: findDetail(details, ['chassi']),
    city: findDetail(details, ['municipio', 'cidade']),
    state: findDetail(details, ['uf', 'estado']),
  };
}

function tokenizeModel(value) {
  return Array.from(
    new Set(
      normalizeKey(value)
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .filter((token) => /[a-z]/.test(token))
    )
  );
}

/**
 * Compara o modelo do veículo (ex.: "T CROSS HL TSI") com cada candidato da
 * lista da fonte e devolve quantos termos bateram.
 */
function scoreModelMatch(vehicleModel, candidateModel) {
  const vehicleTokens = tokenizeModel(vehicleModel);
  if (!vehicleTokens.length) return { score: 0, matchedTokens: [] };

  const candidateTokens = new Set(tokenizeModel(candidateModel));
  const matchedTokens = vehicleTokens.filter((token) => candidateTokens.has(token));

  return {
    score: matchedTokens.length / vehicleTokens.length,
    matchedTokens,
  };
}

// Termos que costumam diferenciar versões do mesmo modelo e que NÃO constam nos
// dados da placa (câmbio, número de portas). Ex.: "Fit LX ... Mec." x "... Aut.".
const VARIANT_TOKENS = new Set([
  'mec',
  'mecanico',
  'mecanica',
  'manual',
  'aut',
  'automatico',
  'automatica',
  'cvt',
  'mt',
  'at',
  '2p',
  '3p',
  '4p',
  '5p',
  '2d',
  '4d',
]);

function tokenSet(value) {
  return new Set(tokenizeModel(value));
}

function symmetricDifference(first, second) {
  const diff = new Set();

  first.forEach((token) => {
    if (!second.has(token)) diff.add(token);
  });
  second.forEach((token) => {
    if (!first.has(token)) diff.add(token);
  });

  return Array.from(diff);
}

/**
 * Quando vários candidatos empatam, verifica se eles são o MESMO modelo com
 * nomes praticamente iguais (diferença só em câmbio/portas). Nesse caso a fonte
 * não permite saber qual é o do veículo e o usuário precisa escolher.
 * Devolve quantos candidatos estão nessa situação (1 = sem ambiguidade).
 */
function countAmbiguousVariants(vehicleModel, rows) {
  const scored = rows.map((row) => ({ row, ...scoreModelMatch(vehicleModel, row.model) }));
  if (!scored.length) return 1;

  const topScore = Math.max(...scored.map((item) => item.score));
  const tied = scored.filter((item) => item.score === topScore);
  if (tied.length < 2) return 1;

  // Conta quantos dos empatados são a mesma versão, diferenciada apenas por
  // tokens de câmbio/portas (o resto do nome é idêntico).
  const baseTokens = tokenSet(tied[0].row.model);
  const variants = tied.filter((item) => {
    const diff = symmetricDifference(baseTokens, tokenSet(item.row.model));
    return diff.every((token) => VARIANT_TOKENS.has(token));
  });

  return variants.length;
}

/**
 * A fonte devolve uma LISTA de modelos do mesmo ano que "podem corresponder" à
 * placa (sem marcar qual é o correto). Ordenamos por semelhança com o modelo do
 * veículo e mantemos o primeiro como sugestão principal.
 */
function rankFipeRows(vehicleModel, rows) {
  if (!rows.length) return { primary: null, others: [] };

  const scored = rows.map((row) => ({
    row,
    ...scoreModelMatch(vehicleModel, row.model),
  }));

  const best = scored.reduce(
    (acc, item) => (item.score > acc.score ? item : acc),
    scored[0]
  );

  return {
    primary: {
      ...best.row,
      matchScore: Number(best.score.toFixed(2)),
      matchedTokens: best.matchedTokens,
      ambiguousCount: countAmbiguousVariants(vehicleModel, rows),
    },
    others: scored.filter((item) => item !== best).map((item) => item.row),
  };
}

function parsePlateHtml(html, queriedPlate) {
  const warnings = [];
  const $ = cheerio.load(html);
  const bodyText = normalizeKey($('body').text());

  const details = parseDetailTable($, warnings);
  const fipeRows = parseFipeRows($, warnings);

  const hasData = Object.keys(details).length > 0 || fipeRows.length > 0;
  const notFoundText =
    bodyText.includes('placa nao encontrada') ||
    bodyText.includes('nenhum registro encontrado') ||
    bodyText.includes('nao foi possivel localizar');

  // Quando a placa não existe, a fonte devolve a página normal (200) sem os
  // dados do veículo e sem mensagem explícita. Se a resposta é de fato uma
  // página da fonte, o certo é "placa não encontrada", não erro de parser.
  const isSourcePage = /tabelafipebrasil\.com/i.test(html);

  if (!hasData && (notFoundText || isSourcePage)) {
    return {
      type: 'not_found',
      message: 'Placa não encontrada na fonte de dados.',
    };
  }

  if (!hasData) {
    return {
      type: 'selector_changed',
      message: 'Não foi possível interpretar a resposta da fonte no momento.',
      warnings,
    };
  }

  const vehicle = buildVehicleData(details, queriedPlate);
  const ranked = rankFipeRows(vehicle.model, fipeRows);

  return {
    type: 'success',
    data: {
      vehicle,
      // A fonte lista vários candidatos; marcamos o mais parecido com o modelo
      // da placa, mas sem afirmar que é o valor exato do veículo.
      fipePrimary: ranked.primary,
      sameYearModels: ranked.others,
      candidatesCount: fipeRows.length,
      meta: {
        source: SOURCE_URL,
        queriedAt: new Date().toISOString(),
        warnings: warnings.filter(Boolean),
      },
    },
  };
}

module.exports = {
  SOURCE_URL,
  normalizePlateInput,
  isValidPlate,
  buildPlateUrl,
  hasFipeContent,
  isCloudflareChallenge,
  scoreModelMatch,
  rankFipeRows,
  parsePlateHtml,
};
