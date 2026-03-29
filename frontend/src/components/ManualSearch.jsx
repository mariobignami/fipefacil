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
      setBrands([]);
      setModels([]);
      setYears([]);
      setSelectedBrand('');
      setSelectedModel('');
      setSelectedYear('');

      const brandList = await getBrands(vehicleType);
      setBrands(brandList);
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
      return;
    }

    async function loadModels() {
      setLoadingModels(true);
      setModels([]);
      setYears([]);
      setSelectedModel('');
      setSelectedYear('');

      const modelList = await getModels(selectedBrand, vehicleType);
      setModels(modelList);
      setLoadingModels(false);
    }
    loadModels();
  }, [selectedBrand, vehicleType]);

  // Load years when model changes
  useEffect(() => {
    if (!selectedModel) {
      setYears([]);
      setSelectedYear('');
      return;
    }

    async function loadYears() {
      setLoadingYears(true);
      setYears([]);
      setSelectedYear('');

      const yearList = await getYears(selectedBrand, selectedModel, vehicleType);
      setYears(yearList);

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
