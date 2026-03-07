import React, { useState } from 'react';
import PlateForm from './components/PlateForm.jsx';
import ManualSearch from './components/ManualSearch.jsx';
import VehicleResult from './components/VehicleResult.jsx';
import DemoSection from './components/DemoSection.jsx';
import { consultarPlaca } from './services/consultaService.js';
import { searchFipeByCodes } from './services/fipeService.js';

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

const SEARCH_MODE = {
  PLATE: 'plate',
  MANUAL: 'manual',
};

export default function App() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchMode, setSearchMode] = useState(SEARCH_MODE.MANUAL);

  async function handlePlateSubmit(plate) {
    setStatus(STATUS.LOADING);
    setResult(null);
    setErrorMessage('');

    try {
      const data = await consultarPlaca(plate);
      setResult(data);
      setStatus(STATUS.SUCCESS);
    } catch (err) {
      console.error('[App] Error:', err);
      setStatus(STATUS.ERROR);
      if (err.status === 400) {
        setErrorMessage('Placa inválida. Use o formato antigo (ABC1234) ou Mercosul (ABC1D23).');
      } else if (err.status === 404) {
        setErrorMessage('Veículo não encontrado para a placa informada.');
      } else {
        setErrorMessage('Erro ao consultar. Verifique sua conexão e tente novamente.');
      }
    }
  }

  async function handleManualSubmit(vehicleData) {
    setStatus(STATUS.LOADING);
    setResult(null);
    setErrorMessage('');

    try {
      const fipeData = await searchFipeByCodes({
        brandCode: vehicleData.brandCode,
        modelCode: vehicleData.modelCode,
        yearCode: vehicleData.yearCode,
        vehicleType: vehicleData.vehicleType
      });

      if (fipeData) {
        setResult({
          plate: null,
          vehicle: {
            brand: fipeData.brand,
            model: fipeData.model,
            year: fipeData.year,
            fuel: fipeData.fuel,
          },
          fipe: fipeData,
          isDemo: false
        });
        setStatus(STATUS.SUCCESS);
      } else {
        setStatus(STATUS.ERROR);
        setErrorMessage('Não foi possível consultar o valor FIPE para este veículo.');
      }
    } catch (err) {
      console.error('[App] Manual search error:', err);
      setStatus(STATUS.ERROR);
      setErrorMessage('Erro ao consultar. Verifique sua internet e tente novamente.');
    }
  }

  function resetSearch() {
    setStatus(STATUS.IDLE);
    setResult(null);
    setErrorMessage('');
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="app-title-fipe">Fipe</span>
            <span className="app-title-facil">Fácil</span>
          </h1>
          <p className="app-subtitle">Consulte o valor FIPE do seu veículo</p>
        </div>
      </header>

      <main className="app-main">
        {status === STATUS.IDLE && (
          <>
            <div className="search-mode-selector">
              <button
                className={`mode-button ${searchMode === SEARCH_MODE.MANUAL ? 'active' : ''}`}
                onClick={() => setSearchMode(SEARCH_MODE.MANUAL)}
              >
                🔍 Busca por Veículo
              </button>
              <button
                className={`mode-button ${searchMode === SEARCH_MODE.PLATE ? 'active' : ''}`}
                onClick={() => setSearchMode(SEARCH_MODE.PLATE)}
              >
                🚗 Busca por Placa
              </button>
            </div>

            {searchMode === SEARCH_MODE.MANUAL && (
              <ManualSearch onSubmit={handleManualSubmit} loading={status === STATUS.LOADING} />
            )}

            {searchMode === SEARCH_MODE.PLATE && (
              <>
                <PlateForm onSubmit={handlePlateSubmit} loading={status === STATUS.LOADING} />
                <DemoSection onPlateSelect={handlePlateSubmit} />
              </>
            )}
          </>
        )}

        {status === STATUS.LOADING && (
          <div className="loading-container" aria-live="polite">
            <div className="loading-spinner" />
            <p className="loading-text">Consultando dados do veículo...</p>
          </div>
        )}

        {status === STATUS.ERROR && (
          <>
            <div className="error-banner" role="alert">
              <span className="error-icon">⚠️</span>
              <p>{errorMessage}</p>
            </div>
            <div className="try-another">
              <button className="try-another-button" onClick={resetSearch}>
                Voltar
              </button>
            </div>
          </>
        )}

        {status === STATUS.SUCCESS && result && (
          <>
            <VehicleResult data={result} />
            <div className="try-another">
              <button className="try-another-button" onClick={resetSearch}>
                Nova Consulta
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Dados da Tabela FIPE fornecidos por <a href="https://fipe.parallelum.com.br" target="_blank" rel="noopener noreferrer">fipe.parallelum.com.br</a></p>
      </footer>
    </div>
  );
}
