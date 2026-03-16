import assert from 'node:assert/strict';
import test, { after, mock } from 'node:test';
import axios from 'axios';
import { lookupPlate, normalizeVehicleData } from './plateService.js';

const originalProvider = process.env.PLATE_API_PROVIDER;

test('lookupPlate uses BrasilAPI endpoint and normalizes payload', async (t) => {
  process.env.PLATE_API_PROVIDER = 'brasilapi';

  const samplePayload = {
    placa: 'ABC1234',
    marca: 'FIAT',
    modelo: 'UNO MILLE',
    anoModelo: '2010',
    ano: '2009',
    combustivel: 'GASOLINA',
    cor: 'VERMELHA',
    codigoFipe: '001267-7',
    valor: 'R$ 21.000,00',
    mesReferencia: 'maio de 2024'
  };

  const mockGet = mock.method(axios, 'get', async (url) => {
    return { data: samplePayload };
  });

  const result = await lookupPlate('ABC1234');

  assert.equal(mockGet.mock.calls[0].arguments[0], 'https://brasilapi.com.br/api/placa/v1/ABC1234');
  assert.equal(result.brand, 'FIAT');
  assert.equal(result.model, 'UNO MILLE');
  assert.equal(result.year, 2010);
  assert.equal(result.plate, 'ABC1234');
  assert.equal(result.fipeCode, '001267-7');
  assert.equal(result.fipePrice, 'R$ 21.000,00');
  assert.equal(result.fipeReferenceMonth, 'maio de 2024');

  mockGet.mock.restore();
});

test('normalizeVehicleData infers brand from model and normalizes vehicle type', () => {
  const normalized = normalizeVehicleData(
    { modelo: 'FORD/KA 1.0', anoModelo: '2019', tipoVeiculo: 'MOTOCICLETA' },
    'brasilapi'
  );

  assert.equal(normalized.brand, 'FORD');
  assert.equal(normalized.model, 'KA 1.0');
  assert.equal(normalized.vehicleType, 'motorcycles');
});

after(() => {
  process.env.PLATE_API_PROVIDER = originalProvider;
});
