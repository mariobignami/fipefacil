import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  parsePlateHtml,
  normalizePlateInput,
  isValidPlate,
  buildPlateUrl,
  hasFipeContent,
  isCloudflareChallenge,
} = require('./plateScraper.js');

describe('plateScraper', () => {
  it('normaliza e valida placa', () => {
    expect(normalizePlateInput('abc-1234')).toBe('ABC1234');
    expect(isValidPlate('ABC1234')).toBe(true);
    expect(isValidPlate('A1C1234')).toBe(false);
  });

  it('faz parse de tabela de detalhes e tabela FIPE', () => {
    const html = `
      <html>
        <body>
          <table class="fipeTablePriceDetail">
            <tr><td>Marca:</td><td>Honda</td></tr>
            <tr><td>Modelo:</td><td>Civic</td></tr>
            <tr><td>Ano modelo:</td><td>2020</td></tr>
          </table>
          <table class="fipe-desktop">
            <tr><th>Código FIPE</th><th>Modelo</th><th>Valor</th></tr>
            <tr><td>001</td><td>Civic EX</td><td>R$ 99.000,00</td></tr>
            <tr><td>002</td><td>Civic LX</td><td>R$ 95.000,00</td></tr>
          </table>
        </body>
      </html>
    `;

    const parsed = parsePlateHtml(html, 'ABC1234');
    expect(parsed.type).toBe('success');
    expect(parsed.data.vehicle.plate).toBe('ABC1234');
    expect(parsed.data.fipePrimary.code).toBe('001');
    expect(parsed.data.sameYearModels).toHaveLength(1);
  });

  it('retorna not_found quando não há dados', () => {
    const parsed = parsePlateHtml('<body>Placa não encontrada.</body>', 'ABC1234');
    expect(parsed.type).toBe('not_found');
  });

  it('monta a URL de consulta no formato aceito pela fonte', () => {
    expect(buildPlateUrl('abc-1d23')).toBe(
      'https://www.tabelafipebrasil.com/placa/ABC1D23'
    );
  });

  it('identifica a página de desafio do Cloudflare', () => {
    const challenge =
      '<html><head><title>Just a moment...</title></head><body>' +
      '<script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1"></script>' +
      '<form id="challenge-form"></form></body></html>';

    expect(isCloudflareChallenge(challenge)).toBe(true);
    expect(
      isCloudflareChallenge('<html><body>ok</body></html>', {
        get: (name) => (name === 'cf-mitigated' ? 'challenge' : null),
      })
    ).toBe(true);
  });

  it('não confunde a página real (que também carrega o script do Cloudflare)', () => {
    const real =
      '<html><head><title>Tabela FIPE Brasil - Placa ABC1234</title></head><body>' +
      '<script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page/v1"></script>' +
      '<table class="fipeTablePriceDetail"><tr><td>Marca:</td><td>Honda</td></tr></table>' +
      '</body></html>';

    expect(hasFipeContent(real)).toBe(true);
    expect(isCloudflareChallenge(real)).toBe(false);
  });
});
