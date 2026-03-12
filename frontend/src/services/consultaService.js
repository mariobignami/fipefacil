// Backend API URL - change this if deploying backend elsewhere
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function getField(data, keys) {
  for (const key of keys) {
    if (data[key] != null) return data[key];
  }
  return null;
}

/**
 * Lookup a vehicle by its plate using the backend API.
 * The backend proxies the request to a configured plate lookup service.
 * Returns normalized vehicle data (brand, model, year, fuel, color).
 */
export async function consultarPlaca(plate) {
  const normalized = plate.replace(/[-\s]/g, '').toUpperCase();

  try {
    const response = await fetch(`${BACKEND_URL}/api/consulta?placa=${normalized}`);

    if (response.status === 404) {
      const data = await response.json().catch(() => ({}));
      const err = new Error(data.message || 'Veículo não encontrado para a placa informada.');
      err.status = 404;
      throw err;
    }

    if (response.status === 503) {
      const data = await response.json().catch(() => ({}));
      const err = new Error(
        data.message || 'Serviço de consulta de placa indisponível. Use a busca manual por veículo.'
      );
      err.status = 503;
      throw err;
    }

    if (!response.ok) {
      const err = new Error('Erro ao consultar a placa. Tente novamente.');
      err.status = response.status;
      throw err;
    }

    const data = await response.json();

    // Extract vehicle data from backend response
    const vehicle = data.vehicle || {};

    return {
      brand: vehicle.brand || getField(vehicle, ['marca', 'MARCA']),
      model: vehicle.model || getField(vehicle, ['modelo', 'MODELO']),
      year: vehicle.year || getField(vehicle, ['ano', 'ANO']),
      fuel: vehicle.fuel || getField(vehicle, ['combustivel', 'COMBUSTIVEL']),
      color: vehicle.color || getField(vehicle, ['cor', 'COR']),
      vehicleType: normalizeVehicleType(vehicle.vehicleType || getField(vehicle, ['tipo', 'TIPO'])),
    };
  } catch (err) {
    // Network error (e.g., backend not running)
    if (err instanceof TypeError && err.message.includes('fetch')) {
      const networkErr = new Error(
        'Backend de consulta de placa não está disponível. ' +
        'Para usar a busca por placa, configure e inicie o backend conforme o README.md. ' +
        'Por enquanto, use a busca manual por veículo.'
      );
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
