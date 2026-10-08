import React, { useState, useEffect, useMemo } from 'react';
import {
  CalculatorInput,
  EmissionBreakdown,
  FeatureImportanceItem,
  ModelMetricsSummary,
  FootprintRecord,
} from '../types';
import { api } from '../lib/api';
import { ChartCanvas } from './ChartCanvas';
import {
  User,
  Car,
  Zap,
  Utensils,
  Trash2,
  Wind,
  ChevronDown,
  ChevronUp,
  Save,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface EcoCalculatorViewProps {
  userName: string;
  userCity?: string;
  userAge?: number;
  userHousehold?: number;
  onAnalysisComplete: (record: FootprintRecord) => void;
  onNavigate: (page: string) => void;
}

const DEFAULT_CALCULATOR_STATE: CalculatorInput = {
  name: '',
  age: 26,
  city: '',
  household_size: 3,
  primary_transport: 'car_petrol',
  daily_distance_km: 22,
  travel_days_per_week: 5,
  secondary_transport: 'public_transit',
  electricity_kwh: 240,
  renewable_pct: 25,
  lpg_kg: 10.5,
  solar_installed: 'no',
  diet_type: 'omnivore_low_meat',
  food_waste_level: 'low',
  local_food_pct: 45,
  outside_meals_per_week: 2,
  waste_kg_per_week: 7.5,
  recycling_frequency: 'often',
  composting: 'no',
  single_use_plastic: 'moderate',
  ac_hours_per_day: 3.5,
  water_liters_per_day: 155,
  clothes_buying_frequency: 'quarterly',
  ewaste_disposal: 'certified_recycler',
  flights_short_haul_yearly: 0,
  flights_long_haul_yearly: 0,
  home_area_sqft: 1050,
  green_appliances_pct: 55,
};

export const EcoCalculatorView: React.FC<EcoCalculatorViewProps> = ({
  userName,
  userCity,
  userAge,
  userHousehold,
  onAnalysisComplete,
  onNavigate,
}) => {
  const [formData, setFormData] = useState<CalculatorInput>({
    ...DEFAULT_CALCULATOR_STATE,
    name: userName || '',
    city: userCity || '',
    age: userAge || 26,
    household_size: userHousehold || 3,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [previewResult, setPreviewResult] = useState<{
    predicted_footprint_kg: number;
    current_footprint_kg: number | null;
    eco_score: number;
    risk_category: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Critical Risk';
    top_contributor: keyof EmissionBreakdown;
    change_from_previous_pct: number | null;
    emission_breakdown: EmissionBreakdown;
    feature_importances: FeatureImportanceItem[];
    model_info: ModelMetricsSummary;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getCalculatorDraft()
      .then((res) => {
        if (!mounted) return;
        const initialInput = res.draft || res.latest_record?.inputs || {
          ...DEFAULT_CALCULATOR_STATE,
          name: userName || 'Environmental User',
          city: userCity || 'Metro City',
          age: userAge || 26,
          household_size: userHousehold || 3,
        };
        setFormData(initialInput);
        return api.predictFootprint(initialInput);
      })
      .then((pred) => {
        if (mounted && pred) setPreviewResult(pred);
      })
      .catch(() => {
        // Ignore preview error on first load
      })
      .finally(() => {
        if (mounted) setLoadingInitial(false);
      });
    return () => {
      mounted = false;
    };
  }, [userName, userCity, userAge, userHousehold]);

  const updateField = <K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setFeedbackMsg(null);
    try {
      await api.saveCalculatorDraft(formData);
      const preview = await api.predictFootprint(formData);
      setPreviewResult(preview);
      setFeedbackMsg({
        type: 'success',
        text: 'Lifestyle draft saved and AI preview updated from backend ML model.',
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Failed to save calculator draft.',
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    setFeedbackMsg(null);
    try {
      const response = await api.calculateFootprint(formData);
      setPreviewResult({
        predicted_footprint_kg: response.record.predicted_footprint_kg,
        current_footprint_kg: response.current_footprint_kg,
        eco_score: response.record.eco_score,
        risk_category: response.record.risk_category,
        top_contributor: response.record.top_contributor,
        change_from_previous_pct: response.record.change_from_previous_pct,
        emission_breakdown: response.record.emission_breakdown,
        feature_importances: response.record.feature_importances,
        model_info: response.record.model_info,
      });
      onAnalysisComplete(response.record);
      setFeedbackMsg({
        type: 'success',
        text: `Carbon footprint analysis saved (${response.record.predicted_footprint_kg} kg CO₂e/month, Eco Score ${response.record.eco_score}/100). Digital Twin & Dashboard updated!`,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Validation or ML analysis error.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const breakdownChartConfig = useMemo(() => {
    if (!previewResult) return null;
    const bd = previewResult.emission_breakdown;
    const labels = Object.keys(bd);
    const values = Object.values(bd);
    return {
      type: 'doughnut' as const,
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              '#059669',
              '#10b981',
              '#34d399',
              '#0d9488',
              '#f59e0b',
              '#0284c7',
              '#6366f1',
              '#64748b',
            ],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: {
              boxWidth: 10,
              font: { size: 11, family: 'Plus Jakarta Sans' },
              color: '#1e293b',
            },
          },
        },
      },
    };
  }, [previewResult]);

  return (
    <div className="space-y-6">
      {/* Header Banner matching Screenshot Reference */}
      <div className="bg-white border border-emerald-100 rounded-xl p-6 shadow-xs">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold text-emerald-700 tracking-wide mb-1">
            Environmental Telemetry & ML Prediction Engine
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Calculate Your Environmental Footprint
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Tell us about your lifestyle. Our AI will estimate your carbon footprint and identify the biggest opportunities for reduction.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-xl border text-sm ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          {feedbackMsg.type === 'success' && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('twin')}
                className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap"
              >
                View My Twin
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleAnalyze} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Structured 01–06 Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* 01 Personal Profile */}
          <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold flex items-center justify-center">
                01
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">01. Personal Profile</h2>
                <p className="text-xs text-slate-500">Demographic & household scaling parameters</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Age (Years)</label>
                <input
                  type="number"
                  min={10}
                  max={110}
                  required
                  value={formData.age}
                  onChange={(e) => updateField('age', Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">City / Climate Region</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="e.g., Bengaluru, Austin, Berlin"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Household Size (Members)
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  required
                  value={formData.household_size}
                  onChange={(e) => updateField('household_size', Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>
          </section>

          {/* 02 Transportation */}
          <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold flex items-center justify-center">
                02
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">02. Transportation</h2>
                <p className="text-xs text-slate-500">Daily commute vehicles, distance, and transit frequency</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Primary Transport</label>
                <select
                  value={formData.primary_transport}
                  onChange={(e) =>
                    updateField('primary_transport', e.target.value as CalculatorInput['primary_transport'])
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="car_petrol">Petrol Car (Solo/Private)</option>
                  <option value="car_diesel">Diesel Car / SUV</option>
                  <option value="car_ev">Electric Vehicle (EV)</option>
                  <option value="motorbike">Two-Wheeler / Motorbike</option>
                  <option value="public_transit">Public Transit (Metro / Bus / Rail)</option>
                  <option value="bicycle">Bicycle / E-Bike</option>
                  <option value="walking">Walking</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Distance Travelled Per Day (km)
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  step={0.5}
                  required
                  value={formData.daily_distance_km}
                  onChange={(e) => updateField('daily_distance_km', Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Days Travelled Per Week (0–7)
                </label>
                <input
                  type="number"
                  min={0}
                  max={7}
                  required
                  value={formData.travel_days_per_week}
                  onChange={(e) => updateField('travel_days_per_week', Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Secondary Transport</label>
                <select
                  value={formData.secondary_transport}
                  onChange={(e) =>
                    updateField('secondary_transport', e.target.value as CalculatorInput['secondary_transport'])
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="none">None</option>
                  <option value="public_transit">Public Transit (Bus / Metro)</option>
                  <option value="car_petrol">Weekend Petrol Car / Rideshare</option>
                  <option value="motorbike">Motorbike / Scooter</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="walking">Walking</option>
                </select>
              </div>
            </div>
          </section>

          {/* 03 Energy Consumption */}
          <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold flex items-center justify-center">
                03
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">03. Energy Consumption</h2>
                <p className="text-xs text-slate-500">Household electricity, clean grid share, cooking fuel, and solar</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Monthly Electricity Usage (kWh)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  required
                  value={formData.electricity_kwh}
                  onChange={(e) => updateField('electricity_kwh', Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Renewable Energy Usage ({formData.renewable_pct}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formData.renewable_pct}
                  onChange={(e) => updateField('renewable_pct', Number(e.target.value))}
                  className="w-full accent-emerald-600 mt-2"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>0% Grid Coal</span>
                  <span>50% Mixed</span>
                  <span>100% Clean</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  LPG / Cooking Fuel (kg / month)
                </label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={0.5}
                  required
                  value={formData.lpg_kg}
                  onChange={(e) => updateField('lpg_kg', Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Solar Panels Installed
                </label>
                <select
                  value={formData.solar_installed}
                  onChange={(e) =>
                    updateField('solar_installed', e.target.value as CalculatorInput['solar_installed'])
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes — Rooftop / Community Solar Active</option>
                  <option value="planned">Planned Within 12 Months</option>
                </select>
              </div>
            </div>
          </section>

          {/* 04 Food & Lifestyle */}
          <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold flex items-center justify-center">
                04
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">04. Food & Lifestyle</h2>
                <p className="text-xs text-slate-500">Dietary habits, food waste, local sourcing, and dining out</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Dietary Habits</label>
                <select
                  value={formData.diet_type}
                  onChange={(e) =>
                    updateField('diet_type', e.target.value as CalculatorInput['diet_type'])
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="vegan">100% Plant-Based / Vegan</option>
                  <option value="vegetarian">Vegetarian (Dairy / Eggs)</option>
                  <option value="pescatarian">Pescatarian</option>
                  <option value="omnivore_low_meat">Omnivore — Low Meat (1–3x/week)</option>
                  <option value="omnivore_high_meat">Omnivore — Daily Meat</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Food Waste Level</label>
                <select
                  value={formData.food_waste_level}
                  onChange={(e) =>
                    updateField('food_waste_level', e.target.value as CalculatorInput['food_waste_level'])
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="minimal">Minimal (&lt;5% discarded)</option>
                  <option value="low">Low (5–10% discarded)</option>
                  <option value="moderate">Moderate (10–20% discarded)</option>
                  <option value="high">High (&gt;20% discarded)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Locally Produced Food ({formData.local_food_pct}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formData.local_food_pct}
                  onChange={(e) => updateField('local_food_pct', Number(e.target.value))}
                  className="w-full accent-emerald-600 mt-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Restaurant / Outside Food (Meals / week)
                </label>
                <input
                  type="number"
                  min={0}
                  max={35}
                  required
                  value={formData.outside_meals_per_week}
                  onChange={(e) => updateField('outside_meals_per_week', Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>
          </section>

          {/* 05 Waste Management */}
          <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold flex items-center justify-center">
                05
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">05. Waste Management</h2>
                <p className="text-xs text-slate-500">Weekly solid waste, recycling habits, composting, and plastics</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Waste Generated (kg / week)
                </label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={0.5}
                  required
                  value={formData.waste_kg_per_week}
                  onChange={(e) => updateField('waste_kg_per_week', Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Recycling Frequency</label>
                <select
                  value={formData.recycling_frequency}
                  onChange={(e) =>
                    updateField('recycling_frequency', e.target.value as CalculatorInput['recycling_frequency'])
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="always">Always (Strict Segregation)</option>
                  <option value="often">Often (Most Paper/Metal/Glass/Plastic)</option>
                  <option value="sometimes">Sometimes (Occasional)</option>
                  <option value="never">Never</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Composting</label>
                <select
                  value={formData.composting}
                  onChange={(e) => updateField('composting', e.target.value as CalculatorInput['composting'])}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="yes">Yes — Active Organic Composting</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Single-Use Plastic Usage
                </label>
                <select
                  value={formData.single_use_plastic}
                  onChange={(e) =>
                    updateField('single_use_plastic', e.target.value as CalculatorInput['single_use_plastic'])
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="minimal">Minimal (Reusable Bags/Bottles)</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High (Frequent Packaged Disposables)</option>
                </select>
              </div>
            </div>
          </section>

          {/* 06 Lifestyle & Others */}
          <section className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold flex items-center justify-center">
                06
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">06. Lifestyle & Others</h2>
                <p className="text-xs text-slate-500">Space cooling, daily water draw, apparel, and e-waste handling</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Air Conditioner Usage (Hours / day)
                </label>
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  required
                  value={formData.ac_hours_per_day}
                  onChange={(e) => updateField('ac_hours_per_day', Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Water Consumption (Liters / day)
                </label>
                <input
                  type="number"
                  min={20}
                  max={2000}
                  required
                  value={formData.water_liters_per_day}
                  onChange={(e) => updateField('water_liters_per_day', Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Clothes Buying Frequency
                </label>
                <select
                  value={formData.clothes_buying_frequency}
                  onChange={(e) =>
                    updateField(
                      'clothes_buying_frequency',
                      e.target.value as CalculatorInput['clothes_buying_frequency']
                    )
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="rarely">Rarely (1–2 times/year or Secondhand)</option>
                  <option value="quarterly">Quarterly (Every 3 months)</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly (Fast Fashion)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Electronic Waste Disposal
                </label>
                <select
                  value={formData.ewaste_disposal}
                  onChange={(e) =>
                    updateField('ewaste_disposal', e.target.value as CalculatorInput['ewaste_disposal'])
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="certified_recycler">Certified E-Waste Recycler</option>
                  <option value="trade_in">Manufacturer Trade-In / Refurbish</option>
                  <option value="stored">Stored at Home</option>
                  <option value="mixed_trash">Disposed in General Trash</option>
                </select>
              </div>
            </div>

            {/* Expandable Advanced Environmental Data */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center justify-between w-full text-left text-xs font-semibold text-emerald-700 hover:text-emerald-800 py-1"
              >
                <span>Advanced Environmental Data (Optional Aviation & Home Efficiency Fields)</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Short-Haul Flights Per Year (&lt;3 hrs)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={formData.flights_short_haul_yearly || 0}
                      onChange={(e) => updateField('flights_short_haul_yearly', Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Long-Haul Flights Per Year (&gt;3 hrs)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={formData.flights_long_haul_yearly || 0}
                      onChange={(e) => updateField('flights_long_haul_yearly', Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Home Floor Area (sq. ft.)
                    </label>
                    <input
                      type="number"
                      min={200}
                      max={10000}
                      value={formData.home_area_sqft || 1000}
                      onChange={(e) => updateField('home_area_sqft', Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50/70 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Energy-Efficient Appliances ({formData.green_appliances_pct || 50}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={formData.green_appliances_pct || 50}
                      onChange={(e) => updateField('green_appliances_pct', Number(e.target.value))}
                      className="w-full accent-emerald-600 mt-2"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Form Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 bg-white border border-slate-200 rounded-xl p-4">
            <button
              type="button"
              disabled={savingDraft || analyzing}
              onClick={handleSaveDraft}
              className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingDraft ? 'Saving Draft...' : 'Save Draft'}
            </button>
            <button
              type="submit"
              disabled={analyzing}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {analyzing ? 'Analyzing with EcoTwin AI...' : 'Analyze with EcoTwin AI'}
            </button>
          </div>
        </div>

        {/* Right 4 Columns: Sticky AI Analysis Preview Card */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-5">
          <div className="bg-emerald-950 text-white rounded-xl p-6 shadow-sm border border-emerald-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-800/80">
              <div>
                <p className="text-xs text-emerald-300 font-medium">Real-Time ML Inference</p>
                <h3 className="text-base font-bold text-white">AI Analysis Preview</h3>
              </div>
              <span className="text-xs font-mono text-emerald-300">RandomForest</span>
            </div>

            {loadingInitial ? (
              <div className="py-12 text-center text-sm text-emerald-200">
                Loading backend ML preview...
              </div>
            ) : !previewResult ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-sm text-emerald-100 font-medium">Prediction unavailable</p>
                <p className="text-xs text-emerald-300/80">
                  Click "Save Draft" or "Analyze with EcoTwin AI" to compute your footprint via the backend ML pipeline.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-900/60 border border-emerald-800 rounded-lg p-4">
                  <p className="text-xs text-emerald-200">Estimated Monthly Footprint</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold font-mono tabular-nums text-white">
                      {previewResult.predicted_footprint_kg}
                    </span>
                    <span className="text-xs text-emerald-300 font-mono">kg CO₂e / month</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-800/70 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-emerald-300 block">Current Footprint</span>
                      <span className="font-mono tabular-nums font-semibold text-white">
                        {previewResult.current_footprint_kg !== null
                          ? `${previewResult.current_footprint_kg} kg`
                          : 'No prior record'}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-300 block">Change From Previous</span>
                      <span className="font-mono tabular-nums font-semibold text-white">
                        {previewResult.change_from_previous_pct !== null
                          ? `${previewResult.change_from_previous_pct > 0 ? '+' : ''}${
                              previewResult.change_from_previous_pct
                            }%`
                          : 'Baseline run'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-900/40 border border-emerald-800/70 rounded-lg p-3">
                    <span className="text-[11px] text-emerald-300 block">Risk Category</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {previewResult.risk_category}
                    </span>
                  </div>
                  <div className="bg-emerald-900/40 border border-emerald-800/70 rounded-lg p-3">
                    <span className="text-[11px] text-emerald-300 block">Top Contributor</span>
                    <span className="text-sm font-bold text-emerald-200 mt-0.5 block">
                      {previewResult.top_contributor}
                    </span>
                  </div>
                </div>

                {/* Chart.js Emission Breakdown */}
                <div className="bg-white rounded-lg p-4 text-slate-900">
                  <p className="text-xs font-bold text-slate-800 mb-2">
                    Emission Breakdown (kg CO₂e)
                  </p>
                  {breakdownChartConfig && (
                    <ChartCanvas config={breakdownChartConfig} height={210} />
                  )}
                </div>

                {/* Model Information */}
                <div className="bg-emerald-900/40 border border-emerald-800/60 rounded-lg p-3.5 text-xs space-y-1.5">
                  <p className="font-semibold text-emerald-200">Model Information</p>
                  <p className="text-emerald-100/90">
                    Algorithm: {previewResult.model_info.regression_model}
                  </p>
                  <p className="font-mono text-[11px] text-emerald-300">
                    R² = {previewResult.model_info.regression_metrics.r2} · MAE ={' '}
                    {previewResult.model_info.regression_metrics.mae} kg · RMSE ={' '}
                    {previewResult.model_info.regression_metrics.rmse} kg
                  </p>
                  <p className="text-[11px] text-emerald-300/90">
                    {previewResult.model_info.confidence !== null
                      ? `Model confidence: ${previewResult.model_info.confidence}%`
                      : 'Model confidence: Not available'}
                  </p>
                  <p className="text-[11px] text-emerald-400/80 pt-1 border-t border-emerald-800/60">
                    {previewResult.model_info.dataset_label}
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
};
