import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { DigitalTwinState } from '../types';
import { ChartCanvas } from './ChartCanvas';
import {
  FileDown,
  ArrowRight,
  TreePine,
  Sun,
  Recycle,
  Droplets,
  Car,
  Home,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface EcoTwinViewProps {
  onNavigate: (page: string) => void;
}

export const EcoTwinView: React.FC<EcoTwinViewProps> = ({ onNavigate }) => {
  const [twin, setTwin] = useState<DigitalTwinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Interactive Twin What-If state
  const [simRenew, setSimRenew] = useState(65);
  const [simDist, setSimDist] = useState(10);
  const [simAc, setSimAc] = useState(2);
  const [simResult, setSimResult] = useState<{
    simulated_prediction: number;
    simulated_eco_score: number;
    percentage_reduction: number;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .getTwin()
      .then((res) => {
        if (mounted) setTwin(res);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleTwinSimulate = async () => {
    setSimulating(true);
    try {
      const res = await api.runWhatIfSimulation({
        renewable_pct: simRenew,
        daily_distance_km: simDist,
        ac_hours_per_day: simAc,
      });
      setSimResult({
        simulated_prediction: res.simulated_prediction,
        simulated_eco_score: res.simulated_eco_score,
        percentage_reduction: res.percentage_reduction,
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleGenerateTwinReport = async () => {
    setDownloading(true);
    try {
      await api.generateReport('Digital Twin Report');
    } finally {
      setDownloading(false);
    }
  };

  const evolutionChartConfig = useMemo(() => {
    if (!twin || twin.evolution.length === 0) return null;
    return {
      type: 'line' as const,
      data: {
        labels: twin.evolution.map((e) => e.month),
        datasets: [
          {
            label: 'Twin Carbon Footprint (kg CO₂e)',
            data: twin.evolution.map((e) => e.footprint_kg),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.14)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.3,
            yAxisID: 'y',
          },
          {
            label: 'Twin Eco Score (0–100)',
            data: twin.evolution.map((e) => e.eco_score),
            borderColor: '#0284c7',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        scales: {
          y: {
            type: 'linear' as const,
            position: 'left' as const,
            title: { display: true, text: 'kg CO₂e / mo' },
          },
          y1: {
            type: 'linear' as const,
            position: 'right' as const,
            min: 0,
            max: 100,
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Eco Score' },
          },
        },
      },
    };
  }, [twin]);

  const compositionChartConfig = useMemo(() => {
    if (!twin?.composition) return null;
    return {
      type: 'bar' as const,
      data: {
        labels: Object.keys(twin.composition),
        datasets: [
          {
            label: 'Monthly Emissions (kg CO₂e)',
            data: Object.values(twin.composition),
            backgroundColor: '#059669',
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
      },
    };
  }, [twin]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-600">
        Synthesizing your Environmental Digital Twin from backend telemetry...
      </div>
    );
  }

  if (!twin || !twin.has_data) {
    return (
      <div className="bg-white border border-emerald-200 rounded-xl p-10 text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          My Twin — Your Environmental Digital Twin
        </h2>
        <p className="text-sm text-slate-600">
          Your Environmental Digital Twin is currently uninitialized. Complete the Carbon Calculator to model your home energy, transit, canopy sequestration, and biosphere status.
        </p>
        <button
          onClick={() => onNavigate('calculator')}
          className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 inline-flex items-center gap-2"
        >
          Initialize Digital Twin <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const skyGradient =
    twin.visual_state.air_clarity_pct >= 70
      ? 'from-sky-100 via-emerald-50 to-emerald-100'
      : twin.visual_state.air_clarity_pct >= 50
      ? 'from-slate-200 via-amber-50/60 to-emerald-100'
      : 'from-amber-100/80 via-slate-200 to-stone-200';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">Dynamic Environmental Biosphere Simulation</p>
          <h1 className="text-2xl font-bold text-slate-900">
            My Twin — Your Environmental Digital Twin
          </h1>
          <p className="text-sm text-slate-600 mt-1">{twin.twin_summary}</p>
        </div>
        <button
          onClick={handleGenerateTwinReport}
          disabled={downloading}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          {downloading ? 'Generating Twin PDF...' : 'Generate Twin Report'}
        </button>
      </div>

      {/* 5 Core Digital Twin Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Current Carbon Footprint</span>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {twin.current_footprint_kg} <span className="text-xs font-normal">kg CO₂e/mo</span>
          </p>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
          <span className="text-xs text-emerald-800">Eco Score</span>
          <p className="text-xl font-bold font-mono tabular-nums text-emerald-950 mt-1">
            {twin.eco_score} <span className="text-xs font-normal">/ 100</span>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Twin Age</span>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {twin.twin_age_days} <span className="text-xs font-normal">days tracked</span>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Twin Status</span>
          <p className="text-base font-bold text-emerald-800 mt-1">{twin.twin_status}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Future Twin Forecast (6M)</span>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {twin.future_forecast_6m_kg ?? 'N/A'} <span className="text-xs font-normal">kg CO₂e</span>
          </p>
        </div>
      </div>

      {/* Visual Environmental Digital Twin Canvas + State Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Visual Environmental Digital Twin Ecosystem
              </h2>
              <p className="text-xs text-slate-500">
                Real-time ecological mirror of your home energy, transit mode, canopy balance, and recycling loop
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-700 font-semibold">
              Air Clarity: {twin.visual_state.air_clarity_pct}%
            </span>
          </div>

          {/* Interactive SVG Environmental Ecosystem Representation */}
          <div
            className={`w-full rounded-xl border border-emerald-200/80 bg-gradient-to-b ${skyGradient} p-6 relative overflow-hidden`}
          >
            <svg
              viewBox="0 0 800 300"
              className="w-full h-64 sm:h-72"
              role="img"
              aria-label="Environmental Digital Twin Ecosystem"
            >
              {/* Sun & Wind Turbines */}
              <circle cx="690" cy="58" r="28" fill="#fbbf24" opacity="0.9" />
              <circle cx="690" cy="58" r="38" fill="#fde68a" opacity="0.35" />

              {/* Distant Eco Hills */}
              <path
                d="M0 230 Q180 165 370 220 T800 205 L800 300 L0 300 Z"
                fill="#a7f3d0"
                opacity="0.65"
              />
              <path
                d="M0 245 Q260 195 520 240 T800 230 L800 300 L0 300 Z"
                fill="#6ee7b7"
                opacity="0.8"
              />

              {/* Wind Turbine when Renewable >= 30% */}
              <g transform="translate(560, 95)">
                <line x1="0" y1="0" x2="0" y2="125" stroke="#475569" strokeWidth="4" />
                <circle cx="0" cy="0" r="5" fill="#0f172a" />
                <path d="M0 0 L-32 -22 L-26 -28 Z" fill="#f8fafc" stroke="#64748b" />
                <path d="M0 0 L34 -16 L30 -8 Z" fill="#f8fafc" stroke="#64748b" />
                <path d="M0 0 L4 38 L-4 38 Z" fill="#f8fafc" stroke="#64748b" />
              </g>

              {/* Eco Home with Optional Solar Roof */}
              <g transform="translate(260, 140)">
                <rect x="0" y="42" width="145" height="78" rx="4" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
                <polygon points="-12,42 72,-8 157,42" fill="#0f172a" />
                {twin.visual_state.solar_active && (
                  <g>
                    <polygon
                      points="18,34 68,4 115,34"
                      fill="#0284c7"
                      stroke="#bae6fd"
                      strokeWidth="1.5"
                    />
                    <line x1="45" y1="19" x2="90" y2="19" stroke="#bae6fd" strokeWidth="1" />
                  </g>
                )}
                <rect x="22" y="62" width="32" height="28" rx="2" fill="#bae6fd" stroke="#334155" strokeWidth="1.5" />
                <rect x="92" y="62" width="32" height="28" rx="2" fill="#bae6fd" stroke="#334155" strokeWidth="1.5" />
                <rect x="62" y="72" width="22" height="48" rx="2" fill="#059669" />
              </g>

              {/* Dynamic Forest Canopy Scaled by Eco Score */}
              {Array.from({ length: Math.min(10, twin.visual_state.tree_count) }).map((_, idx) => {
                const xPos = idx < 5 ? 32 + idx * 42 : 445 + (idx - 5) * 48;
                const yBase = 225 + (idx % 2) * 8;
                return (
                  <g key={idx} transform={`translate(${xPos}, ${yBase})`}>
                    <rect x="-4" y="0" width="8" height="22" fill="#78350f" />
                    <circle cx="0" cy="-12" r="18" fill="#059669" />
                    <circle cx="-8" cy="-6" r="13" fill="#10b981" />
                    <circle cx="8" cy="-6" r="13" fill="#047857" />
                  </g>
                );
              })}

              {/* Recycling & Composting Loop Station */}
              <g transform="translate(420, 212)">
                <rect x="0" y="0" width="26" height="34" rx="3" fill="#059669" />
                <rect x="32" y="0" width="26" height="34" rx="3" fill="#0284c7" />
                <text x="7" y="21" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                  R
                </text>
                <text x="39" y="21" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                  C
                </text>
              </g>

              {/* Transit Path & Active Vehicle */}
              <rect x="0" y="262" width="800" height="28" fill="#334155" />
              <line
                x1="0"
                y1="276"
                x2="800"
                y2="276"
                stroke="#f8fafc"
                strokeWidth="2"
                strokeDasharray="18 14"
              />
              <g transform="translate(150, 240)">
                <rect
                  x="0"
                  y="6"
                  width="64"
                  height="20"
                  rx="6"
                  fill={
                    ['car_ev', 'public_transit', 'bicycle', 'walking'].includes(
                      twin.visual_state.transport_mode
                    )
                      ? '#10b981'
                      : '#f59e0b'
                  }
                />
                <circle cx="14" cy="28" r="6" fill="#0f172a" />
                <circle cx="50" cy="28" r="6" fill="#0f172a" />
              </g>
            </svg>

            {/* Bottom Ecosystem Telemetry Overlay */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-emerald-900/10 text-xs">
              <div className="bg-white/90 rounded-lg p-2.5">
                <span className="text-slate-500 block">Home Energy Efficiency</span>
                <span className="font-mono font-bold text-slate-900">
                  {twin.visual_state.home_efficiency_pct}% ({twin.visual_state.solar_active ? 'Solar/Clean' : 'Grid'})
                </span>
              </div>
              <div className="bg-white/90 rounded-lg p-2.5">
                <span className="text-slate-500 block">Transit Mode</span>
                <span className="font-mono font-bold text-slate-900 capitalize">
                  {twin.visual_state.transport_mode.replace('_', ' ')}
                </span>
              </div>
              <div className="bg-white/90 rounded-lg p-2.5">
                <span className="text-slate-500 block">Recycling Loop</span>
                <span className="font-mono font-bold text-slate-900 capitalize">
                  {twin.visual_state.recycling_tier}
                </span>
              </div>
              <div className="bg-white/90 rounded-lg p-2.5">
                <span className="text-slate-500 block">Water Conservation</span>
                <span className="font-mono font-bold text-slate-900">
                  {twin.visual_state.water_conservation_pct}% Index
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Twin Insights & Live Twin What-If Simulation */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900">AI Twin Insights</h2>
            <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              {twin.ai_insights.map((ins, i) => (
                <li key={i} className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-slate-800">
                  {ins}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Twin What-If Simulation</h2>
            <p className="text-xs text-slate-500">
              Preview how lifestyle upgrades transform your Digital Twin score:
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Renewable Grid Share</span>
                  <span className="font-mono">{simRenew}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={simRenew}
                  onChange={(e) => setSimRenew(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Daily Commute</span>
                  <span className="font-mono">{simDist} km/day</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={simDist}
                  onChange={(e) => setSimDist(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>AC Runtime</span>
                  <span className="font-mono">{simAc} hrs/day</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={14}
                  step={0.5}
                  value={simAc}
                  onChange={(e) => setSimAc(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              <button
                type="button"
                onClick={handleTwinSimulate}
                disabled={simulating}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
              >
                {simulating ? 'Simulating Twin...' : 'Simulate Twin Evolution'}
              </button>
              {simResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Simulated Twin Footprint:</span>
                    <span className="font-mono font-bold text-emerald-900">
                      {simResult.simulated_prediction} kg CO₂e
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Simulated Twin Eco Score:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {simResult.simulated_eco_score}/100 ({simResult.percentage_reduction > 0 ? '-' : '+'}
                      {Math.abs(simResult.percentage_reduction)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Twin Evolution & Twin Composition Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Twin Evolution & Timeline</h2>
          <p className="text-xs text-slate-500 mb-4">
            Historical progression of your Digital Twin footprint and Eco Score
          </p>
          {evolutionChartConfig && <ChartCanvas config={evolutionChartConfig} height={240} />}
        </div>
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Twin Composition</h2>
          <p className="text-xs text-slate-500 mb-4">
            Category distribution shaping your Digital Twin state
          </p>
          {compositionChartConfig && <ChartCanvas config={compositionChartConfig} height={240} />}
        </div>
      </div>

      {/* Twin Recommendations, Anomalies & Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Twin Recommendations</h3>
          {twin.recommendations.slice(0, 3).map((r) => (
            <div key={r.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs space-y-1">
              <div className="flex justify-between font-semibold text-slate-900">
                <span>{r.title}</span>
                <span className="font-mono text-emerald-700">-{r.estimated_reduction_kg} kg</span>
              </div>
              <p className="text-slate-600">{r.reason}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Twin Anomaly Alerts</h3>
          {twin.anomalies.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No anomalies detected in Digital Twin telemetry.</p>
          ) : (
            twin.anomalies.slice(0, 3).map((a) => (
              <div key={a.id} className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between font-semibold text-amber-900">
                  <span>{a.metric}</span>
                  <span className="font-mono">
                    {a.current_value} {a.unit}
                  </span>
                </div>
                <p className="text-amber-800">{a.explanation}</p>
              </div>
            ))
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Active Twin Goals</h3>
          {twin.goals.length === 0 ? (
            <div className="text-xs text-slate-500 space-y-2 py-2">
              <p>No active goals linked to your Digital Twin.</p>
              <button
                onClick={() => onNavigate('goals')}
                className="text-emerald-700 font-semibold hover:underline"
              >
                + Create Goal
              </button>
            </div>
          ) : (
            twin.goals.map((g) => (
              <div key={g.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs space-y-1.5">
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>{g.title}</span>
                  <span className="font-mono text-emerald-700">{g.progress_pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600" style={{ width: `${g.progress_pct}%` }} />
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Target: {g.target_footprint_kg} kg CO₂e ({g.days_remaining} days left)
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
