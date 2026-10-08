import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { WhatIfRequest, ScenarioItem, EmissionBreakdown } from '../types';
import { ChartCanvas } from './ChartCanvas';
import { Sliders, RotateCcw, PlusCircle, Trash2, CheckCircle2, Sparkles } from 'lucide-react';

interface ViewNavProps {
  onNavigate: (page: string) => void;
}

const DEFAULT_WHATIF: WhatIfRequest = {
  daily_distance_km: 15,
  electricity_kwh: 200,
  lpg_kg: 9,
  waste_kg_per_week: 6.5,
  diet_type: 'omnivore_low_meat',
  recycling_frequency: 'often',
  ac_hours_per_day: 2.5,
  renewable_pct: 45,
};

export const EcoSimulatorView: React.FC<ViewNavProps> = ({ onNavigate }) => {
  const [baseParams, setBaseParams] = useState<WhatIfRequest>(DEFAULT_WHATIF);
  const [simParams, setSimParams] = useState<WhatIfRequest>(DEFAULT_WHATIF);
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.runWhatIfSimulation>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .runWhatIfSimulation({})
      .then((res) => {
        if (!mounted) return;
        setBaseParams(res.base_parameters);
        setSimParams(res.simulated_parameters);
        setResult(res);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const runSimulation = async (nextParams: WhatIfRequest) => {
    setSimParams(nextParams);
    try {
      const res = await api.runWhatIfSimulation(nextParams);
      setResult(res);
    } catch {
      // ignore transient error
    }
  };

  const handleReset = () => {
    setStatusBanner(null);
    runSimulation(baseParams);
  };

  const handleApplyScenario = async () => {
    setApplying(true);
    setStatusBanner(null);
    try {
      const saved = await api.createScenario({
        name: `Simulated Plan (${new Date().toLocaleDateString()})`,
        description: `What-If Simulation: ${simParams.daily_distance_km} km/d transit, ${simParams.electricity_kwh} kWh/mo (${simParams.renewable_pct}% clean), ${simParams.diet_type.replace(/_/g, ' ')} diet.`,
        parameters: simParams,
      });
      setStatusBanner(
        `Applied & saved scenario "${saved.name}" (${saved.predicted_footprint_kg} kg CO₂e/mo) to Scenario Lab!`
      );
    } finally {
      setApplying(false);
    }
  };

  const comparisonChartConfig = useMemo(() => {
    if (!result?.category_changes) return null;
    const cats = Object.keys(result.category_changes) as Array<keyof EmissionBreakdown>;
    return {
      type: 'bar' as const,
      data: {
        labels: cats,
        datasets: [
          {
            label: 'Current Value (kg CO₂e)',
            data: cats.map((c) => result.category_changes[c].current),
            backgroundColor: '#94a3b8',
            borderRadius: 4,
          },
          {
            label: 'Simulated Value (kg CO₂e)',
            data: cats.map((c) => result.category_changes[c].simulated),
            backgroundColor: '#059669',
            borderRadius: 4,
          },
        ],
      },
      options: {
        plugins: { legend: { position: 'top' as const } },
      },
    };
  }, [result]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-600">
        Initializing What-If Simulator with backend ML model...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">Interactive Counterfactual ML Sandbox</p>
          <h1 className="text-2xl font-bold text-slate-900">What-If Lifestyle Simulator</h1>
          <p className="text-sm text-slate-600 mt-1">
            Adjust any of the 8 lifestyle parameters below. Every change is evaluated by the backend RandomForest model.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="button"
            disabled={applying}
            onClick={handleApplyScenario}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {applying ? 'Saving Scenario...' : 'Apply Scenario'}
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            onClick={() => onNavigate('scenarios')}
            className="px-3 py-1.5 bg-emerald-700 text-white font-semibold rounded-lg"
          >
            View in Scenario Lab
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Columns: 8 Interactive Controls showing Current Value vs Simulated Value */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900">Simulation Parameters</h2>

          {/* 1. Transport distance */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
              <span>1. Transport Distance (km/day)</span>
              <span className="font-mono">
                Current: {baseParams.daily_distance_km} km · Simulated: {simParams.daily_distance_km} km
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={simParams.daily_distance_km}
              onChange={(e) =>
                runSimulation({ ...simParams, daily_distance_km: Number(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>

          {/* 2. Electricity */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
              <span>2. Monthly Electricity (kWh)</span>
              <span className="font-mono">
                Current: {baseParams.electricity_kwh} kWh · Simulated: {simParams.electricity_kwh} kWh
              </span>
            </div>
            <input
              type="range"
              min={40}
              max={800}
              step={10}
              value={simParams.electricity_kwh}
              onChange={(e) =>
                runSimulation({ ...simParams, electricity_kwh: Number(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>

          {/* 3. Renewable energy */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
              <span>3. Renewable Energy Share (%)</span>
              <span className="font-mono">
                Current: {baseParams.renewable_pct}% · Simulated: {simParams.renewable_pct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={simParams.renewable_pct}
              onChange={(e) =>
                runSimulation({ ...simParams, renewable_pct: Number(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>

          {/* 4. LPG */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
              <span>4. Monthly LPG / Cooking Fuel (kg)</span>
              <span className="font-mono">
                Current: {baseParams.lpg_kg} kg · Simulated: {simParams.lpg_kg} kg
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={0.5}
              value={simParams.lpg_kg}
              onChange={(e) => runSimulation({ ...simParams, lpg_kg: Number(e.target.value) })}
              className="w-full accent-emerald-600"
            />
          </div>

          {/* 5. Waste */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
              <span>5. Weekly Solid Waste (kg/week)</span>
              <span className="font-mono">
                Current: {baseParams.waste_kg_per_week} kg · Simulated: {simParams.waste_kg_per_week} kg
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={0.5}
              value={simParams.waste_kg_per_week}
              onChange={(e) =>
                runSimulation({ ...simParams, waste_kg_per_week: Number(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>

          {/* 6. AC usage */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
              <span>6. Air Conditioner Runtime (hrs/day)</span>
              <span className="font-mono">
                Current: {baseParams.ac_hours_per_day} hrs · Simulated: {simParams.ac_hours_per_day} hrs
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={16}
              step={0.5}
              value={simParams.ac_hours_per_day}
              onChange={(e) =>
                runSimulation({ ...simParams, ac_hours_per_day: Number(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>

          {/* 7. Diet & 8. Recycling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                7. Diet (Current: {baseParams.diet_type.replace(/_/g, ' ')})
              </label>
              <select
                value={simParams.diet_type}
                onChange={(e) =>
                  runSimulation({
                    ...simParams,
                    diet_type: e.target.value as WhatIfRequest['diet_type'],
                  })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="vegan">Vegan</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="pescatarian">Pescatarian</option>
                <option value="omnivore_low_meat">Omnivore (Low Meat)</option>
                <option value="omnivore_high_meat">Omnivore (Daily Meat)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                8. Recycling (Current: {baseParams.recycling_frequency})
              </label>
              <select
                value={simParams.recycling_frequency}
                onChange={(e) =>
                  runSimulation({
                    ...simParams,
                    recycling_frequency: e.target.value as WhatIfRequest['recycling_frequency'],
                  })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="always">Always</option>
                <option value="often">Often</option>
                <option value="sometimes">Sometimes</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right 6 Columns: Live ML Output & Category Changes */}
        <div className="lg:col-span-6 space-y-6">
          {result && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-[11px] text-slate-500">Current Prediction</span>
                  <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                    {result.current_prediction} kg
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <span className="text-[11px] text-emerald-800">Simulated Prediction</span>
                  <p className="text-xl font-bold font-mono tabular-nums text-emerald-950 mt-1">
                    {result.simulated_prediction} kg
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-[11px] text-slate-500">Absolute Reduction</span>
                  <p className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                    {result.absolute_reduction >= 0 ? `-${result.absolute_reduction}` : `+${Math.abs(result.absolute_reduction)}`} kg
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-[11px] text-slate-500">Percentage Change</span>
                  <p className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                    {result.percentage_reduction >= 0 ? `-${result.percentage_reduction}` : `+${Math.abs(result.percentage_reduction)}`}%
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Category Emission Changes (Current vs. Simulated)
                </h3>
                {comparisonChartConfig && (
                  <ChartCanvas config={comparisonChartConfig} height={240} />
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Updated Recommendations for Simulated Scenario
                </h3>
                {result.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg text-xs flex justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{rec.title}</p>
                      <p className="text-slate-600 mt-0.5">{rec.reason}</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-700 shrink-0">
                      -{rec.estimated_reduction_kg} kg
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const EcoScenarioLabView: React.FC<ViewNavProps> = () => {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [baseline, setBaseline] = useState<{
    predicted_footprint_kg: number;
    eco_score: number;
    emission_breakdown: EmissionBreakdown;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [params, setParams] = useState<WhatIfRequest>(DEFAULT_WHATIF);

  const loadScenarios = () => {
    setLoading(true);
    api
      .getScenarios()
      .then((res) => {
        setScenarios(res.scenarios);
        setBaseline(res.current_baseline);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const handlePresetFill = (preset: 'reduced_transport' | 'energy_efficient' | 'sustainable_all') => {
    if (preset === 'reduced_transport') {
      setName('Reduced Transport Commute');
      setDescription('Switch to public transit / cycling with 8 km/day daily travel.');
      setParams({ ...DEFAULT_WHATIF, daily_distance_km: 8, renewable_pct: 35 });
    } else if (preset === 'energy_efficient') {
      setName('Energy Efficient Solar Home');
      setDescription('80% renewable electricity, 150 kWh grid draw, 1.5 hrs/day AC.');
      setParams({
        ...DEFAULT_WHATIF,
        electricity_kwh: 150,
        renewable_pct: 80,
        ac_hours_per_day: 1.5,
      });
    } else {
      setName('Full Sustainable Lifestyle');
      setDescription('Plant-based diet, 85% renewable power, low commute, always recycling.');
      setParams({
        daily_distance_km: 7,
        electricity_kwh: 140,
        lpg_kg: 6.5,
        waste_kg_per_week: 4,
        diet_type: 'vegan',
        recycling_frequency: 'always',
        ac_hours_per_day: 1.0,
        renewable_pct: 85,
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.createScenario({ name, description, parameters: params });
      setName('');
      setDescription('');
      loadScenarios();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteScenario(id);
    loadScenarios();
  };

  const compareChartConfig = useMemo(() => {
    const labels: string[] = [];
    const footprints: number[] = [];
    const transportImpacts: number[] = [];
    const energyImpacts: number[] = [];
    const wasteImpacts: number[] = [];

    if (baseline) {
      labels.push('Current Lifestyle');
      footprints.push(baseline.predicted_footprint_kg);
      transportImpacts.push(baseline.emission_breakdown.Transportation);
      energyImpacts.push(baseline.emission_breakdown.Energy);
      wasteImpacts.push(baseline.emission_breakdown.Waste);
    }

    scenarios.forEach((s) => {
      labels.push(s.name);
      footprints.push(s.predicted_footprint_kg);
      transportImpacts.push(s.transport_impact_kg);
      energyImpacts.push(s.energy_impact_kg);
      wasteImpacts.push(s.waste_impact_kg);
    });

    if (labels.length === 0) return null;

    return {
      type: 'bar' as const,
      data: {
        labels,
        datasets: [
          {
            label: 'Total Footprint (kg CO₂e)',
            data: footprints,
            backgroundColor: '#059669',
            borderRadius: 4,
          },
          {
            label: 'Transport Impact (kg)',
            data: transportImpacts,
            backgroundColor: '#0284c7',
            borderRadius: 4,
          },
          {
            label: 'Energy Impact (kg)',
            data: energyImpacts,
            backgroundColor: '#f59e0b',
            borderRadius: 4,
          },
          {
            label: 'Waste Impact (kg)',
            data: wasteImpacts,
            backgroundColor: '#6366f1',
            borderRadius: 4,
          },
        ],
      },
      options: {
        plugins: { legend: { position: 'top' as const } },
      },
    };
  }, [baseline, scenarios]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-xs font-semibold text-emerald-700">Multi-Pathway Sustainability Comparison</p>
        <h1 className="text-2xl font-bold text-slate-900">Scenario Lab</h1>
        <p className="text-sm text-slate-600 mt-1">
          Create, save, and compare custom sustainability scenarios calculated dynamically by the backend ML engine.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Scenario Form */}
        <form
          onSubmit={handleCreate}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Create New Scenario</h2>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handlePresetFill('reduced_transport')}
                className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
              >
                + Transit
              </button>
              <button
                type="button"
                onClick={() => handlePresetFill('energy_efficient')}
                className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
              >
                + Energy
              </button>
              <button
                type="button"
                onClick={() => handlePresetFill('sustainable_all')}
                className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded"
              >
                + Net-Zero
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Scenario Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Reduced Transport, Energy Efficient"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief notes on lifestyle changes"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Daily Distance ({params.daily_distance_km} km)
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={params.daily_distance_km}
                onChange={(e) => setParams({ ...params, daily_distance_km: Number(e.target.value) })}
                className="w-full px-3 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Electricity ({params.electricity_kwh} kWh)
              </label>
              <input
                type="number"
                min={20}
                max={2000}
                value={params.electricity_kwh}
                onChange={(e) => setParams({ ...params, electricity_kwh: Number(e.target.value) })}
                className="w-full px-3 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Renewable Share ({params.renewable_pct}%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={params.renewable_pct}
                onChange={(e) => setParams({ ...params, renewable_pct: Number(e.target.value) })}
                className="w-full px-3 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Weekly Waste ({params.waste_kg_per_week} kg)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={params.waste_kg_per_week}
                onChange={(e) => setParams({ ...params, waste_kg_per_week: Number(e.target.value) })}
                className="w-full px-3 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            {creating ? 'Calculating & Saving...' : 'Calculate & Save Scenario'}
          </button>
        </form>

        {/* Right 7 Columns: Comparison Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Scenario Comparison Chart</h2>
          <p className="text-xs text-slate-500 mb-4">
            Comparing Total Footprint, Transport Impact, Energy Impact, and Waste Impact across saved scenarios
          </p>
          {loading ? (
            <p className="text-xs text-slate-500 py-12 text-center">Loading scenarios...</p>
          ) : compareChartConfig ? (
            <ChartCanvas config={compareChartConfig} height={270} />
          ) : (
            <p className="text-xs text-slate-500 py-12 text-center">
              No scenarios available yet. Create a scenario on the left to compare.
            </p>
          )}
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">Saved Scenarios Comparison Matrix</h2>
        {scenarios.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">
            No custom scenarios saved yet. Use the form above or click one of the template presets (+ Transit, + Energy, + Net-Zero) to run an ML comparison.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4">Scenario Name</th>
                  <th className="py-2.5 px-3 text-right">Carbon Footprint</th>
                  <th className="py-2.5 px-3 text-right">Reduction</th>
                  <th className="py-2.5 px-3 text-right">Eco Score</th>
                  <th className="py-2.5 px-3 text-right">Transport Impact</th>
                  <th className="py-2.5 px-3 text-right">Energy Impact</th>
                  <th className="py-2.5 px-3 text-right">Waste Impact</th>
                  <th className="py-2.5 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {baseline && (
                  <tr className="bg-slate-50/80 font-medium">
                    <td className="py-3 pr-4 text-slate-900">Current Lifestyle (Baseline)</td>
                    <td className="py-3 px-3 text-right font-mono">{baseline.predicted_footprint_kg} kg</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">0%</td>
                    <td className="py-3 px-3 text-right font-mono">{baseline.eco_score}/100</td>
                    <td className="py-3 px-3 text-right font-mono">
                      {baseline.emission_breakdown.Transportation} kg
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {baseline.emission_breakdown.Energy} kg
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {baseline.emission_breakdown.Waste} kg
                    </td>
                    <td className="py-3 pl-3 text-right text-slate-400">Baseline</td>
                  </tr>
                )}
                {scenarios.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <p className="font-bold text-slate-900">{s.name}</p>
                      <p className="text-slate-500">{s.description}</p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {s.predicted_footprint_kg} kg
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                      -{s.reduction_vs_current_kg} kg ({s.reduction_vs_current_pct}%)
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-800">
                      {s.eco_score}/100
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{s.transport_impact_kg} kg</td>
                    <td className="py-3 px-3 text-right font-mono">{s.energy_impact_kg} kg</td>
                    <td className="py-3 px-3 text-right font-mono">{s.waste_impact_kg} kg</td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete Scenario"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
