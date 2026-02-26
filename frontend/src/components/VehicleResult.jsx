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

export default function VehicleResult({ data }) {
  if (!data) return null;

  const { plate, vehicle, fipe, errors } = data;

  const hasVehicleData = vehicle && (vehicle.brand || vehicle.model);
  const hasFipeData = fipe && fipe.price;
  const hasErrors = errors && errors.length > 0;

  return (
    <div className="result-container">
      <div className="result-plate-badge">
        <span className="result-plate">{plate}</span>
      </div>

      {hasVehicleData && (
        <div className="result-card">
          <h2 className="result-card-title">Dados do Veículo</h2>
          <div className="info-grid">
            <InfoRow label="Marca" value={vehicle.brand} />
            <InfoRow label="Modelo" value={vehicle.model} />
            <InfoRow label="Ano" value={vehicle.year} />
            <InfoRow label="Combustível" value={vehicle.fuel} />
            <InfoRow label="Cor" value={vehicle.color} />
          </div>
        </div>
      )}

      {hasFipeData && (
        <div className="result-card result-card--fipe">
          <h2 className="result-card-title">Tabela FIPE</h2>
          <div className="fipe-price">{fipe.price}</div>
          <div className="info-grid">
            <InfoRow label="Código FIPE" value={fipe.code} />
            <InfoRow label="Mês de Referência" value={fipe.referenceMonth} />
            {fipe.brand && <InfoRow label="Marca (FIPE)" value={fipe.brand} />}
            {fipe.model && <InfoRow label="Modelo (FIPE)" value={fipe.model} />}
            {fipe.fuel && <InfoRow label="Combustível" value={fipe.fuel} />}
          </div>
        </div>
      )}

      {!hasVehicleData && !hasFipeData && (
        <div className="result-card result-card--empty">
          <p>Nenhum dado encontrado para esta placa.</p>
        </div>
      )}

      {hasErrors && (
        <div className="result-card result-card--warnings">
          <h3 className="result-card-title result-card-title--warning">Avisos</h3>
          <ul className="error-list">
            {errors.map((err, i) => (
              <li key={`${err.type}-${i}`} className="error-item">
                <strong>{err.type}:</strong> {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
