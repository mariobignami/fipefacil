const FIPE_BASE_URL = 'https://fipe.parallelum.com.br/api/v2';

function parseFipePrice(priceStr) {
  if (!priceStr) return 0;
  const num = parseFloat(
    priceStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
  );
  return isNaN(num) ? 0 : num;
}

// v2 API uses English vehicle type names
const VEHICLE_TYPE_MAP = {
  carros: 'cars',
  motos: 'motorcycles',
  caminhoes: 'trucks',
  cars: 'cars',
  motorcycles: 'motorcycles',
  trucks: 'trucks',
};

// Categorias que a consulta por placa devolve -> tipo da API FIPE
const PLATE_CATEGORY_MAP = {
  automovel: 'cars',
  motocicleta: 'motorcycles',
  ciclomotor: 'motorcycles',
  caminhao: 'trucks',
  'caminhao trator': 'trucks',
  onibus: 'trucks',
  microonibus: 'trucks',
};

export function vehicleTypeFromCategory(category) {
  const chave = String(category || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  return PLATE_CATEGORY_MAP[chave] || 'cars';
}

/**
 * Histórico de preços de um veículo a partir do código FIPE (o que a consulta
 * por placa fornece). Usa os endpoints "Busca por código FIPE" da API v2:
 *   GET /{tipo}/{codigoFipe}/years            -> anos/combustíveis disponíveis
 *   GET /{tipo}/{codigoFipe}/years/{ano}/history -> histórico em 1 requisição
 *
 * O resultado fica em cache: trocar de modelo na tela e voltar é instantâneo e
 * a API da FIPE (limite diário de requisições) não é sobrecarregada.
 */
const historicoPorCodigo = new Map();

export function clearPriceHistoryCache() {
  historicoPorCodigo.clear();
}

export async function fetchPriceHistoryByFipeCode(fipeCode, { vehicleType = 'cars', modelYear } = {}) {
  const v2Type = VEHICLE_TYPE_MAP[vehicleType] || 'cars';
  if (!fipeCode) return [];

  const chave = `${v2Type}:${fipeCode}:${modelYear || ''}`;
  if (historicoPorCodigo.has(chave)) return historicoPorCodigo.get(chave);

  try {
    const anosRes = await fetch(`${FIPE_BASE_URL}/${v2Type}/${encodeURIComponent(fipeCode)}/years`);
    if (!anosRes.ok) return [];
    const anos = await anosRes.json();
    if (!Array.isArray(anos) || !anos.length) return [];

    const alvo = String(modelYear || '');
    const anoEscolhido = anos.find((item) => alvo && String(item.name).startsWith(alvo)) || anos[0];

    const histRes = await fetch(
      `${FIPE_BASE_URL}/${v2Type}/${encodeURIComponent(fipeCode)}/years/${encodeURIComponent(
        anoEscolhido.code
      )}/history`
    );
    if (!histRes.ok) return [];

    const dados = await histRes.json();
    const historico = Array.isArray(dados?.priceHistory) ? dados.priceHistory : [];

    const resultado = historico
      .map((item) => ({
        month: item.month || '',
        price: parseFipePrice(item.price),
        priceFormatted: item.price || '',
        referenceCode: item.reference || '',
      }))
      .filter((item) => item.price > 0)
      .reverse(); // a API devolve do mais recente para o mais antigo

    historicoPorCodigo.set(chave, resultado);
    return resultado;
  } catch (error) {
    console.error('[fipeService] Error getting plate price history:', error);
    return [];
  }
}

/**
 * Search FIPE data by brand, model, and year
 * This is the main function used when we have vehicle information
 */
export async function searchFipeByVehicleData({ brand, model, year, vehicleType = 'cars' }) {
  if (!brand || !model) return null;
  const v2Type = VEHICLE_TYPE_MAP[vehicleType];
  if (!v2Type) return null;

  try {
    // Get brands list
    const brandsRes = await fetch(`${FIPE_BASE_URL}/${v2Type}/brands`);
    if (!brandsRes.ok) return null;
    const brands = await brandsRes.json();

    // Find matching brand (case-insensitive partial match)
    const normalizedBrand = brand.toUpperCase();
    const matchedBrand = brands.find(b =>
      normalizedBrand.includes(b.name.toUpperCase()) ||
      b.name.toUpperCase().includes(normalizedBrand)
    );

    if (!matchedBrand) return null;

    // Get models for brand
    const modelsRes = await fetch(`${FIPE_BASE_URL}/${v2Type}/brands/${matchedBrand.code}/models`);
    if (!modelsRes.ok) return null;
    const models = await modelsRes.json();

    const normalizedModel = model.toUpperCase();
    const matchedModel = models.find(m =>
      normalizedModel.includes(m.name.toUpperCase()) ||
      m.name.toUpperCase().includes(normalizedModel)
    );

    if (!matchedModel) return null;

    // Get years
    const yearsRes = await fetch(
      `${FIPE_BASE_URL}/${v2Type}/brands/${matchedBrand.code}/models/${matchedModel.code}/years`
    );
    if (!yearsRes.ok) return null;
    const years = await yearsRes.json();

    // Find matching year
    const targetYear = String(year);
    const matchedYear = years.find(y => y.name.includes(targetYear));
    const yearToUse = matchedYear || years[0];

    if (!yearToUse) return null;

    // Get price
    const priceRes = await fetch(
      `${FIPE_BASE_URL}/${v2Type}/brands/${matchedBrand.code}/models/${matchedModel.code}/years/${yearToUse.code}`
    );
    if (!priceRes.ok) return null;
    const priceData = await priceRes.json();

    return {
      code: priceData.codeFipe,
      price: priceData.price,
      referenceMonth: priceData.referenceMonth,
      brand: priceData.brand,
      model: priceData.model,
      year: priceData.modelYear,
      fuel: priceData.fuel,
    };
  } catch (error) {
    console.error('[fipeService] Error searching FIPE:', error);
    return null;
  }
}

/**
 * Get all brands for a vehicle type
 */
export async function getBrands(vehicleType = 'cars') {
  const v2Type = VEHICLE_TYPE_MAP[vehicleType];
  if (!v2Type) return [];

  try {
    const response = await fetch(`${FIPE_BASE_URL}/${v2Type}/brands`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('[fipeService] Error getting brands:', error);
    return [];
  }
}

/**
 * Get all models for a brand
 */
export async function getModels(brandCode, vehicleType = 'cars') {
  const v2Type = VEHICLE_TYPE_MAP[vehicleType];
  if (!v2Type || !brandCode) return [];

  try {
    const response = await fetch(`${FIPE_BASE_URL}/${v2Type}/brands/${brandCode}/models`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('[fipeService] Error getting models:', error);
    return [];
  }
}

/**
 * Get all years for a model
 */
export async function getYears(brandCode, modelCode, vehicleType = 'cars') {
  const v2Type = VEHICLE_TYPE_MAP[vehicleType];
  if (!v2Type || !brandCode || !modelCode) return [];

  try {
    const response = await fetch(
      `${FIPE_BASE_URL}/${v2Type}/brands/${brandCode}/models/${modelCode}/years`
    );
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('[fipeService] Error getting years:', error);
    return [];
  }
}

/**
 * Get FIPE price for specific brand/model/year combination
 */
export async function getFipePrice(brandCode, modelCode, yearCode, vehicleType = 'cars') {
  const v2Type = VEHICLE_TYPE_MAP[vehicleType];
  if (!v2Type || !brandCode || !modelCode || !yearCode) return null;

  try {
    const response = await fetch(
      `${FIPE_BASE_URL}/${v2Type}/brands/${brandCode}/models/${modelCode}/years/${yearCode}`
    );
    if (!response.ok) return null;
    const data = await response.json();

    return {
      code: data.codeFipe,
      price: data.price,
      referenceMonth: data.referenceMonth,
      brand: data.brand,
      model: data.model,
      year: data.modelYear,
      fuel: data.fuel,
    };
  } catch (error) {
    console.error('[fipeService] Error getting FIPE price:', error);
    return null;
  }
}

/**
 * Direct search by codes - used when user selects from dropdowns
 */
export async function searchFipeByCodes({ brandCode, modelCode, yearCode, vehicleType = 'cars' }) {
  return getFipePrice(brandCode, modelCode, yearCode, vehicleType);
}

/**
 * Get all FIPE reference tables (list of available months)
 * Returns array of {code, month} sorted newest first
 */
export async function getReferences() {
  try {
    const res = await fetch(`${FIPE_BASE_URL}/references`);
    if (!res.ok) {
      console.error('[fipeService] References endpoint returned', res.status);
      return [];
    }
    return await res.json();
  } catch (error) {
    console.error('[fipeService] Error getting references:', error);
    return [];
  }
}

/**
 * Fetch price history for a vehicle across reference months
 * Returns array of {month, price, priceFormatted, referenceCode} sorted oldest first
 */
export async function fetchPriceHistory(brandCode, modelCode, yearCode, vehicleType = 'cars') {
  const v2Type = VEHICLE_TYPE_MAP[vehicleType];
  if (!v2Type || !brandCode || !modelCode || !yearCode) return [];

  try {
    const refs = await getReferences();
    if (!refs.length) return [];

    // Take at most 12 most recent reference months
    const recent = refs.slice(0, 12);

    const results = await Promise.allSettled(
      recent.map(async (ref) => {
        const res = await fetch(
          `${FIPE_BASE_URL}/${v2Type}/brands/${brandCode}/models/${modelCode}/years/${yearCode}?reference=${ref.code}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        const price = parseFipePrice(data.price);
        if (!price) return null;
        return {
          month: ref.month || String(ref.code),
          price,
          priceFormatted: data.price || '',
          referenceCode: ref.code,
        };
      })
    );

    return results
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value)
      .reverse(); // Show oldest → newest left to right
  } catch (error) {
    console.error('[fipeService] Error fetching price history:', error);
    return [];
  }
}
