import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlateSearch from './PlateSearch.jsx';

describe('PlateSearch', () => {
  it('renderiza os 7 campos segmentados da placa', () => {
    render(<PlateSearch onSubmit={vi.fn()} loading={false} />);
    const inputs = screen.getAllByLabelText(/Caractere \d da placa/);
    expect(inputs).toHaveLength(7);
  });

  it('altera inputMode do 5º caractere no formato mercosul', () => {
    render(<PlateSearch onSubmit={vi.fn()} loading={false} />);
    const select = screen.getByLabelText('Formato da placa');
    fireEvent.change(select, { target: { value: 'mercosul' } });
    const fifthInput = screen.getByLabelText('Caractere 5 da placa');
    expect(fifthInput).toHaveAttribute('inputmode', 'text');
  });

  it('submete placa normalizada', () => {
    const onSubmit = vi.fn();
    render(<PlateSearch onSubmit={onSubmit} loading={false} />);

    const chars = ['a', 'b', 'c', '1', 'd', '2', '3'];
    chars.forEach((char, index) => {
      fireEvent.change(screen.getByLabelText(`Caractere ${index + 1} da placa`), {
        target: { value: char },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Consultar por Placa' }));
    expect(onSubmit).toHaveBeenCalledWith('ABC1D23');
  });
});
