import React, { useState } from 'react';
import { normalizePlate, validatePlate } from '../utils/validation.js';

export default function PlateForm({ onSubmit, loading }) {
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState('');

  function handleChange(e) {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9\s\-]/g, '');
    setInputValue(raw);
    if (validationError) setValidationError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const plate = normalizePlate(inputValue);
    const { valid } = validatePlate(plate);
    if (!valid) {
      setValidationError('Formato inválido. Use ABC1234 (antigo) ou ABC1D23 (Mercosul).');
      return;
    }
    setValidationError('');
    onSubmit(plate);
  }

  return (
    <form className="plate-form" onSubmit={handleSubmit}>
      <div className="input-group">
        <label htmlFor="plate-input" className="plate-label">
          Placa do Veículo
        </label>
        <div className="input-wrapper">
          <input
            id="plate-input"
            type="text"
            className={`plate-input${validationError ? ' plate-input--error' : ''}`}
            value={inputValue}
            onChange={handleChange}
            placeholder="Ex: ABC1234 ou ABC1D23"
            maxLength={8}
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="submit-btn"
            disabled={loading || !inputValue.trim()}
          >
            {loading ? (
              <span className="spinner" aria-label="Carregando..." />
            ) : (
              'Consultar'
            )}
          </button>
        </div>
        {validationError && (
          <p className="validation-error" role="alert">
            {validationError}
          </p>
        )}
      </div>
    </form>
  );
}
