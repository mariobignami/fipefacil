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
    fuel: findDetail(details, ['combustivel', 'combustivel principal']),
    category: findDetail(details, ['tipo de veiculo', 'tipo veiculo', 'categoria']),
    city: findDetail(details, ['municipio', 'cidade']),
    state: findDetail(details, ['uf', 'estado']),
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

  if (!hasData && notFoundText) {
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

  const [fipePrimary, ...sameYearModels] = fipeRows;
  const filteredWarnings = warnings.filter(Boolean);

  return {
    type: 'success',
    data: {
      vehicle: buildVehicleData(details, queriedPlate),
      fipePrimary: fipePrimary || null,
      sameYearModels,
      meta: {
        source: SOURCE_URL,
        queriedAt: new Date().toISOString(),
        warnings: filteredWarnings,
      },
    },
  };
}

module.exports = {
  SOURCE_URL,
  normalizePlateInput,
  isValidPlate,
  parsePlateHtml,
};
