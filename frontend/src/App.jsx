import React, { useState } from 'react';
import PlateForm from './components/PlateForm.jsx';
import VehicleResult from './components/VehicleResult.jsx';

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

const ERROR_MESSAGES = {
  404: 'Veículo não encontrado.',
  429: 'Muitas requisições. Aguarde alguns minutos e tente novamente.',
  503: 'Serviço indisponível. Tente novamente.',
  500: 'Erro interno no servidor. Tente novamente.',
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
      const res = await fetch(`/api/consulta?placa=${encodeURIComponent(plate)}`);
      const data = await res.json();

      if (!res.ok) {
        setStatus(STATUS.ERROR);
        setErrorMessage(data.message || ERROR_MESSAGES[res.status] || 'Erro ao consultar. Tente novamente.');
        return;
      }

      setResult(data);
      setStatus(STATUS.SUCCESS);
    } catch (err) {
      setStatus(STATUS.ERROR);
      setErrorMessage('Erro de conexão. Verifique sua internet e tente novamente.');
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
          <VehicleResult data={result} />
        )}
      </main>

      <footer className="app-footer">
        <p>Dados da Tabela FIPE fornecidos por <a href="https://parallelum.com.br/fipe" target="_blank" rel="noopener noreferrer">parallelum.com.br</a></p>
      </footer>
    </div>
  );
}
