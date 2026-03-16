import { Router } from 'express';
import { normalizePlate, validatePlate } from '../utils/validation.js';
import { lookupPlate } from '../services/plateService.js';
import { searchFipeByVehicleData } from '../services/fipeService.js';

const router = Router();

router.get('/', async (req, res) => {
  const startTime = Date.now();
  const rawPlate = req.query.placa;
  
  if (!rawPlate) {
    return res.status(400).json({
      error: 'MISSING_PLATE',
      message: 'O parâmetro "placa" é obrigatório.'
    });
  }
  
  const plate = normalizePlate(rawPlate);
  const { valid, format } = validatePlate(plate);
  
  if (!valid) {
    return res.status(400).json({
      error: 'INVALID_PLATE',
      message: 'Formato de placa inválido. Use o formato antigo (ABC1234) ou Mercosul (ABC1D23).'
    });
  }
  
  let vehicleData = null;
  let fipeData = null;
  let plateProvider = null;
  let fipeProvider = null;
  let errors = [];
  
  // Step 1: Lookup plate
  try {
    vehicleData = await lookupPlate(plate);
    plateProvider = process.env.PLATE_API_PROVIDER || 'external';
    
    // If plate API already has FIPE data
    if (vehicleData.fipeCode && vehicleData.fipePrice) {
      fipeData = {
        code: vehicleData.fipeCode,
        price: vehicleData.fipePrice,
        referenceMonth: vehicleData.fipeReferenceMonth
      };
      fipeProvider = plateProvider;
    }
  } catch (err) {
    console.error(`[consulta] Plate lookup error for ${plate}:`, err.message);
    if (err.message === 'PLATE_API_NOT_CONFIGURED') {
      errors.push({ type: 'PLATE_API_NOT_CONFIGURED', message: 'API de consulta por placa não configurada.' });
    } else if (err.response?.status === 404) {
      return res.status(404).json({
        error: 'VEHICLE_NOT_FOUND',
        message: 'Veículo não encontrado para a placa informada.'
      });
    } else if (err.response?.status === 429) {
      errors.push({ type: 'RATE_LIMITED', message: 'Limite de requisições da API de placa atingido.' });
    } else {
      errors.push({ type: 'PLATE_API_ERROR', message: 'Erro ao consultar a API de placa.' });
    }
  }
  
  // Step 2: If we have vehicle data but no FIPE price, search FIPE separately
  if (vehicleData && !fipeData && vehicleData.brand && vehicleData.model) {
    try {
      fipeData = await searchFipeByVehicleData({
        brand: vehicleData.brand,
        model: vehicleData.model,
        year: vehicleData.year,
        vehicleType: vehicleData.vehicleType
      });
      if (fipeData) {
        fipeProvider = 'fipe.parallelum.com.br';
        // Enrich vehicle data with FIPE data if fields are missing
        vehicleData = {
          ...vehicleData,
          brand: vehicleData.brand || fipeData.brand,
          model: vehicleData.model || fipeData.model,
        };
      }
    } catch (err) {
      console.error(`[consulta] FIPE lookup error:`, err.message);
      errors.push({ type: 'FIPE_API_ERROR', message: 'Erro ao consultar a Tabela FIPE.' });
    }
  }
  
  const elapsed = Date.now() - startTime;
  console.log(`[consulta] plate=${plate} format=${format} elapsed=${elapsed}ms errors=${errors.length}`);
  
  const response = {
    plate,
    vehicle: vehicleData ? {
      brand: vehicleData.brand,
      model: vehicleData.model,
      year: vehicleData.year,
      fuel: vehicleData.fuel || (fipeData?.fuel),
      color: vehicleData.color,
      vehicleType: vehicleData.vehicleType
    } : null,
    fipe: fipeData,
    sources: {
      plateProvider,
      fipeProvider
    }
  };
  
  if (errors.length > 0) {
    response.errors = errors;
  }
  
  const hasUsefulData = vehicleData || fipeData;
  if (!hasUsefulData && errors.length > 0) {
    return res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'Não foi possível obter dados do veículo.',
      errors
    });
  }
  
  return res.json(response);
});

export default router;
