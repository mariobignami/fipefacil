const DENATRAN_BASE_URL = 'https://denatran.parallelum.com.br/api/v1';

function getField(data, keys) {
  for (const key of keys) {
    if (data[key] != null) return data[key];
  }
  return null;
}

/**
 * Lookup a vehicle by its plate using the Parallelum DENATRAN API.
 * Returns normalized vehicle data (brand, model, year, fuel, color).
 */
export async function consultarPlaca(plate) {
  const normalized = plate.replace(/[-\s]/g, '').toUpperCase();

  try {
    const response = await fetch(`${DENATRAN_BASE_URL}/${normalized}`);

    if (response.status === 404) {
      const err = new Error('Veículo não encontrado para a placa informada.');
      err.status = 404;
      throw err;
    }

    if (!response.ok) {
      const err = new Error('Erro ao consultar a placa. Tente novamente.');
      err.status = response.status;
      throw err;
    }

    const data = await response.json();

    return {
      brand: getField(data, ['marca', 'MARCA', 'brand']),
      model: getField(data, ['modelo', 'MODELO', 'model']),
      year: getField(data, ['ano', 'ANO', 'year']),
      fuel: getField(data, ['combustivel', 'COMBUSTIVEL', 'fuel']),
      color: getField(data, ['cor', 'COR', 'color']),
      vehicleType: normalizeVehicleType(getField(data, ['tipo', 'TIPO', 'vehicleType'])),
    };
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      const networkErr = new Error('Serviço de consulta de placa indisponível. Use a busca manual por veículo.');
      networkErr.status = 503;
      throw networkErr;
    }
    throw err;
  }
}

function normalizeVehicleType(tipo) {
  if (!tipo) return 'cars';
  const t = String(tipo).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (t.includes('moto')) return 'motorcycles';
  if (t.includes('caminhao') || t.includes('truck')) return 'trucks';
  return 'cars';
}
