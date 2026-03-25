import React, { useState } from 'react';
import ManualSearch from './components/ManualSearch.jsx';
import VehicleResult from './components/VehicleResult.jsx';
import QuickSearch from './components/QuickSearch.jsx';
import { searchFipeByCodes, fetchPriceHistory } from './services/fipeService.js';

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function App() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [vehicleContext, setVehicleContext] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function runSearch(vehicleData) {
    setStatus(STATUS.LOADING);
    setResult(null);
    setErrorMessage('');
    setPriceHistory([]);

    try {
      const fipeData = await searchFipeByCodes({
        brandCode: vehicleData.brandCode,
        modelCode: vehicleData.modelCode,
        yearCode: vehicleData.yearCode,
        vehicleType: vehicleData.vehicleType,
      });

      if (fipeData) {
        setResult({
          vehicle: {
            brand: fipeData.brand,
            model: fipeData.model,
            year: fipeData.year,
            fuel: fipeData.fuel,
          },
          fipe: fipeData,
        });
        setVehicleContext(vehicleData);
        setStatus(STATUS.SUCCESS);

        // Fetch price history in the background
        setHistoryLoading(true);
        fetchPriceHistory(
          vehicleData.brandCode,
          vehicleData.modelCode,
          vehicleData.yearCode,
          vehicleData.vehicleType
        ).then((history) => {
          setPriceHistory(history);
          setHistoryLoading(false);
        }).catch(() => {
          setHistoryLoading(false);
        });
      } else {
        setStatus(STATUS.ERROR);
        setErrorMessage('Não foi possível consultar o valor FIPE para este veículo.');
      }
    } catch (err) {
      console.error('[App] Search error:', err);
      setStatus(STATUS.ERROR);
      setErrorMessage('Erro ao consultar. Verifique sua internet e tente novamente.');
    }
  }

  function handleManualSubmit(vehicleData) {
    return runSearch(vehicleData);
  }

  function handleQuickSearch(vehicleData) {
    return runSearch(vehicleData);
  }

  function resetSearch() {
    setStatus(STATUS.IDLE);
    setResult(null);
    setErrorMessage('');
    setVehicleContext(null);
    setPriceHistory([]);
    setHistoryLoading(false);
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
          <ManualSearch onSubmit={handleManualSubmit} loading={status === STATUS.LOADING} />
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
            {vehicleContext && vehicleContext.models && vehicleContext.models.length > 0 && (
              <QuickSearch
                vehicleContext={vehicleContext}
                onSearch={handleQuickSearch}
                loading={status === STATUS.LOADING}
              />
            )}
            <VehicleResult
              data={result}
              priceHistory={priceHistory}
              historyLoading={historyLoading}
            />
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
