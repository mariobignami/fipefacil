import React, { useMemo, useState } from 'react';
import {
  normalizePlateInput,
  isValidPlate,
  detectPlateFormat,
  formatPlateDisplay,
} from '../services/plateService.js';

const POSITION_RULES = {
  old: ['L', 'L', 'L', 'N', 'N', 'N', 'N'],
  mercosul: ['L', 'L', 'L', 'N', 'L', 'N', 'N'],
  auto: ['L', 'L', 'L', 'N', 'A', 'N', 'N'],
};

function sanitizeByRule(value, rule) {
  const raw = String(value || '').toUpperCase();
  if (!raw) return '';
  const lastChar = raw.slice(-1);
  if (rule === 'L') return lastChar.replace(/[^A-Z]/g, '');
  if (rule === 'N') return lastChar.replace(/[^0-9]/g, '');
  return lastChar.replace(/[^A-Z0-9]/g, '');
}

export default function PlateSearch({ onSubmit, loading }) {
  const [plateFormat, setPlateFormat] = useState('auto');
  const [chars, setChars] = useState(['', '', '', '', '', '', '']);
  const normalized = useMemo(() => normalizePlateInput(chars.join('')), [chars]);
  const detectedFormat = useMemo(() => detectPlateFormat(normalized), [normalized]);
  const hasContent = normalized.length > 0;
  const showError = hasContent && normalized.length === 7 && !isValidPlate(normalized);
  const activeFormat = detectedFormat === 'unknown' ? plateFormat : detectedFormat;
  const formatLabel = activeFormat === 'mercosul' ? 'Mercosul' : activeFormat === 'old' ? 'Antiga' : 'Automático';

  function handleSubmit(event) {
    event.preventDefault();
    if (loading || !hasContent) return;
    onSubmit(normalized);
  }

  function updateChar(index, value) {
    const rule = POSITION_RULES[plateFormat][index];
    const clean = sanitizeByRule(value, rule);
    setChars((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
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
    const next = pasted.slice(0, 7).split('');
    setChars((prev) => prev.map((_, index) => next[index] || ''));
  }

  return (
    <form className="manual-search plate-search" onSubmit={handleSubmit}>
      <h3 className="manual-search-title">Consulta por Placa</h3>
      <p className="manual-search-description">
        Digite uma placa de carro, moto ou outro veículo para consultar dados e FIPE.
      </p>

      <div className="form-group">
        <label htmlFor="plate-format">Formato da placa</label>
        <select
          id="plate-format"
          className="form-select"
          value={plateFormat}
          onChange={(event) => setPlateFormat(event.target.value)}
          disabled={loading}
        >
          <option value="auto">Automático</option>
          <option value="old">Antiga (ABC-1234)</option>
          <option value="mercosul">Mercosul (ABC1D23)</option>
        </select>
      </div>

      <div className="form-group">
        <label>Placa</label>
        <div className="plate-char-grid" onPaste={handlePaste}>
          {POSITION_RULES[plateFormat].map((rule, index) => (
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
        <p className="plate-format-hint">Formato detectado: {formatLabel}</p>
        {showError && (
          <p className="validation-error" role="alert">
            Informe uma placa válida no padrão brasileiro.
          </p>
        )}
      </div>

      <div className="plate-preview-stack" aria-live="polite">
        <div className="plate-preview plate-preview--old">
          <span className="plate-preview-tag">Placa antiga</span>
          <strong>{formatPlateDisplay(normalized, 'old')}</strong>
        </div>
        <div className="plate-preview plate-preview--mercosul">
          <span className="plate-preview-tag">Placa Mercosul</span>
          <strong>{formatPlateDisplay(normalized, 'mercosul')}</strong>
        </div>
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
