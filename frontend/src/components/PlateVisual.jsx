import React from 'react';
import { normalizePlateInput, detectPlateFormat } from '../services/plateService.js';

/**
 * Desenho da placa no formato brasileiro:
 *  - Mercosul: faixa azul (BRASIL / MERCOSUL) + fundo branco
 *  - Antiga:   fundo cinza, faixa com UF-Município no topo
 */
export default function PlateVisual({
  plate,
  format,
  city,
  state,
  size = 'md',
  placeholder = false,
}) {
  const normalizada = normalizePlateInput(plate);
  const formato = format || detectPlateFormat(normalizada);
  const mercosul = formato === 'mercosul';

  const exibicao = mercosul
    ? normalizada.padEnd(7, '•').slice(0, 7)
    : `${normalizada.slice(0, 3)}${normalizada.length > 3 ? '-' : ''}${normalizada
        .slice(3)
        .padEnd(4, '•')
        .slice(0, 4)}`;

  const local = [state, city].filter(Boolean).join('-');

  return (
    <div
      className={`plate-visual plate-visual--${mercosul ? 'mercosul' : 'antiga'} plate-visual--${size}${
        placeholder ? ' plate-visual--placeholder' : ''
      }`}
      aria-label={`Placa ${mercosul ? 'Mercosul' : 'antiga'}: ${exibicao}`}
    >
      {mercosul ? (
        <div className="plate-visual-header">
          <span className="plate-visual-flag" aria-hidden="true" />
          <span className="plate-visual-title">BRASIL</span>
          <span className="plate-visual-subtitle">MERCOSUL</span>
        </div>
      ) : (
        <div className="plate-visual-header plate-visual-header--antiga">
          <span className="plate-visual-local">{local || 'BRASIL'}</span>
        </div>
      )}

      <div className="plate-visual-body">
        <span className="plate-visual-text">{exibicao}</span>
      </div>
    </div>
  );
}
