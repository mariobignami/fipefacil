import React, { useState } from 'react';
import PlateForm from './components/PlateForm.jsx';
import VehicleResult from './components/VehicleResult.jsx';
import DemoSection from './components/DemoSection.jsx';
import { isDemoPlate, getDemoPlateData } from './services/mockPlateData.js';
import { searchFipeByVehicleData } from './services/fipeService.js';

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

  async function handleSubmit(plate) {
    setStatus(STATUS.LOADING);
    setResult(null);
    setErrorMessage('');

    try {
      let vehicleData = null;
      let fipeData = null;
      let isDemo = false;

      // Check if this is a demo plate
      if (isDemoPlate(plate)) {
        vehicleData = getDemoPlateData(plate);
        isDemo = true;
      }

      // If we have vehicle data (from demo), search FIPE
      if (vehicleData) {
        fipeData = await searchFipeByVehicleData({
          brand: vehicleData.brand,
          model: vehicleData.model,
          year: vehicleData.year,
          vehicleType: vehicleData.vehicleType || 'cars'
        });
      }

      // If we got data, show it
      if (vehicleData || fipeData) {
        setResult({
          plate,
          vehicle: vehicleData,
          fipe: fipeData,
          isDemo
        });
        setStatus(STATUS.SUCCESS);
      } else {
        setStatus(STATUS.ERROR);
        setErrorMessage(
          'Não foi possível encontrar dados para esta placa. ' +
          'Use uma das placas de exemplo para testar o aplicativo.'
        );
      }
    } catch (err) {
      console.error('[App] Error:', err);
      setStatus(STATUS.ERROR);
      setErrorMessage('Erro ao consultar. Verifique sua internet e tente novamente.');
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="app-title-fipe">Fipe</span>
            <span className="app-title-facil">Fácil</span>
          </h1>
          <p className="app-subtitle">Consulte o valor FIPE do seu veículo pela placa</p>
        </div>
      </header>

      <main className="app-main">
        <PlateForm onSubmit={handleSubmit} loading={status === STATUS.LOADING} />

        {status === STATUS.IDLE && (
          <DemoSection onPlateSelect={handleSubmit} />
        )}

        {status === STATUS.LOADING && (
          <div className="loading-container" aria-live="polite">
            <div className="loading-spinner" />
            <p className="loading-text">Consultando dados do veículo...</p>
          </div>
        )}

        {status === STATUS.ERROR && (
          <div className="error-banner" role="alert">
            <span className="error-icon">⚠️</span>
            <p>{errorMessage}</p>
          </div>
        )}

        {status === STATUS.SUCCESS && result && (
          <>
            <VehicleResult data={result} />
            <div className="try-another">
              <button
                className="try-another-button"
                onClick={() => {
                  setStatus(STATUS.IDLE);
                  setResult(null);
                  setErrorMessage('');
                }}
              >
                Consultar outra placa
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
