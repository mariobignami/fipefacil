import React, { useState } from 'react';

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

export default function PlateResult({ data }) {
  const { vehicle, fipePrimary, sameYearModels, meta } = data || {};

  const candidates = [fipePrimary, ...(sameYearModels || [])].filter(Boolean);

  // Guarda a escolha do usuário; ao chegar um resultado novo (placa diferente),
  // o código salvo não existe na lista e voltamos para a sugestão automática.
  const [pickedCode, setPickedCode] = useState(null);
  const selectedCode = candidates.some((item) => item.code === pickedCode)
    ? pickedCode
    : fipePrimary?.code;
  const selected = candidates.find((item) => item.code === selectedCode) || fipePrimary;

  if (!data) return null;

  const isRecommended = selected?.code === fipePrimary?.code && (fipePrimary?.matchScore ?? 0) > 0;

  return (
    <div className="result-container">
      <div className="result-card">
        <h2 className="result-card-title">Dados do Veículo</h2>
        <div className="info-grid">
          <InfoRow label="Placa consultada" value={vehicle?.plate} />
          <InfoRow label="Marca" value={vehicle?.brand} />
          <InfoRow label="Modelo" value={vehicle?.model} />
          <InfoRow label="Ano modelo" value={vehicle?.year} />
          <InfoRow label="Ano fabricação" value={vehicle?.manufactureYear} />
          <InfoRow label="Cor" value={vehicle?.color} />
          <InfoRow label="Combustível" value={vehicle?.fuel} />
          <InfoRow label="Categoria" value={vehicle?.category} />
          <InfoRow label="Espécie" value={vehicle?.species} />
          <InfoRow label="Cilindrada" value={vehicle?.engineSize} />
          <InfoRow label="Potência" value={vehicle?.power} />
          <InfoRow label="Passageiros" value={vehicle?.passengers} />
          <InfoRow label="Importado" value={vehicle?.imported} />
          <InfoRow label="Chassi" value={vehicle?.chassis} />
          <InfoRow label="Cidade/UF" value={[vehicle?.city, vehicle?.state].filter(Boolean).join('/')} />
        </div>
      </div>

      {selected && (
        <div className="result-card result-card--fipe">
          <h2 className="result-card-title">
            {isRecommended
              ? 'Modelo mais provável'
              : selected === fipePrimary
                ? 'Modelo sugerido pela fonte'
                : 'Modelo selecionado'}
          </h2>
          <div className="fipe-price">{selected.value || 'Valor indisponível'}</div>
          <div className="info-grid">
            <InfoRow label="Código FIPE" value={selected.code} />
            <InfoRow label="Modelo" value={selected.model} />
          </div>
          {isRecommended && fipePrimary?.matchedTokens?.length > 0 && (
            <p className="match-hint">
              Escolhido por corresponder a <strong>{fipePrimary.matchedTokens.join(', ')}</strong> do
              modelo da placa.
            </p>
          )}
        </div>
      )}

      <div className="result-card">
        <h2 className="result-card-title">
          Modelos do mesmo ano{candidates.length > 1 ? ` (${candidates.length})` : ''}
        </h2>
        <ul className="model-list">
          {candidates.map((item, index) => {
            const isSelected = item.code === selected?.code;
            return (
              <li
                key={`${item.code || 'sem-codigo'}-${index}`}
                className={`model-item${isSelected ? ' is-selected' : ''}`}
              >
                <div className="model-item-main">
                  <div className="model-item-head">
                    <span className="model-item-code">{item.code || 'sem código'}</span>
                  </div>
                  <span className="model-item-name">{item.model || '-'}</span>
                </div>
                <div className="model-item-side">
                  <span className="model-item-value">{item.value || '-'}</span>
                  {isSelected ? (
                    <span className="model-item-check">✓ selecionado</span>
                  ) : (
                    <button
                      type="button"
                      className="model-select-btn"
                      onClick={() => setPickedCode(item.code)}
                    >
                      Usar este
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {meta?.warnings?.length > 0 && (
        <div className="result-card result-card--warnings">
          <h3 className="result-card-title result-card-title--warning">Avisos da consulta</h3>
          <ul className="error-list">
            {meta.warnings.map((warning, index) => (
              <li key={`${warning}-${index}`} className="error-item">{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
