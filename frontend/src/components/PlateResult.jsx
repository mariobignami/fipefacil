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
  const ambiguousCount = fipePrimary?.ambiguousCount ?? 1;
  const isAmbiguous = ambiguousCount > 1 && candidates.length > 1;

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

      {isAmbiguous && (
        <div className="result-card result-card--notice">
          <p className="ambiguity-note">
            A fonte lista <strong>{ambiguousCount} modelos com nomes praticamente iguais</strong> para
            esta placa e não informa a diferença entre eles — normalmente câmbio (manual/automático)
            ou número de portas, que não constam nos dados da placa. Confira o seu veículo e escolha
            na tabela abaixo; o valor muda bastante entre as versões.
          </p>
        </div>
      )}

      <div className="result-card">
        <h2 className="result-card-title">
          Modelos do mesmo ano listados pela fonte{candidates.length > 1 ? ` (${candidates.length})` : ''}
        </h2>
        <div className="same-year-table-wrapper">
          <table className="same-year-table">
            <thead>
              <tr>
                <th>Código FIPE</th>
                <th>Modelo</th>
                <th>Valor</th>
                <th aria-label="Escolher modelo" />
              </tr>
            </thead>
            <tbody>
              {candidates.map((item, index) => {
                const isSelected = item.code === selected?.code;
                return (
                  <tr
                    key={`${item.code || 'sem-codigo'}-${index}`}
                    className={isSelected ? 'is-selected' : undefined}
                  >
                    <td>{item.code || '-'}</td>
                    <td>{item.model || '-'}</td>
                    <td>{item.value || '-'}</td>
                    <td className="same-year-table-action">
                      {isSelected ? (
                        <span className="model-selected-badge">selecionado</span>
                      ) : (
                        <button
                          type="button"
                          className="model-select-btn"
                          onClick={() => setPickedCode(item.code)}
                        >
                          Usar este
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
