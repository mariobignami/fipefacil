import React, { useState, useEffect, useRef } from 'react';
import { getYears } from '../services/fipeService.js';

/**
 * QuickSearch — shown in the result view to let the user change model or year
 * without going back to the full search form.
 */
export default function QuickSearch({ vehicleContext, onSearch, loading }) {
  const [selectedModel, setSelectedModel] = useState(vehicleContext?.modelCode || '');
  const [selectedYear, setSelectedYear] = useState(vehicleContext?.yearCode || '');
  const [years, setYears] = useState(vehicleContext?.years || []);
  const [yearsLoading, setYearsLoading] = useState(false);

  // Keep a ref so the years-loading effect always reads the latest vehicleContext
  // without needing it as a dependency (avoids re-running on unrelated context updates).
  const vehicleContextRef = useRef(vehicleContext);
  useEffect(() => {
    vehicleContextRef.current = vehicleContext;
  }, [vehicleContext]);

  // Sync with incoming vehicleContext (e.g. when a new search completes)
  useEffect(() => {
    setSelectedModel(vehicleContext?.modelCode || '');
    setSelectedYear(vehicleContext?.yearCode || '');
    setYears(vehicleContext?.years || []);
  }, [vehicleContext]);

  // Reload years whenever model selection changes
  useEffect(() => {
    if (!selectedModel) return;
    const ctx = vehicleContextRef.current;
    // If same as context model, reuse existing years (no fetch needed)
    if (selectedModel === ctx?.modelCode) {
      setYears(ctx?.years || []);
      setSelectedYear(ctx?.yearCode || '');
      return;
    }
    // Otherwise fetch years for the newly selected model
    let cancelled = false;
    async function loadYears() {
      setYearsLoading(true);
      setSelectedYear('');
      try {
        const yearList = await getYears(
          ctx?.brandCode,
          selectedModel,
          ctx?.vehicleType
        );
        if (!cancelled) {
          setYears(yearList);
        }
      } catch (err) {
        console.error('[QuickSearch] Error loading years:', err);
      } finally {
        if (!cancelled) setYearsLoading(false);
      }
    }
    loadYears();
    return () => { cancelled = true; };
  }, [selectedModel]); // vehicleContext values accessed via ref to avoid stale closure

  function handleSearch() {
    if (!selectedModel || !selectedYear || loading || yearsLoading) return;
    const ctx = vehicleContextRef.current;
    const modelData = (ctx?.models || []).find(
      (m) => String(m.code) === String(selectedModel)
    );
    const yearData = years.find((y) => y.code === selectedYear);
    onSearch({
      ...ctx,
      modelCode: selectedModel,
      yearCode: selectedYear,
      model: modelData?.name || ctx?.model || '',
      year: yearData?.name || ctx?.year || '',
      years,
    });
  }

  const canSearch =
    selectedModel &&
    selectedYear &&
    !loading &&
    !yearsLoading &&
    (selectedModel !== vehicleContext?.modelCode || selectedYear !== vehicleContext?.yearCode);

  return (
    <div className="quick-search-bar">
      <span className="quick-search-label">Ajustar busca:</span>

      <div className="quick-search-brand">{vehicleContext?.brand || ''}</div>

      <select
        className="quick-search-select"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        disabled={loading}
        aria-label="Selecione o modelo"
      >
        {(vehicleContext?.models || []).map((m) => (
          <option key={m.code} value={String(m.code)}>
            {m.name}
          </option>
        ))}
      </select>

      <select
        className="quick-search-select"
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        disabled={loading || yearsLoading || !selectedModel}
        aria-label="Selecione o ano"
      >
        {yearsLoading ? (
          <option>Carregando...</option>
        ) : (
          years.map((y) => (
            <option key={y.code} value={y.code}>
              {y.name}
            </option>
          ))
        )}
      </select>

      <button
        className="quick-search-btn submit-btn"
        onClick={handleSearch}
        disabled={!canSearch}
      >
        {loading ? <span className="spinner" aria-label="Carregando..." /> : 'Consultar'}
      </button>
    </div>
  );
}
