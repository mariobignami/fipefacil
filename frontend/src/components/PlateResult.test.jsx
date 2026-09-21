import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlateResult from './PlateResult.jsx';
import { fetchPriceHistoryByFipeCode } from '../services/fipeService.js';

vi.mock('../services/fipeService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchPriceHistoryByFipeCode: vi.fn(() => Promise.resolve([])),
  };
});

beforeEach(() => {
  fetchPriceHistoryByFipeCode.mockReset();
  fetchPriceHistoryByFipeCode.mockResolvedValue([]);
});

const baseData = {
  vehicle: {
    plate: 'HHE7F34',
    brand: 'Honda',
    brandLogo: 'https://www.tabelafipebrasil.com/site/site/images/logos/png/small/honda.png',
    model: 'FIT LX FLEX',
    year: '2012',
    color: 'Dourada',
    power: '101 cv',
    chassis: '*****Z105072',
    engineSize: '1339 cc',
    species: 'Passageiro',
    imported: 'Não',
    fuel: 'Álcool / Gasolina',
    category: 'Automóvel',
    city: 'CONTAGEM',
    state: 'MG',
  },
  fipePrimary: {
    code: '014039-2',
    model: 'Fit LX 1.4/ 1.4 Flex 8V/16V 5p Mec.',
    value: 'R$ 43.585,00',
    matchScore: 1,
    matchedTokens: ['fit', 'lx', 'flex'],
    ambiguousCount: 2,
  },
  sameYearModels: [
    { code: '014040-6', model: 'Fit LX 1.4/ 1.4 Flex 8V/16V 5p Aut.', value: 'R$ 48.397,00' },
    { code: '014041-4', model: 'Fit LXL 1.4/ 1.4 Flex 8V/16V 5p Mec.', value: 'R$ 45.638,00' },
  ],
  meta: {
    source: 'https://www.tabelafipebrasil.com/placa',
    queriedAt: '2026-09-21T00:26:35.606Z',
    warnings: [],
  },
};

describe('PlateResult', () => {
  it('mostra o cartão compacto com os dados pedidos, a referência e a data da consulta', () => {
    render(<PlateResult data={baseData} />);

    const card = screen.getByText('Dados do Veículo').closest('.result-card');

    expect(within(card).getByText('HHE7F34')).toBeInTheDocument();
    expect(within(card).getByText('Honda FIT LX FLEX')).toBeInTheDocument();
    expect(within(card).getByText('Dourada')).toBeInTheDocument();
    expect(within(card).getByText('2012')).toBeInTheDocument();
    expect(within(card).getByText('101 cv')).toBeInTheDocument();
    expect(within(card).getByText('*****Z105072')).toBeInTheDocument();
    expect(within(card).getByText('CONTAGEM/MG')).toBeInTheDocument();
    expect(within(card).getByText('tabelafipebrasil.com')).toBeInTheDocument();
    expect(within(card).getByText(/Consulta:/)).toBeInTheDocument();

    // Campos que saíram do cartão para deixá-lo menor
    expect(within(card).queryByText('Espécie')).not.toBeInTheDocument();
    expect(within(card).queryByText('Importado')).not.toBeInTheDocument();
    expect(within(card).queryByText('Cilindrada')).not.toBeInTheDocument();
  });

  it('mostra o modelo sugerido e a explicação da escolha', () => {
    render(<PlateResult data={baseData} />);

    const card = screen.getByText('Modelo mais provável').closest('.result-card');
    expect(within(card).getByText('R$ 43.585,00')).toBeInTheDocument();
    expect(within(card).getByText('014039-2')).toBeInTheDocument();
    // O texto explicativo do casamento de palavras foi removido a pedido
    expect(screen.queryByText(/Escolhido por corresponder/)).not.toBeInTheDocument();
  });

  it('mostra o logo da marca e o desenho da placa', () => {
    render(<PlateResult data={baseData} />);

    const logo = screen.getByAltText('Logo Honda');
    expect(logo).toHaveAttribute(
      'src',
      'https://www.tabelafipebrasil.com/site/site/images/logos/png/small/honda.png'
    );

    // HHE7F34 é Mercosul (tem letra na 5ª posição)
    const placa = document.querySelector('.plate-visual');
    expect(placa).toHaveClass('plate-visual--mercosul');
    expect(document.querySelector('.plate-visual-text')).toHaveTextContent('HHE7F34');
  });

  it('desenha a placa antiga com UF-Município e o traço', () => {
    const data = {
      ...baseData,
      vehicle: { ...baseData.vehicle, plate: 'CXN6123', city: 'SAO LUIS', state: 'MA' },
    };
    render(<PlateResult data={data} />);

    const placa = document.querySelector('.plate-visual');
    expect(placa).toHaveClass('plate-visual--antiga');
    expect(document.querySelector('.plate-visual-text')).toHaveTextContent('CXN-6123');
    expect(document.querySelector('.plate-visual-local')).toHaveTextContent('MA-SAO LUIS');
  });

  it('mostra o histórico do modelo selecionado e recarrega ao trocar', async () => {
    fetchPriceHistoryByFipeCode.mockResolvedValue([
      { month: 'agosto de 2026', price: 43000, priceFormatted: 'R$ 43.000,00' },
      { month: 'setembro de 2026', price: 43585, priceFormatted: 'R$ 43.585,00' },
    ]);

    const user = userEvent.setup();
    render(<PlateResult data={baseData} />);

    await waitFor(() => {
      expect(screen.getByText('Histórico de Preços por Mês de Referência')).toBeInTheDocument();
    });
    expect(fetchPriceHistoryByFipeCode).toHaveBeenCalledWith(
      '014039-2',
      expect.objectContaining({ modelYear: '2012' })
    );

    // troca o modelo selecionado -> busca o histórico do novo código
    await user.click(screen.getAllByRole('button', { name: 'Usar este' })[0]);
    await waitFor(() => {
      expect(fetchPriceHistoryByFipeCode).toHaveBeenLastCalledWith(
        '014040-6',
        expect.objectContaining({ modelYear: '2012' })
      );
    });
  });

  it('mostra a lista de modelos acima do preço', () => {
    render(<PlateResult data={baseData} />);

    const titulos = Array.from(document.querySelectorAll('.result-card-title')).map((el) =>
      el.textContent.trim()
    );
    const indiceLista = titulos.findIndex((t) => /Modelos do mesmo ano/.test(t));
    const indicePreco = titulos.findIndex((t) => /Modelo mais provável/.test(t));

    expect(indiceLista).toBeGreaterThanOrEqual(0);
    expect(indicePreco).toBeGreaterThan(indiceLista);
  });

  it('lista todos os modelos do ano e marca o selecionado', () => {
    render(<PlateResult data={baseData} />);

    const itens = document.querySelectorAll('.model-item');
    expect(itens).toHaveLength(3);
    expect(document.querySelectorAll('.model-item.is-selected')).toHaveLength(1);
    expect(screen.getByText('✓ selecionado')).toBeInTheDocument();
    expect(screen.queryByText(/todos os modelos do ano dessa marca que/)).not.toBeInTheDocument();
  });

  it('permite trocar o modelo exibido pelo botão "Usar este"', async () => {
    const user = userEvent.setup();
    render(<PlateResult data={baseData} />);

    const botoes = screen.getAllByRole('button', { name: 'Usar este' });
    await user.click(botoes[0]);

    const card = screen.getByText('Modelo selecionado').closest('.result-card');
    expect(within(card).getByText('R$ 48.397,00')).toBeInTheDocument();
    expect(within(card).getByText('014040-6')).toBeInTheDocument();
    expect(screen.queryByText(/Escolhido por corresponder/)).not.toBeInTheDocument();
  });
});
