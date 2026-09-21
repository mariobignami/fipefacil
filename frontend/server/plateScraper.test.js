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
  scoreModelMatch,
  rankFipeRows,
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

  it('retorna not_found quando a fonte devolve a página sem dados do veículo', () => {
    // A fonte responde 200 com a página normal (sem mensagem) para placa inexistente.
    const html = `
      <html><head><title>Placa RIO2A18</title></head>
      <body>
        <nav><a href="https://www.tabelafipebrasil.com/carros">Carros</a>
        Marcas Ranking FIPE Pesquisa Placa Perguntas Frequentes
        O que é a Tabela FIPE? Como usar a Tabela FIPE Pesquisar código FIPE</nav>
        <footer>Preços Tabela FIPE Brasil Mercado Denatran RENAVAM Documentação</footer>
      </body></html>
    `;

    const parsed = parsePlateHtml(html, 'RIO2A18');
    expect(parsed.type).toBe('not_found');
  });

  it('retorna selector_changed quando a página não parece ser a da fonte', () => {
    const parsed = parsePlateHtml('<html><body>oi</body></html>', 'ABC1234');
    expect(parsed.type).toBe('selector_changed');
  });

  it('escolhe o candidato mais parecido com o modelo da placa (caso T-Cross x Saveiro)', () => {
    // A fonte lista vários modelos "que podem corresponder" e o primeiro da
    // lista é um falso positivo ("Saveiro CROSS" casou com a palavra CROSS).
    const rows = [
      { code: '005408-9', model: 'Saveiro CROSS 1.6 T.Flex 16V CD', value: 'R$ 88.070,00' },
      { code: '005508-5', model: 'T-Cross Hig. 250 TSI 1.4 Flex 16V 5p Aut', value: 'R$ 113.458,00' },
      { code: '005509-3', model: 'T-Cross Comfor. 200 TSI 1.0 Flex 5p Aut.', value: 'R$ 100.367,00' },
      { code: '005520-4', model: 'T-Cross Sense 200 TSI 1.0 Flex 5p Aut.', value: 'R$ 89.326,00' },
    ];

    const { primary, others } = rankFipeRows('T CROSS HL TSI', rows);

    expect(primary.code).toBe('005508-5');
    expect(primary.matchScore).toBeGreaterThan(0);
    expect(primary.matchedTokens).toEqual(expect.arrayContaining(['cross', 'tsi']));
    expect(others).toHaveLength(3);
    expect(others.map((row) => row.code)).toContain('005408-9');
  });

  it('mantém a ordem da fonte quando não há modelo para comparar', () => {
    const rows = [
      { code: '001', model: 'Modelo A', value: 'R$ 1,00' },
      { code: '002', model: 'Modelo B', value: 'R$ 2,00' },
    ];

    const { primary } = rankFipeRows('', rows);
    expect(primary.code).toBe('001');
    expect(primary.matchScore).toBe(0);
  });

  it('pontua semelhança entre modelo do veículo e candidato', () => {
    expect(scoreModelMatch('T CROSS HL TSI', 'T-Cross Hig. 250 TSI 1.4 Flex 16V 5p Aut').score).toBe(0.75);
    expect(scoreModelMatch('T CROSS HL TSI', 'Saveiro CROSS 1.6 T.Flex 16V CD').score).toBe(0.5);
  });

  it('usa a lista ranqueada ao interpretar a página completa', () => {
    const html = `
      <html><body>
        <table class="fipeTablePriceDetail">
          <tr><td>Marca:</td><td>Volkswagen</td></tr>
          <tr><td>Modelo:</td><td>T CROSS HL TSI</td></tr>
          <tr><td>Ano modelo:</td><td>2022</td></tr>
        </table>
        <table class="fipe-desktop">
          <tr><td>Código FIPE</td><td>Modelo</td><td>Valor</td></tr>
          <tr><td>005408-9</td><td>Saveiro CROSS 1.6 T.Flex 16V CD</td><td>R$ 88.070,00</td></tr>
          <tr><td>005508-5</td><td>T-Cross Hig. 250 TSI 1.4 Flex 16V 5p Aut</td><td>R$ 113.458,00</td></tr>
        </table>
      </body></html>
    `;

    const parsed = parsePlateHtml(html, 'DGN9I06');
    expect(parsed.type).toBe('success');
    expect(parsed.data.fipePrimary.code).toBe('005508-5');
    expect(parsed.data.candidatesCount).toBe(2);
    expect(parsed.data.sameYearModels).toHaveLength(1);
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
