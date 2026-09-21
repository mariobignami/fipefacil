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

  it('aceita letra no 5º caractere (mercosul) e número (antiga)', () => {
    render(<PlateSearch onSubmit={vi.fn()} loading={false} />);

    fireEvent.change(screen.getByLabelText('Caractere 5 da placa'), { target: { value: 'd' } });
    expect(screen.getByLabelText('Caractere 5 da placa')).toHaveValue('D');

    fireEvent.change(screen.getByLabelText('Caractere 5 da placa'), { target: { value: '4' } });
    expect(screen.getByLabelText('Caractere 5 da placa')).toHaveValue('4');
  });

  it('não aceita letra nas posições numéricas', () => {
    render(<PlateSearch onSubmit={vi.fn()} loading={false} />);

    fireEvent.change(screen.getByLabelText('Caractere 4 da placa'), { target: { value: 'x' } });
    expect(screen.getByLabelText('Caractere 4 da placa')).toHaveValue('');

    fireEvent.change(screen.getByLabelText('Caractere 1 da placa'), { target: { value: '1' } });
    expect(screen.getByLabelText('Caractere 1 da placa')).toHaveValue('');
  });

  it('mostra apenas uma placa de preview, no formato digitado', () => {
    render(<PlateSearch onSubmit={vi.fn()} loading={false} />);

    const placa = ['c', 'x', 'n', '6', '1', '2', '3'];
    placa.forEach((char, index) => {
      fireEvent.change(screen.getByLabelText(`Caractere ${index + 1} da placa`), {
        target: { value: char },
      });
    });

    const previews = document.querySelectorAll('.plate-visual');
    expect(previews).toHaveLength(1);
    expect(previews[0]).toHaveClass('plate-visual--antiga');
    expect(document.querySelector('.plate-visual-text')).toHaveTextContent('CXN-6123');
  });

  it('usa o desenho Mercosul quando o 5º caractere é letra', () => {
    render(<PlateSearch onSubmit={vi.fn()} loading={false} />);

    const placa = ['c', 'x', 'n', '6', 'd', '2', '3'];
    placa.forEach((char, index) => {
      fireEvent.change(screen.getByLabelText(`Caractere ${index + 1} da placa`), {
        target: { value: char },
      });
    });

    const preview = document.querySelector('.plate-visual');
    expect(preview).toHaveClass('plate-visual--mercosul');
    expect(document.querySelector('.plate-visual-text')).toHaveTextContent('CXN6D23');
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
