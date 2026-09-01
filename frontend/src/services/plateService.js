export function normalizePlateInput(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function isValidPlate(value) {
  return /^(?:[A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z]\d{2})$/.test(value);
}

export function detectPlateFormat(value) {
  const plate = normalizePlateInput(value);
  if (/^[A-Z]{3}\d{4}$/.test(plate)) return 'old';
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate)) return 'mercosul';
  return 'unknown';
}

export function formatPlateDisplay(value, format) {
  const plate = normalizePlateInput(value).padEnd(7, '•').slice(0, 7);
  if (format === 'old') return `${plate.slice(0, 3)}-${plate.slice(3, 7)}`;
  return plate;
}

export async function searchByPlate(plate) {
  const normalizedPlate = normalizePlateInput(plate);

  if (!isValidPlate(normalizedPlate)) {
    return {
      ok: false,
      code: 'INVALID_PLATE',
      message: 'Placa inválida. Digite no formato ABC1234 ou ABC1D23.',
    };
  }

  try {
    const response = await fetch(
      `${PLATE_API_BASE}/api/placa?placa=${encodeURIComponent(normalizedPlate)}`
    );
    const payload = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        code: payload?.error?.code || 'PLATE_LOOKUP_ERROR',
        message: payload?.error?.message || 'Não foi possível consultar esta placa agora.',
      };
    }

    return {
      ok: true,
      data: payload,
      normalizedPlate,
    };
  } catch (error) {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: 'Erro de conexão ao consultar a placa. Tente novamente.',
    };
  }
}
const PLATE_API_BASE = import.meta.env.VITE_PLATE_API_BASE || '';
