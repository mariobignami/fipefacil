import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlateResult from './PlateResult.jsx';

const baseData = {
  vehicle: {
    plate: 'HHE7F34',
    brand: 'Honda',
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
    expect(screen.getByText(/fit, lx, flex/)).toBeInTheDocument();
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
