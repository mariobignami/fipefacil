import React, { useState, useEffect } from 'react';
import { getBrands, getModels, getYears } from '../services/fipeService.js';

export default function ManualSearch({ onSubmit, loading }) {
  const [vehicleType, setVehicleType] = useState('cars');
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);

  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);

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

    onSubmit({
      brandCode: selectedBrand,
      modelCode: selectedModel,
      yearCode: selectedYear,
      brand: brandData?.name || '',
      model: modelData?.name || '',
      year: yearData?.name || '',
      vehicleType
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
        <select
          id="brand"
          className="form-select"
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          disabled={loading || loadingBrands || brands.length === 0}
        >
          <option value="">
            {loadingBrands ? 'Carregando...' : 'Selecione a marca'}
          </option>
          {brands.map((brand) => (
            <option key={brand.code} value={brand.code}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="model">Modelo</label>
        <select
          id="model"
          className="form-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={loading || loadingModels || !selectedBrand || models.length === 0}
        >
          <option value="">
            {loadingModels ? 'Carregando...' : selectedBrand ? 'Selecione o modelo' : 'Selecione a marca primeiro'}
          </option>
          {models.map((model) => (
            <option key={model.code} value={model.code}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="year">Ano</label>
        <select
          id="year"
          className="form-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          disabled={loading || loadingYears || !selectedModel || years.length === 0}
        >
          <option value="">
            {loadingYears ? 'Carregando...' : selectedModel ? 'Selecione o ano' : 'Selecione o modelo primeiro'}
          </option>
          {years.map((year) => (
            <option key={year.code} value={year.code}>
              {year.name}
            </option>
          ))}
        </select>
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
