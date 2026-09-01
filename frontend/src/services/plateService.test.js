import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizePlateInput, isValidPlate, searchByPlate } from './plateService.js';

describe('plateService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normaliza placa removendo separadores e convertendo para maiúsculo', () => {
    expect(normalizePlateInput('abc-1234')).toBe('ABC1234');
    expect(normalizePlateInput('abc1d23')).toBe('ABC1D23');
  });

  it('valida formatos comuns de placa brasileira', () => {
    expect(isValidPlate('ABC1234')).toBe(true);
    expect(isValidPlate('ABC1D23')).toBe(true);
    expect(isValidPlate('AB12345')).toBe(false);
  });

  it('retorna erro amigável para placa inválida', async () => {
    const result = await searchByPlate('123');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_PLATE');
  });

  it('consulta endpoint de placa com valor normalizado', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        vehicle: { plate: 'ABC1234', brand: 'Honda' },
        fipePrimary: { code: '001', model: 'Civic', value: 'R$ 50.000,00' },
        sameYearModels: [],
        meta: { source: 'x', queriedAt: '2026-01-01T00:00:00.000Z', warnings: [] },
      }),
    });

    const result = await searchByPlate('abc-1234');

    expect(fetchMock).toHaveBeenCalledWith('/api/placa?placa=ABC1234');
    expect(result.ok).toBe(true);
    expect(result.data.vehicle.plate).toBe('ABC1234');
  });
});
