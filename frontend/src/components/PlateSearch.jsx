import React, { useMemo, useRef, useState } from 'react';
import {
  normalizePlateInput,
  isValidPlate,
  detectPlateFormat,
  warmupPlateBackend,
} from '../services/plateService.js';
import PlateVisual from './PlateVisual.jsx';

// Posições: L = letra, N = número, A = letra ou número.
// Antiga (ABC1234) = L L L N N N N | Mercosul (ABC1D23) = L L L N L N N.
// Só o 5º caractere diferencia os dois formatos.
const POSITION_RULES = ['L', 'L', 'L', 'N', 'A', 'N', 'N'];

function sanitizeByRule(value, rule) {
  const raw = String(value || '').toUpperCase();
  if (!raw) return '';
  const lastChar = raw.slice(-1);
  if (rule === 'L') return lastChar.replace(/[^A-Z]/g, '');
  if (rule === 'N') return lastChar.replace(/[^0-9]/g, '');
  return lastChar.replace(/[^A-Z0-9]/g, '');
}

export default function PlateSearch({ onSubmit, loading }) {
  const [chars, setChars] = useState(['', '', '', '', '', '', '']);
  const warmedUp = useRef(false);
  const normalized = useMemo(() => normalizePlateInput(chars.join('')), [chars]);
  const detectedFormat = useMemo(() => detectPlateFormat(normalized), [normalized]);
  const hasContent = normalized.length > 0;
  const showError = normalized.length === 7 && !isValidPlate(normalized);

  // O 5º caractere decide o formato: letra = Mercosul, número = antiga.
  const isMercosul =
    detectedFormat === 'mercosul' ||
    (detectedFormat === 'unknown' && /^[A-Z]{3}\d[A-Z]/.test(normalized));

  function handleSubmit(event) {
    event.preventDefault();
    if (loading || !hasContent) return;
    onSubmit(normalized);
  }

  function updateChar(index, value) {
    const clean = sanitizeByRule(value, POSITION_RULES[index]);
    const next = [...chars];
    next[index] = clean;
    setChars(next);

    // Assim que dá para ver que é uma placa de verdade, já pede ao backend
    // para abrir o navegador remoto (esconde a espera da consulta).
    if (!warmedUp.current && normalizePlateInput(next.join('')).length >= 3) {
      warmedUp.current = true;
      warmupPlateBackend();
    }

    if (clean && index < 6) {
      const nextInput = document.getElementById(`plate-char-${index + 1}`);
      nextInput?.focus();
    }
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace' && !chars[index] && index > 0) {
      const prevInput = document.getElementById(`plate-char-${index - 1}`);
      prevInput?.focus();
    }
  }

  function handlePaste(event) {
    event.preventDefault();
    const pasted = normalizePlateInput(event.clipboardData.getData('text'));
    if (!pasted) return;

    const next = pasted
      .slice(0, 7)
      .split('')
      .map((char, index) => sanitizeByRule(char, POSITION_RULES[index]));

    setChars(next);
  }

  return (
    <form className="manual-search plate-search" onSubmit={handleSubmit}>
      <h3 className="manual-search-title">Consulta por Placa</h3>
      <p className="manual-search-description">
        Digite a placa do veículo (antiga ou Mercosul) para ver os dados e o valor FIPE.
      </p>

      <div className="form-group">
        <label>Placa</label>
        <div className="plate-char-grid" onPaste={handlePaste}>
          {POSITION_RULES.map((rule, index) => (
            <input
              key={index}
              id={`plate-char-${index}`}
              type="text"
              className="plate-char-input"
              value={chars[index]}
              onChange={(event) => updateChar(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              disabled={loading}
              maxLength={1}
              autoComplete="off"
              inputMode={rule === 'N' ? 'numeric' : 'text'}
              aria-label={`Caractere ${index + 1} da placa`}
            />
          ))}
        </div>
        {showError && (
          <p className="validation-error" role="alert">
            Informe uma placa válida no padrão brasileiro (ex.: ABC1234 ou ABC1D23).
          </p>
        )}
      </div>

      <div className="plate-preview-area">
        <PlateVisual
          plate={normalized}
          format={isMercosul ? 'mercosul' : 'old'}
          placeholder={!hasContent}
        />
      </div>

      <button
        type="submit"
        className="submit-btn manual-search-btn"
        disabled={loading || normalized.length !== 7 || showError}
      >
        {loading ? <span className="spinner" aria-label="Carregando..." /> : 'Consultar por Placa'}
      </button>
    </form>
  );
}
