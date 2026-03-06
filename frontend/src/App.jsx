import React, { useState } from 'react';
import PlateForm from './components/PlateForm.jsx';
import VehicleResult from './components/VehicleResult.jsx';
import DemoSection from './components/DemoSection.jsx';
import { consultarPlaca } from './services/consultaService.js';

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
