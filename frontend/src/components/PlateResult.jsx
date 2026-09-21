import React, { useEffect, useState } from 'react';
import PlateVisual from './PlateVisual.jsx';
import PriceHistoryChart from './PriceHistoryChart.jsx';
import { fetchPriceHistoryByFipeCode, vehicleTypeFromCategory } from '../services/fipeService.js';

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

function formatarConsulta(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nomeFonte(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return 'tabelafipebrasil.com';
  }
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

  // Histórico do modelo que está selecionado (muda quando o usuário troca).
  const vehicleType = vehicleTypeFromCategory(vehicle?.category);
  const codigoSelecionado = selected?.code || '';
  const anoModelo = vehicle?.year || '';
  const [historico, setHistorico] = useState([]);
  const [historicoCarregando, setHistoricoCarregando] = useState(false);

  useEffect(() => {
    if (!codigoSelecionado) {
      setHistorico([]);
      setHistoricoCarregando(false);
      return undefined;
    }

    let cancelado = false;
    setHistoricoCarregando(true);

    fetchPriceHistoryByFipeCode(codigoSelecionado, { vehicleType, modelYear: anoModelo })
      .then((dados) => {
        if (cancelado) return;
        setHistorico(dados);
      })
      .catch(() => {
        if (!cancelado) setHistorico([]);
      })
      .finally(() => {
        if (!cancelado) setHistoricoCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [codigoSelecionado, vehicleType, anoModelo]);

  if (!data) return null;

  const isRecommended = selected?.code === fipePrimary?.code && (fipePrimary?.matchScore ?? 0) > 0;

  return (
    <div className="result-container">
      <div className="result-card">
        <div className="result-card-head">
          <h2 className="result-card-title">Dados do Veículo</h2>
          {vehicle?.brandLogo && (
            <img
              className="brand-logo"
              src={vehicle.brandLogo}
              alt={vehicle.brand ? `Logo ${vehicle.brand}` : 'Logo da marca'}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
        </div>
        <div className="info-grid">
          <InfoRow
            label="Modelo"
            value={[vehicle?.brand, vehicle?.model].filter(Boolean).join(' ')}
          />
          <InfoRow label="Cor" value={vehicle?.color} />
          <InfoRow label="Ano/Modelo" value={vehicle?.year} />
          <InfoRow label="Potência" value={vehicle?.power} />
          <InfoRow label="Chassi" value={vehicle?.chassis} />
          <InfoRow
            label="Cidade"
            value={[vehicle?.city, vehicle?.state].filter(Boolean).join('/')}
          />
        </div>

        <div className="plate-preview-area plate-preview-area--result">
          <PlateVisual
            plate={vehicle?.plate}
            city={vehicle?.city}
            state={vehicle?.state}
            size="sm"
          />
        </div>

        <p className="vehicle-meta">
          {meta?.source && (
            <>
              Tabela:{' '}
              <a href={meta.source} target="_blank" rel="noreferrer">
                {nomeFonte(meta.source)}
              </a>
            </>
          )}
          {formatarConsulta(meta?.queriedAt) && (
            <> · Consulta: {formatarConsulta(meta.queriedAt)}</>
          )}
        </p>
      </div>

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
        </div>
      )}

      {(historicoCarregando || historico.length >= 2) && (
        <div className="result-card result-card--history">
          <PriceHistoryChart data={historico} loading={historicoCarregando} />
        </div>
      )}

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
