const API_BASE_URL = '/api';

/**
 * Lookup a vehicle by its plate via the backend API.
 * Returns the structured response with vehicle and FIPE data.
 */
export async function consultarPlaca(plate) {
  const normalized = plate.replace(/[-\s]/g, '').toUpperCase();
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
}
