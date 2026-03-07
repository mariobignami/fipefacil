const API_BASE_URL = '/api';

/**
 * Lookup a vehicle by its plate via the backend API.
 * Returns the structured response with vehicle and FIPE data.
 */
export async function consultarPlaca(plate) {
  const normalized = plate.replace(/[-\s]/g, '').toUpperCase();

  try {
    const response = await fetch(`${API_BASE_URL}/consulta?placa=${encodeURIComponent(normalized)}`);

    if (!response.ok) {
      let data = {};
      try {
        data = await response.json();
      } catch (_) {
        // Non-JSON error response
      }
      const err = new Error(data.message || 'Erro ao consultar a placa');
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return response.json();
  } catch (err) {
    // If the error is a network error (backend not available)
    if (err instanceof TypeError && err.message.includes('fetch')) {
      const networkErr = new Error('Backend não disponível. Use a busca manual por veículo.');
      networkErr.status = 503;
      throw networkErr;
    }
    throw err;
  }
}
