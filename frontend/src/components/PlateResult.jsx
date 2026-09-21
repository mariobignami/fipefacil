import React from 'react';

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
  if (!data) return null;

  const { vehicle, fipePrimary, sameYearModels, candidatesCount, meta } = data;
  const hasMatch = (fipePrimary?.matchScore ?? 0) > 0;

  return (
    <div className="result-container">
      <div className="result-card">
        <h2 className="result-card-title">Dados do Veículo</h2>
        <div className="info-grid">
          <InfoRow label="Placa consultada" value={vehicle?.plate} />
          <InfoRow label="Marca" value={vehicle?.brand} />
          <InfoRow label="Modelo" value={vehicle?.model} />
          <InfoRow label="Ano" value={vehicle?.year} />
          <InfoRow label="Combustível" value={vehicle?.fuel} />
          <InfoRow label="Categoria" value={vehicle?.category} />
          <InfoRow label="Cidade/UF" value={[vehicle?.city, vehicle?.state].filter(Boolean).join('/')} />
        </div>
      </div>

      {fipePrimary && (
        <div className="result-card result-card--fipe">
          <h2 className="result-card-title">
            {hasMatch ? 'Modelo mais provável' : 'Modelo sugerido pela fonte'}
          </h2>
          <div className="fipe-price">{fipePrimary.value || 'Valor indisponível'}</div>
          <div className="info-grid">
            <InfoRow label="Código FIPE" value={fipePrimary.code} />
            <InfoRow label="Modelo" value={fipePrimary.model} />
          </div>
          {hasMatch && fipePrimary.matchedTokens?.length > 0 && (
            <p className="match-hint">
              Escolhido por corresponder a <strong>{fipePrimary.matchedTokens.join(', ')}</strong> do
              modelo da placa.
            </p>
          )}
        </div>
      )}

      <div className="result-card">
        <h2 className="result-card-title">
          Outros modelos do mesmo ano{candidatesCount > 1 ? ` (${candidatesCount - 1})` : ''}
        </h2>
        {sameYearModels?.length ? (
          <div className="same-year-table-wrapper">
            <table className="same-year-table">
              <thead>
                <tr>
                  <th>Código FIPE</th>
                  <th>Modelo</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {sameYearModels.map((item, index) => (
                  <tr key={`${item.code || 'sem-codigo'}-${index}`}>
                    <td>{item.code || '-'}</td>
                    <td>{item.model || '-'}</td>
                    <td>{item.value || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-inline-message">Nenhum outro modelo do mesmo ano foi retornado.</p>
        )}
        <p className="source-note">
          A fonte lista todos os modelos do ano dessa marca que <em>podem</em> corresponder à placa
          e não indica qual é o correto. Confirme o modelo exato do veículo antes de usar o valor.
        </p>
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
