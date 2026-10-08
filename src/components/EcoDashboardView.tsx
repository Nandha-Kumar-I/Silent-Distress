import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { ChartCanvas } from './ChartCanvas';
import {
  Leaf,
  TrendingDown,
  TrendingUp,
  Award,
  AlertTriangle,
  Sliders,
  FileDown,
  ArrowRight,
  Target,
  CheckCircle2,
  TreePine,
  Car,
  Smartphone,
} from 'lucide-react';

interface EcoDashboardViewProps {
  onNavigate: (page: string) => void;
}

export const EcoDashboardView: React.FC<EcoDashboardViewProps> = ({ onNavigate }) => {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Quick What-If preview slider state
  const [quickRenewPct, setQuickRenewPct] = useState<number>(50);
  const [quickDistKm, setQuickDistKm] = useState<number>(12);
  const [quickSimResult, setQuickSimResult] = useState<{
    simulated_prediction: number;
    percentage_reduction: number;
  } | null>(null);
  const [runningQuickSim, setRunningQuickSim] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .getDashboard()
      .then((res) => {
        if (!mounted) return;
        setData(res);
        const latestRecord = res.monthly_history[res.monthly_history.length - 1];
        if (latestRecord) {
          setQuickRenewPct(Math.min(100, latestRecord.inputs.renewable_pct + 25));
          setQuickDistKm(Math.max(4, Math.round(latestRecord.inputs.daily_distance_km * 0.65)));
        }
      })
      .catch((err: any) => {
        if (mounted) setError(err?.message || 'Failed to load dashboard data.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleQuickSimulate = async () => {
    setRunningQuickSim(true);
    try {
      const res = await api.runWhatIfSimulation({
        renewable_pct: quickRenewPct,
        daily_distance_km: quickDistKm,
      });
      setQuickSimResult({
        simulated_prediction: res.simulated_prediction,
        percentage_reduction: res.percentage_reduction,
      });
    } catch {
      // ignore
    } finally {
      setRunningQuickSim(false);
    }
  };

  const handleDownloadReport = async () => {
    setDownloadingPdf(true);
    try {
      await api.generateReport('Sustainability Report');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const breakdownChartConfig = useMemo(() => {
    if (!data?.emission_breakdown) return null;
    const bd = data.emission_breakdown;
    return {
      type: 'doughnut' as const,
      data: {
        labels: Object.keys(bd),
        datasets: [
          {
            data: Object.values(bd),
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
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right' as const,
            labels: { boxWidth: 12, font: { size: 11, family: 'Plus Jakarta Sans' } },
          },
        },
      },
    };
  }, [data]);

  const forecastChartConfig = useMemo(() => {
    if (!data?.forecast?.series || data.forecast.series.length === 0) return null;
    const s = data.forecast.series;
    return {
      type: 'line' as const,
      data: {
        labels: s.map((p) => p.month),
        datasets: [
          {
            label: 'Historical Footprint (kg CO₂e)',
            data: s.map((p) => p.historical_kg),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.12)',
            borderWidth: 2.5,
            tension: 0.3,
            fill: true,
          },
          {
            label: 'AI Projected Forecast (kg CO₂e)',
            data: s.map((p) => p.predicted_kg),
            borderColor: '#0284c7',
            borderDash: [6, 4],
            borderWidth: 2.5,
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'top' as const },
        },
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: 'kg CO₂e / month' },
          },
        },
      },
    };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <p className="text-sm font-medium text-slate-600">Loading environmental dashboard from API...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-red-800">{error || 'Dashboard unavailable'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-700 text-white text-xs font-semibold rounded-lg"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!data.has_data) {
    return (
      <div className="bg-white border border-emerald-200 rounded-xl p-10 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
          <Leaf className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Environmental Footprint Data Yet</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your dashboard never displays hardcoded numbers. Complete your first lifestyle assessment in the Carbon Calculator so our RandomForest ML pipeline can generate your footprint, Eco Score, Digital Twin, and 6-month forecast.
        </p>
        <button
          onClick={() => onNavigate('calculator')}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
        >
          Start Carbon Calculator <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar Summary + Eco Level & Report CTA */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Authenticated Environmental Telemetry</span>
            <span>·</span>
            <span className="font-mono text-emerald-700 font-semibold">
              Level {data.level}: {data.level_title} ({data.eco_points} Eco Points)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            Environmental Intelligence Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('calculator')}
            className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap"
          >
            Update Lifestyle Inputs
          </button>
          <button
            onClick={handleDownloadReport}
            disabled={downloadingPdf}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            {downloadingPdf ? 'Generating PDF...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Current Footprint</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {data.current_footprint_kg}
            </span>
            <span className="text-xs text-slate-500 font-mono">kg CO₂e/mo</span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {data.change_from_previous_pct !== null ? (
              <span
                className={
                  data.change_from_previous_pct <= 0 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'
                }
              >
                {data.change_from_previous_pct > 0 ? '+' : ''}
                {data.change_from_previous_pct}% vs previous period
              </span>
            ) : (
              <span>Initial verified baseline</span>
            )}
          </p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5">
          <p className="text-xs font-medium text-emerald-800">Eco Score & Risk Tier</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-950">
              {data.eco_score}
            </span>
            <span className="text-xs text-emerald-700 font-mono">/ 100</span>
          </div>
          <p className="mt-2 text-xs font-semibold text-emerald-800">
            Classification: {data.risk_category}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Future Prediction (6M)</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {data.future_prediction_6m_kg ?? 'N/A'}
            </span>
            <span className="text-xs text-slate-500 font-mono">kg CO₂e/mo</span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Trend: <span className="font-semibold text-slate-800">{data.forecast.trend}</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Anonymous Community Rank</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {data.community_rank.percentile_better_than !== null
                ? `Top ${100 - data.community_rank.percentile_better_than}%`
                : 'N/A'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Lower than {data.community_rank.percentile_better_than}% (Avg: {data.community_rank.community_average_kg} kg)
          </p>
        </div>
      </div>

      {/* Charts Row: Emission Breakdown & Carbon Footprint Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Emission Breakdown</h2>
              <p className="text-xs text-slate-500">Top contributor: {data.top_contributor}</p>
            </div>
            <button
              onClick={() => onNavigate('analysis')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Full XAI Analysis
            </button>
          </div>
          {breakdownChartConfig && <ChartCanvas config={breakdownChartConfig} height={240} />}
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Carbon Footprint Forecast</h2>
              <p className="text-xs text-slate-500">{data.forecast.interpretation}</p>
            </div>
            <button
              onClick={() => onNavigate('forecast')}
              className="text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap"
            >
              Interactive Forecast
            </button>
          </div>
          {forecastChartConfig && <ChartCanvas config={forecastChartConfig} height={240} />}
        </div>
      </div>

      {/* Middle Row: "What is affecting my score?" + AI Recommendations + Lifestyle Optimization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">What is affecting my score?</h2>
              <p className="text-xs text-slate-500">
                ML feature importance & marginal impact vs sustainable benchmark
              </p>
            </div>
            <button
              onClick={() => onNavigate('analysis')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Explain Model
            </button>
          </div>

          <div className="space-y-3">
            {data.feature_importances.slice(0, 5).map((fi) => (
              <div key={fi.feature} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>
                    {fi.label} ({fi.category})
                  </span>
                  <span
                    className={`font-mono tabular-nums ${
                      fi.direction === 'increases'
                        ? 'text-amber-700'
                        : fi.direction === 'decreases'
                        ? 'text-emerald-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {fi.local_impact_kg > 0 ? `+${fi.local_impact_kg}` : fi.local_impact_kg} kg CO₂e ·{' '}
                    {fi.importance_pct}% weight
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{fi.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                AI Recommendation & Lifestyle Optimization
              </h2>
              <p className="text-xs text-slate-500">
                Personalized high-priority reductions tailored to your inputs
              </p>
            </div>
            <button
              onClick={() => onNavigate('recommendations')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              All Recommendations
            </button>
          </div>

          <div className="space-y-3">
            {data.recommendations.slice(0, 4).map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-lg flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                    <span>{rec.category}</span>
                    <span>·</span>
                    <span>{rec.priority} Priority</span>
                    <span>·</span>
                    <span>{rec.difficulty}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{rec.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold font-mono tabular-nums text-emerald-700 block">
                    -{rec.estimated_reduction_kg} kg
                  </span>
                  <span className="text-[11px] text-slate-500">per month</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What-If Simulator Preview + Anomaly Detection + Goal Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* What-If Simulator Preview */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">What-If Simulator Preview</h2>
            <button
              onClick={() => onNavigate('simulator')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Full Simulator
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Test quick parameter adjustments against the backend RandomForest model:
          </p>
          <div className="space-y-3">
            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Renewable Share</span>
                <span className="font-mono">{quickRenewPct}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={quickRenewPct}
                onChange={(e) => setQuickRenewPct(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Daily Commute Distance</span>
                <span className="font-mono">{quickDistKm} km/day</span>
              </label>
              <input
                type="range"
                min={0}
                max={80}
                value={quickDistKm}
                onChange={(e) => setQuickDistKm(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
            <button
              type="button"
              onClick={handleQuickSimulate}
              disabled={runningQuickSim}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {runningQuickSim ? 'Running Backend ML...' : 'Test What-If Scenario'}
            </button>
            {quickSimResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center justify-between">
                <span className="text-emerald-900 font-medium">Simulated Footprint:</span>
                <span className="font-mono font-bold text-emerald-800">
                  {quickSimResult.simulated_prediction} kg CO₂e ({quickSimResult.percentage_reduction > 0 ? '-' : '+'}
                  {Math.abs(quickSimResult.percentage_reduction)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Anomaly Detection */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Anomaly Detection</h2>
            <button
              onClick={() => onNavigate('anomalies')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              View Alerts
            </button>
          </div>
          {data.anomalies.length === 0 ? (
            <div className="py-8 text-center space-y-2 bg-slate-50 rounded-lg border border-slate-200/60">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No anomalies detected</p>
              <p className="text-xs text-slate-500 px-4">
                IsolationForest model found all metrics within expected baseline bounds.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.anomalies.slice(0, 3).map((anom) => (
                <div
                  key={anom.id}
                  className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-amber-900">
                    <span>
                      {anom.metric} ({anom.severity} Severity)
                    </span>
                    <span className="font-mono">
                      {anom.current_value} {anom.unit}
                    </span>
                  </div>
                  <p className="text-amber-800/90 leading-relaxed">{anom.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goal Progress & Recent Achievements */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Goal Progress & Achievements</h2>
            <button
              onClick={() => onNavigate('goals')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Manage Goals
            </button>
          </div>
          {data.goals.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/70 text-xs text-slate-600 space-y-2">
              <p>No active sustainability goals configured yet.</p>
              <button
                onClick={() => onNavigate('goals')}
                className="text-emerald-700 font-semibold hover:underline"
              >
                + Create Carbon Reduction Goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.goals.slice(0, 2).map((g) => (
                <div key={g.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-900">
                    <span>{g.title}</span>
                    <span className="font-mono text-emerald-700">{g.progress_pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${g.progress_pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Current: {g.current_footprint_kg} kg</span>
                    <span>Target: {g.target_footprint_kg} kg</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Recent Achievements</span>
              <button
                onClick={() => onNavigate('achievements')}
                className="text-[11px] text-emerald-700 font-semibold hover:underline"
              >
                View All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.recent_achievements
                .filter((a) => a.unlocked)
                .slice(0, 4)
                .map((ach) => (
                  <span
                    key={ach.id}
                    className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1 font-medium"
                  >
                    {ach.title} (+{ach.points} pts)
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Environmental Context & Monthly History Preview */}
      {data.environmental_context && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Environmental Context & Monthly History
              </h2>
              <p className="text-xs text-slate-500">
                Physical equivalents of your {data.current_footprint_kg} kg CO₂e monthly footprint
              </p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              View Full History ({data.monthly_history.length} records)
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg flex items-center gap-3">
              <TreePine className="w-8 h-8 text-emerald-700 shrink-0" />
              <div>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {data.environmental_context.trees_needed_monthly} Mature Trees
                </p>
                <p className="text-xs text-slate-600">Required monthly to sequester your emissions</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center gap-3">
              <Car className="w-8 h-8 text-slate-700 shrink-0" />
              <div>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {data.environmental_context.km_driven_equivalent} km Driven
                </p>
                <p className="text-xs text-slate-600">Equivalent passenger car distance per month</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-slate-700 shrink-0" />
              <div>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {data.environmental_context.smartphone_charges_equivalent.toLocaleString()} Charges
                </p>
                <p className="text-xs text-slate-600">Equivalent full smartphone battery cycles</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
