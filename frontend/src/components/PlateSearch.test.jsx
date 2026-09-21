import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlateSearch from './PlateSearch.jsx';
import { warmupPlateBackend } from '../services/plateService.js';

vi.mock('../services/plateService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, warmupPlateBackend: vi.fn(() => Promise.resolve(true)) };
});

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

  it('pré-aquece o backend uma única vez, a partir do 3º caractere', () => {
    warmupPlateBackend.mockClear();
    render(<PlateSearch onSubmit={vi.fn()} loading={false} />);

    const digitar = (index, char) =>
      fireEvent.change(screen.getByLabelText(`Caractere ${index + 1} da placa`), {
        target: { value: char },
      });

    digitar(0, 'a');
    digitar(1, 'b');
    expect(warmupPlateBackend).not.toHaveBeenCalled();

    digitar(2, 'c');
    expect(warmupPlateBackend).toHaveBeenCalledTimes(1);

    digitar(3, '1');
    digitar(4, 'd');
    expect(warmupPlateBackend).toHaveBeenCalledTimes(1);
  });
});
