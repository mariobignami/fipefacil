import axios from 'axios';

export async function lookupPlate(plate) {
  const apiKey = process.env.PLATE_API_KEY;
  const apiUrl = process.env.PLATE_API_URL;
  
  if (!apiKey || !apiUrl) {
    throw new Error('PLATE_API_NOT_CONFIGURED');
  }
  
  const response = await axios.get(apiUrl.replace('{plate}', plate), {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    timeout: 15000
  });
  
  return normalizeVehicleData(response.data);
}

function normalizeVehicleData(data) {
  // Normalize various API response formats to our standard format
  return {
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
}
