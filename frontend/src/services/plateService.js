export function normalizePlateInput(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function isValidPlate(value) {
  return /^(?:[A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z]\d{2})$/.test(value);
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
    const response = await fetch(`/api/placa?placa=${encodeURIComponent(normalizedPlate)}`);
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
