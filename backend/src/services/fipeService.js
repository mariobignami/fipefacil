import axios from 'axios';

const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1';


export async function searchFipeByVehicleData({ brand, model, year, vehicleType = 'carros' }) {
  if (!brand || !model) return null;

  try {
    // Get brands list
    const brandsRes = await axios.get(`${FIPE_BASE_URL}/${vehicleType}/marcas`, { timeout: 10000 });
    const brands = brandsRes.data;
    
    // Find matching brand (case-insensitive partial match)
    const normalizedBrand = brand.toUpperCase();
    const matchedBrand = brands.find(b => 
      normalizedBrand.includes(b.nome.toUpperCase()) || 
      b.nome.toUpperCase().includes(normalizedBrand)
    );
    
    if (!matchedBrand) return null;
    
    // Get models for brand
    const modelsRes = await axios.get(`${FIPE_BASE_URL}/${vehicleType}/marcas/${matchedBrand.codigo}/modelos`, { timeout: 10000 });
    const models = modelsRes.data.modelos;
    
    const normalizedModel = model.toUpperCase();
    const matchedModel = models.find(m =>
      normalizedModel.includes(m.nome.toUpperCase()) ||
      m.nome.toUpperCase().includes(normalizedModel)
    );
    
    if (!matchedModel) return null;
    
    // Get years
    const yearsRes = await axios.get(
      `${FIPE_BASE_URL}/${vehicleType}/marcas/${matchedBrand.codigo}/modelos/${matchedModel.codigo}/anos`,
      { timeout: 10000 }
    );
    const years = yearsRes.data;
    
    // Find matching year
    const targetYear = String(year);
    const matchedYear = years.find(y => y.nome.includes(targetYear));
    const yearToUse = matchedYear || years[0];
    
    if (!yearToUse) return null;
    
    // Get price
    const priceRes = await axios.get(
      `${FIPE_BASE_URL}/${vehicleType}/marcas/${matchedBrand.codigo}/modelos/${matchedModel.codigo}/anos/${yearToUse.codigo}`,
      { timeout: 10000 }
    );
    
    return {
      code: priceRes.data.CodigoFipe,
      price: priceRes.data.Valor,
      referenceMonth: priceRes.data.MesReferencia,
      brand: priceRes.data.Marca,
      model: priceRes.data.Modelo,
      year: priceRes.data.AnoModelo,
      fuel: priceRes.data.Combustivel
    };
  } catch (error) {
    return null;
  }
}
