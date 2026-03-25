import React from 'react';

const MONTH_ABBR = {
  janeiro: 'jan', fevereiro: 'fev', março: 'mar', abril: 'abr',
  maio: 'mai', junho: 'jun', julho: 'jul', agosto: 'ago',
  setembro: 'set', outubro: 'out', novembro: 'nov', dezembro: 'dez',
};

function formatMonthAbbr(monthStr) {
  // "fevereiro de 2025" → "fev/25"
  if (!monthStr) return '';
  const lower = monthStr.toLowerCase();
  const parts = lower.split(' de ');
  const abbr = MONTH_ABBR[parts[0]] || (parts[0].length >= 3 ? parts[0].slice(0, 3) : parts[0]);
  const year = parts[1] ? parts[1].slice(2) : '';
  return year ? `${abbr}/${year}` : abbr;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PriceHistoryChart({ data, loading }) {
  if (loading) {
    return (
      <div className="chart-loading">
        <div className="loading-spinner chart-spinner" />
        <span className="chart-loading-text">Carregando histórico de preços...</span>
      </div>
    );
  }

  if (!data || data.length < 2) return null;

  const W = 520;
  const H = 200;
  const PT = 32; // padding top (for price labels)
  const PB = 36; // padding bottom (for month labels)
  const PL = 8;
  const PR = 8;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const prices = data.map((d) => d.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  // priceRange is the spread used to scale bar heights.
  // Fall back to 10 % of max (for a single flat line) or 1 (for zero prices).
  const priceRange = maxPrice - minPrice || maxPrice * 0.1 || 1;

  const n = data.length;
  const barW = Math.min(44, Math.floor(innerW / n) - 6);
  const step = innerW / n;

  return (
    <div className="price-history-chart">
      <h3 className="chart-title">Histórico de Preços por Mês de Referência</h3>
      <div className="chart-scroll-wrapper">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="chart-svg"
          aria-label="Gráfico de histórico de preços FIPE"
          role="img"
        >
          {data.map((d, i) => {
            const relH = ((d.price - minPrice) / priceRange) * (innerH * 0.75) + innerH * 0.18;
            const x = PL + step * i + (step - barW) / 2;
            const y = PT + innerH - relH;
            const isLatest = i === n - 1;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={relH}
                  fill={isLatest ? 'var(--color-primary)' : 'var(--color-primary-light)'}
                  stroke={isLatest ? 'var(--color-primary-dark)' : 'none'}
                  strokeWidth={isLatest ? 1.5 : 0}
                  rx={4}
                />
                <text
                  x={x + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize={isLatest ? 9.5 : 8.5}
                  fontWeight={isLatest ? '700' : '400'}
                  fill={isLatest ? 'var(--color-primary-dark)' : '#374151'}
                >
                  {formatCurrency(d.price)}
                </text>
                <text
                  x={x + barW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fill={isLatest ? 'var(--color-primary-dark)' : '#6b7280'}
                  fontWeight={isLatest ? '700' : '400'}
                >
                  {formatMonthAbbr(d.month)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="chart-legend">
        <span className="chart-legend-dot chart-legend-dot--latest" />
        Mês mais recente
      </p>
    </div>
  );
}
