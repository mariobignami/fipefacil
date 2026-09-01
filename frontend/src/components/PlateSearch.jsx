import React, { useMemo, useState } from 'react';
import { normalizePlateInput, isValidPlate } from '../services/plateService.js';

export default function PlateSearch({ onSubmit, loading }) {
  const [plateInput, setPlateInput] = useState('');
  const normalized = useMemo(() => normalizePlateInput(plateInput), [plateInput]);
  const hasContent = plateInput.trim().length > 0;
  const showError = hasContent && !isValidPlate(normalized);

  function handleSubmit(event) {
    event.preventDefault();
    if (loading || !hasContent) return;
    onSubmit(plateInput);
  }

  return (
    <form className="manual-search plate-search" onSubmit={handleSubmit}>
      <h3 className="manual-search-title">Consulta por Placa</h3>
      <p className="manual-search-description">
        Digite uma placa de carro, moto ou outro veículo para consultar dados e FIPE.
      </p>

      <div className="form-group">
        <label htmlFor="plate-input">Placa</label>
        <input
          id="plate-input"
          type="text"
          className="form-select plate-input"
          placeholder="Ex.: ABC1234 ou ABC1D23"
          value={plateInput}
          onChange={(event) => setPlateInput(event.target.value)}
          disabled={loading}
          maxLength={10}
          autoComplete="off"
        />
        {showError && (
          <p className="validation-error" role="alert">
            Informe uma placa válida no padrão brasileiro.
          </p>
        )}
      </div>

      <button
        type="submit"
        className="submit-btn manual-search-btn"
        disabled={loading || !hasContent || showError}
      >
        {loading ? <span className="spinner" aria-label="Carregando..." /> : 'Consultar por Placa'}
      </button>
    </form>
  );
}
