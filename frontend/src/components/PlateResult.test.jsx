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
  meta: { source: 'https://www.tabelafipebrasil.com/placa', warnings: [] },
};

describe('PlateResult', () => {
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
