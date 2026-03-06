import axios from 'axios';

const FIPE_BASE_URL = 'https://fipe.parallelum.com.br/api/v2';

// v2 API uses English vehicle type names
const VEHICLE_TYPE_MAP = {
  carros: 'cars',
  motos: 'motorcycles',
  caminhoes: 'trucks',
  cars: 'cars',
  motorcycles: 'motorcycles',
  trucks: 'trucks',
};

const ALLOWED_VEHICLE_TYPES = Object.keys(VEHICLE_TYPE_MAP);

export async function searchFipeByVehicleData({ brand, model, year, vehicleType = 'cars' }) {
  if (!brand || !model) return null;
  const v2Type = VEHICLE_TYPE_MAP[vehicleType];
  if (!v2Type) return null;

  try {
    // Get brands list
    const brandsRes = await axios.get(`${FIPE_BASE_URL}/${v2Type}/brands`, { timeout: 10000 });
    const brands = brandsRes.data;

    // Find matching brand (case-insensitive partial match)
    const normalizedBrand = brand.toUpperCase();
    const matchedBrand = brands.find(b =>
      normalizedBrand.includes(b.name.toUpperCase()) ||
      b.name.toUpperCase().includes(normalizedBrand)
    );

    if (!matchedBrand) return null;

    // Get models for brand (v2 returns array directly, not nested under .modelos)
    const modelsRes = await axios.get(`${FIPE_BASE_URL}/${v2Type}/brands/${matchedBrand.code}/models`, { timeout: 10000 });
    const models = modelsRes.data;

    const normalizedModel = model.toUpperCase();
    const matchedModel = models.find(m =>
      normalizedModel.includes(m.name.toUpperCase()) ||
      m.name.toUpperCase().includes(normalizedModel)
    );

    if (!matchedModel) return null;

    // Get years
    const yearsRes = await axios.get(
      `${FIPE_BASE_URL}/${v2Type}/brands/${matchedBrand.code}/models/${matchedModel.code}/years`,
      { timeout: 10000 }
    );
    const years = yearsRes.data;

    // Find matching year
    const targetYear = String(year);
    const matchedYear = years.find(y => y.name.includes(targetYear));
    const yearToUse = matchedYear || years[0];

    if (!yearToUse) return null;

    // Get price
    const priceRes = await axios.get(
      `${FIPE_BASE_URL}/${v2Type}/brands/${matchedBrand.code}/models/${matchedModel.code}/years/${yearToUse.code}`,
      { timeout: 10000 }
    );

    return {
      code: priceRes.data.codeFipe,
      price: priceRes.data.price,
      referenceMonth: priceRes.data.referenceMonth,
      brand: priceRes.data.brand,
      model: priceRes.data.model,
      year: priceRes.data.modelYear,
      fuel: priceRes.data.fuel,
    };
  } catch (error) {
    return null;
  }
}
