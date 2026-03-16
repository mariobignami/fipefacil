import axios from 'axios';

const DEFAULT_TIMEOUT = 15000;
const BRASIL_API_URL = 'https://brasilapi.com.br/api/placa/v1';
const API_PLACA_URL = 'https://api.apiplaca.com.br/v1/placa';
const PLACA_FIPE_URL = 'https://api.placafipe.com/consulta';

/**
 * Supported plate lookup API providers:
 *
 * 1. BrasilAPI (Free, no key required)
 *    Set PLATE_API_PROVIDER=brasilapi
 *    No PLATE_API_KEY or PLATE_API_URL needed
 *
 * 2. ApiPlaca (Paid, requires key)
 *    Set PLATE_API_PROVIDER=apiplaca
 *    Set PLATE_API_KEY=your_key_here
 *
 * 3. PlacaFipe (Paid, requires key)
 *    Set PLATE_API_PROVIDER=placafipe
 *    Set PLATE_API_KEY=your_key_here
 *
 * 4. Custom API
 *    Set PLATE_API_PROVIDER=custom
 *    Set PLATE_API_URL=https://your-api.com/{plate}
 *    Set PLATE_API_KEY=your_key_here (if needed)
 */

export async function lookupPlate(plate) {
  const provider = (process.env.PLATE_API_PROVIDER || '').toLowerCase();

  if (!provider) {
    throw new Error('PLATE_API_NOT_CONFIGURED');
  }

  switch (provider) {
    case 'brasilapi':
      return await lookupWithBrasilAPI(plate);
    case 'apiplaca':
      return await lookupWithApiPlaca(plate);
    case 'placafipe':
      return await lookupWithPlacaFipe(plate);
    case 'custom':
      return await lookupWithCustomAPI(plate);
    default:
      throw new Error(`Unknown PLATE_API_PROVIDER: ${provider}`);
  }
}

async function lookupWithBrasilAPI(plate) {
  try {
    const response = await axios.get(`${BRASIL_API_URL}/${plate}`, {
      timeout: DEFAULT_TIMEOUT
    });

    return normalizeVehicleData(response.data, 'brasilapi');
  } catch (error) {
    if (error.response?.status === 404) {
      const err = new Error('VEHICLE_NOT_FOUND');
      err.response = error.response;
      throw err;
    }
    if (error.response?.status === 429) {
      const rateErr = new Error('RATE_LIMITED');
      rateErr.response = error.response;
      throw rateErr;
    }
    throw error;
  }
}

async function lookupWithApiPlaca(plate) {
  const apiKey = process.env.PLATE_API_KEY;

  if (!apiKey) {
    throw new Error('PLATE_API_KEY not configured for ApiPlaca');
  }

  const response = await axios.get(`${API_PLACA_URL}/${plate}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    timeout: DEFAULT_TIMEOUT
  });

  return normalizeVehicleData(response.data, 'apiplaca');
}

async function lookupWithPlacaFipe(plate) {
  const apiKey = process.env.PLATE_API_KEY;

  if (!apiKey) {
    throw new Error('PLATE_API_KEY not configured for PlacaFipe');
  }

  const response = await axios.get(`${PLACA_FIPE_URL}/${plate}`, {
    headers: { 'x-api-key': apiKey },
    timeout: DEFAULT_TIMEOUT
  });

  return normalizeVehicleData(response.data, 'placafipe');
}

async function lookupWithCustomAPI(plate) {
  const apiKey = process.env.PLATE_API_KEY;
  const apiUrl = process.env.PLATE_API_URL;

  if (!apiUrl) {
    throw new Error('PLATE_API_URL not configured for custom provider');
  }

  const headers = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await axios.get(apiUrl.replace('{plate}', plate), {
    headers,
    timeout: DEFAULT_TIMEOUT
  });

  return normalizeVehicleData(response.data, 'custom');
}

function normalizeKeys(raw) {
  return Object.entries(raw || {}).reduce((acc, [key, value]) => {
    acc[key.toLowerCase()] = value;
    return acc;
  }, {});
}

function pick(data, keys) {
  for (const key of keys) {
    const candidate = data[key.toLowerCase()];
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      return candidate;
    }
  }
  return null;
}

function normalizeYear(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  const numeric = parseInt(str, 10);
  return Number.isNaN(numeric) ? str : numeric;
}

function normalizeVehicleType(tipo) {
  if (!tipo) return null;
  const t = String(tipo).toLowerCase();
  if (t.includes('moto')) return 'motorcycles';
  if (t.includes('caminhao') || t.includes('truck') || t.includes('carga')) return 'trucks';
  return 'cars';
}

export function normalizeVehicleData(rawData, provider) {
  const data = normalizeKeys(rawData || {});

  const yearFromModel = normalizeYear(
    pick(data, ['anomodelo', 'ano_modelo', 'anoModelo', 'modelyear', 'ano_modelo_fabricacao'])
  );
  const yearFromFabrication = normalizeYear(
    pick(data, ['ano', 'anofabricacao', 'ano_fabricacao', 'fabricationyear'])
  );

  const normalized = {
    brand: pick(data, ['marca', 'brand', 'fabricante', 'make']),
    model: pick(data, ['modelo', 'model', 'veiculo', 'vehicle', 'descricao', 'nome']),
    year: yearFromModel || yearFromFabrication,
    fuel: pick(data, ['combustivel', 'fuel', 'tipo_combustivel', 'combustion']),
    fipeCode: pick(data, ['codigofipe', 'codigo_fipe', 'codigoFipe', 'fipe_code', 'cod_fipe']),
    fipePrice: pick(data, ['valorfipe', 'valor_fipe', 'valor', 'preco', 'price']),
    fipeReferenceMonth: pick(data, ['mes_referencia', 'mesreferencia', 'data_referencia', 'mes']),
    color: pick(data, ['cor', 'color']),
    plate: pick(data, ['placa', 'plate']),
    vehicleType: normalizeVehicleType(
      pick(data, ['tipoveiculo', 'tipo_veiculo', 'tipo', 'segmento', 'categoria'])
    ),
    raw: rawData
  };

  if (provider === 'brasilapi') {
    // Some providers return the brand within the model string (e.g., "FIAT/UNO")
    if (!normalized.brand && typeof normalized.model === 'string') {
      const parts = normalized.model.split('/');
      if (parts.length > 1) {
        normalized.brand = parts[0];
        normalized.model = parts.slice(1).join(' ').trim();
      }
    }
  }

  return normalized;
}
