import React, { useState, useEffect } from 'react';
import { getBrands, getModels, getYears, getReferences } from '../services/fipeService.js';
import SearchableSelect from './SearchableSelect.jsx';

export default function ManualSearch({ onSubmit, loading }) {
  const [vehicleType, setVehicleType] = useState('cars');
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);
  const [references, setReferences] = useState([]);

  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedReference, setSelectedReference] = useState('');

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingReferences, setLoadingReferences] = useState(false);

  const [errorBrands, setErrorBrands] = useState(false);
  const [errorModels, setErrorModels] = useState(false);
  const [errorYears, setErrorYears] = useState(false);

  // Retry loading brands
  function retryLoadBrands() {
    setVehicleType(vehicleType); // This will trigger the useEffect
  }

  // Load reference months on mount
  useEffect(() => {
    async function loadReferences() {
      setLoadingReferences(true);
      const refList = await getReferences();
      setReferences(refList);
      setLoadingReferences(false);
    }
    loadReferences();
  }, []);

  // Load brands when vehicle type changes
  useEffect(() => {
    async function loadBrands() {
      setLoadingBrands(true);
      setErrorBrands(false);
      setBrands([]);
      setModels([]);
      setYears([]);
      setSelectedBrand('');
      setSelectedModel('');
      setSelectedYear('');

      const brandList = await getBrands(vehicleType);
      setBrands(brandList);
      setErrorBrands(brandList.length === 0);
      setLoadingBrands(false);
    }
    loadBrands();
  }, [vehicleType]);

  // Load models when brand changes
  useEffect(() => {
    if (!selectedBrand) {
      setModels([]);
      setYears([]);
      setSelectedModel('');
      setSelectedYear('');
      setErrorModels(false);
      return;
    }

    async function loadModels() {
      setLoadingModels(true);
      setErrorModels(false);
      setModels([]);
      setYears([]);
      setSelectedModel('');
      setSelectedYear('');

      const modelList = await getModels(selectedBrand, vehicleType);
      setModels(modelList);
      setErrorModels(modelList.length === 0);
      setLoadingModels(false);
    }
    loadModels();
  }, [selectedBrand, vehicleType]);

  // Load years when model changes
  useEffect(() => {
    if (!selectedModel) {
      setYears([]);
      setSelectedYear('');
      setErrorYears(false);
      return;
    }

    async function loadYears() {
      setLoadingYears(true);
      setErrorYears(false);
      setYears([]);
      setSelectedYear('');

      const yearList = await getYears(selectedBrand, selectedModel, vehicleType);
      setYears(yearList);
      setErrorYears(yearList.length === 0);

      // Auto-select year if only one option is available
      if (yearList.length === 1) {
        setSelectedYear(yearList[0].code);
      }

      setLoadingYears(false);
    }
    loadYears();
  }, [selectedModel, selectedBrand, vehicleType]);

  function handleSubmit(e) {
    e.preventDefault();

    if (!selectedBrand || !selectedModel || !selectedYear) {
      return;
    }

    const brandData = brands.find(b => b.code === parseInt(selectedBrand));
    const modelData = models.find(m => m.code === parseInt(selectedModel));
    const yearData = years.find(y => y.code === selectedYear);
    const referenceData = selectedReference ? references.find(r => r.code === parseInt(selectedReference)) : null;

    onSubmit({
      brandCode: selectedBrand,
      modelCode: selectedModel,
      yearCode: selectedYear,
      referenceCode: selectedReference || null,
      brand: brandData?.name || '',
      model: modelData?.name || '',
      year: yearData?.name || '',
      referenceMonth: referenceData?.month || null,
      vehicleType,
      models,
      years,
    });
  }

  const canSubmit = selectedBrand && selectedModel && selectedYear && !loading;

  return (
    <form className="manual-search" onSubmit={handleSubmit}>
      <h3 className="manual-search-title">Busca Manual por Veículo</h3>
      <p className="manual-search-description">
        Selecione o tipo, marca, modelo e ano para consultar o valor FIPE
      </p>

      {errorBrands && (
        <div className="error-banner" role="alert" style={{ marginBottom: '1rem' }}>
          <span className="error-icon">⚠️</span>
          <p style={{ marginBottom: '0.5rem' }}>
            Não foi possível carregar as marcas. Verifique sua conexão com a internet.
          </p>
          <button
            type="button"
            className="submit-btn"
            onClick={retryLoadBrands}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            Tentar Novamente
          </button>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="vehicle-type">Tipo de Veículo</label>
        <select
          id="vehicle-type"
          className="form-select"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
          disabled={loading}
        >
          <option value="cars">Carros</option>
          <option value="motorcycles">Motos</option>
          <option value="trucks">Caminhões</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="brand">Marca</label>
        <SearchableSelect
          id="brand"
          value={selectedBrand}
          onChange={setSelectedBrand}
          options={brands}
          disabled={loading || loadingBrands || brands.length === 0}
          placeholder={loadingBrands ? 'Carregando...' : 'Selecione a marca'}
          label="Marca"
        />
      </div>

      <div className="form-group">
        <label htmlFor="model">Modelo</label>
        <SearchableSelect
          id="model"
          value={selectedModel}
          onChange={setSelectedModel}
          options={models}
          disabled={loading || loadingModels || !selectedBrand || models.length === 0}
          placeholder={loadingModels ? 'Carregando...' : selectedBrand ? 'Selecione o modelo' : 'Selecione a marca primeiro'}
          label="Modelo"
        />
      </div>

      <div className="form-group">
        <label htmlFor="year">Ano</label>
        <SearchableSelect
          id="year"
          value={selectedYear}
          onChange={setSelectedYear}
          options={years}
          disabled={loading || loadingYears || !selectedModel || years.length === 0}
          placeholder={loadingYears ? 'Carregando...' : selectedModel ? 'Selecione o ano' : 'Selecione o modelo primeiro'}
          label="Ano"
        />
      </div>

      <div className="form-group">
        <label htmlFor="reference">Mês de Referência (Opcional)</label>
        <SearchableSelect
          id="reference"
          value={selectedReference}
          onChange={setSelectedReference}
          options={references}
          disabled={loading || loadingReferences}
          placeholder={loadingReferences ? 'Carregando...' : 'Mês atual (deixe em branco para consultar o mês atual)'}
          label="Mês de Referência"
        />
      </div>

      <button
        type="submit"
        className="submit-btn manual-search-btn"
        disabled={!canSubmit}
      >
        {loading ? (
          <span className="spinner" aria-label="Carregando..." />
        ) : (
          'Consultar Valor FIPE'
        )}
      </button>
    </form>
  );
}
