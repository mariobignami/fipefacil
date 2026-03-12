import axios from 'axios';

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
    // Brasil API provides free vehicle data lookup
    // Note: This is a real Brazilian public API
    const response = await axios.get(`https://brasilapi.com.br/api/fipe/preco/v1/${plate}`, {
      timeout: 15000
    });

    return normalizeVehicleData(response.data, 'brasilapi');
  } catch (error) {
    if (error.response?.status === 404) {
      const err = new Error('VEHICLE_NOT_FOUND');
      err.response = error.response;
      throw err;
    }
    throw error;
  }
}

async function lookupWithApiPlaca(plate) {
  const apiKey = process.env.PLATE_API_KEY;

  if (!apiKey) {
    throw new Error('PLATE_API_KEY not configured for ApiPlaca');
  }

  const response = await axios.get(`https://api.apiplaca.com.br/v1/placa/${plate}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    timeout: 15000
  });

  return normalizeVehicleData(response.data, 'apiplaca');
}

async function lookupWithPlacaFipe(plate) {
  const apiKey = process.env.PLATE_API_KEY;

  if (!apiKey) {
    throw new Error('PLATE_API_KEY not configured for PlacaFipe');
  }

  const response = await axios.get(`https://api.placafipe.com/consulta/${plate}`, {
    headers: { 'x-api-key': apiKey },
    timeout: 15000
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
    timeout: 15000
  });

  return normalizeVehicleData(response.data, 'custom');
}

function normalizeVehicleData(data, provider) {
  // Normalize various API response formats to our standard format
  const normalized = {
    brand: data.marca || data.MARCA || data.brand || null,
    model: data.modelo || data.MODELO || data.model || null,
    year: data.ano || data.ANO || data.year || null,
    fuel: data.combustivel || data.COMBUSTIVEL || data.fuel || null,
    fipeCode: data.codigoFipe || data.CODIGO_FIPE || data.fipe_code || null,
    fipePrice: data.valorFipe || data.VALOR_FIPE || data.fipe_price || null,
    fipeReferenceMonth: data.mesReferencia || data.MES_REFERENCIA || null,
    color: data.cor || data.COR || data.color || null,
    plate: data.placa || data.PLACA || data.plate || null,
  };

  // Provider-specific normalizations
  if (provider === 'brasilapi') {
    // BrasilAPI might return data in a different format
    // Adjust as needed based on actual API response
    normalized.brand = normalized.brand || data.fabricante;
    normalized.model = normalized.model || data.veiculo;
  }

  return normalized;
}
