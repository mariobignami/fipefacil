import React from 'react';
import { getDemoPlates } from '../services/mockPlateData.js';

export default function DemoSection({ onPlateSelect }) {
  const demoPlates = getDemoPlates();

  return (
    <div className="demo-section">
      <h3 className="demo-title">🚗 Placas de Exemplo</h3>
      <p className="demo-description">
        Clique em uma das placas abaixo para testar o aplicativo com dados reais da Tabela FIPE:
      </p>
      <div className="demo-plates">
        {demoPlates.map((item) => (
          <button
            key={item.plate}
            className="demo-plate-button"
            onClick={() => onPlateSelect(item.plate)}
          >
            <span className="demo-plate-text">{item.plate}</span>
            <span className="demo-plate-info">
              {item.brand} {item.model} {item.year}
            </span>
          </button>
        ))}
      </div>
      <div className="demo-note">
        <p>
          💡 <strong>Nota:</strong> Estas são placas de exemplo para demonstração.
          O aplicativo busca os preços reais da Tabela FIPE através da API pública.
        </p>
      </div>
    </div>
  );
}
