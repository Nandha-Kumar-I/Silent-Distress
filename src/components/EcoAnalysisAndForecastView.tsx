import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { ChartCanvas } from './ChartCanvas';
import { ArrowRight, Sparkles, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

interface ViewNavProps {
  onNavigate: (page: string) => void;
}

export const EcoAnalysisView: React.FC<ViewNavProps> = ({ onNavigate }) => {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getAnalysis>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .getAnalysis()
      .then((res) => {
        if (mounted) setData(res);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const featureChartConfig = useMemo(() => {
    if (!data?.feature_importances || data.feature_importances.length === 0) return null;
    const items = data.feature_importances.slice(0, 8);
    return {
      type: 'bar' as const,
      data: {
        labels: items.map((f) => f.label),
        datasets: [
          {
            label: 'Feature Importance Weight (%)',
            data: items.map((f) => f.importance_pct),
            backgroundColor: items.map((f) =>
              f.direction === 'increases'
                ? '#d97706'
                : f.direction === 'decreases'
                ? '#059669'
                : '#64748b'
            ),
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y' as const,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { title: { display: true, text: 'Relative Feature Importance (%)' } },
        },
      },
    };
  }, [data]);

  const categoryChartConfig = useMemo(() => {
    if (!data?.emission_breakdown) return null;
    const bd = data.emission_breakdown;
    return {
      type: 'bar' as const,
      data: {
        labels: Object.keys(bd),
        datasets: [
          {
            label: 'Monthly Emissions (kg CO₂e)',
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
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
      },
    };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-600">
        Loading Explainable AI (XAI) feature importance & model diagnostics...
      </div>
    );
  }

  if (!data || !data.has_data || !data.emission_breakdown) {
    return (
      <div className="bg-white border border-emerald-200 rounded-xl p-10 text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-xl font-bold text-slate-900">AI Analysis & Model Explainability</h2>
        <p className="text-sm text-slate-600">
          No carbon footprint record is available to explain yet. Complete the Carbon Calculator first to inspect tree-based feature importances and local marginal impacts.
        </p>
        <button
          onClick={() => onNavigate('calculator')}
          className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 inline-flex items-center gap-2"
        >
          Open Carbon Calculator <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const mInfo = data.model_info;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-xs font-semibold text-emerald-700">Explainable AI (XAI) & Feature Attribution</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
          AI Carbon Footprint Analysis & Model Explanation
        </h1>
        <p className="text-sm text-slate-600 mt-1">{data.why_footprint_explanation}</p>
      </div>

      {/* Top Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Current Footprint</span>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {data.current_footprint_kg} <span className="text-xs font-normal">kg CO₂e/mo</span>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Risk Classification</span>
          <p className="text-xl font-bold text-emerald-800 mt-1">{data.risk_category}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500">Primary Driver</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{data.top_contributor}</p>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
          <span className="text-xs text-emerald-800">Expected Top-3 Reduction</span>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
            -{data.expected_reduction_kg} <span className="text-xs font-normal">kg CO₂e/mo</span>
          </p>
        </div>
      </div>

      {/* Why is my carbon footprint high/low? + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Why is my carbon footprint at this level? (ML Feature Importance)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Amber bars indicate lifestyle factors increasing your footprint above benchmark; green bars indicate factors saving emissions.
          </p>
          {featureChartConfig && <ChartCanvas config={featureChartConfig} height={270} />}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            8-Category Emission Breakdown
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Transportation, Energy, Food, Waste, LPG, Water, Lifestyle, Other
          </p>
          {categoryChartConfig && <ChartCanvas config={categoryChartConfig} height={270} />}
        </div>
      </div>

      {/* Detailed Feature Attribution Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Local Feature Contributions vs. Sustainable Benchmark
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-semibold">Lifestyle Feature</th>
                <th className="py-2.5 px-3 font-semibold">Category</th>
                <th className="py-2.5 px-3 font-semibold">Your Value</th>
                <th className="py-2.5 px-3 font-semibold">Benchmark</th>
                <th className="py-2.5 px-3 font-semibold text-right">Importance</th>
                <th className="py-2.5 pl-3 font-semibold text-right">Local Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.feature_importances?.map((fi) => (
                <tr key={fi.feature} className="hover:bg-slate-50">
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-slate-900">{fi.label}</p>
                    <p className="text-slate-500 mt-0.5">{fi.explanation}</p>
                  </td>
                  <td className="py-3 px-3 text-slate-700">{fi.category}</td>
                  <td className="py-3 px-3 font-mono text-slate-800">{fi.user_value}</td>
                  <td className="py-3 px-3 font-mono text-slate-500">{fi.benchmark_value}</td>
                  <td className="py-3 px-3 font-mono tabular-nums text-right font-semibold text-slate-900">
                    {fi.importance_pct}%
                  </td>
                  <td
                    className={`py-3 pl-3 font-mono tabular-nums text-right font-bold ${
                      fi.direction === 'increases'
                        ? 'text-amber-700'
                        : fi.direction === 'decreases'
                        ? 'text-emerald-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {fi.local_impact_kg > 0 ? `+${fi.local_impact_kg}` : fi.local_impact_kg} kg
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ML Pipeline Evaluation Metrics & Confusion Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Trained Model Validation Metrics & Confusion Matrix
            </h2>
            <p className="text-xs text-slate-500">{mInfo.dataset_label}</p>
          </div>
          <span className="text-xs font-mono text-slate-600">
            Train N={mInfo.training_samples} · Test N={mInfo.test_samples}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-800">
              1. Regression Pipeline ({mInfo.regression_model})
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block">MAE</span>
                <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                  {mInfo.regression_metrics.mae} kg
                </span>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block">RMSE</span>
                <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                  {mInfo.regression_metrics.rmse} kg
                </span>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block">R² Score</span>
                <span className="text-base font-bold font-mono tabular-nums text-emerald-700">
                  {mInfo.regression_metrics.r2}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500">{mInfo.confidence_note}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-800">
              2. Risk Classifier ({mInfo.classification_model})
            </h3>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block">Accuracy</span>
                <span className="font-bold font-mono text-slate-900">
                  {Math.round(mInfo.classification_metrics.accuracy * 100)}%
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block">Precision</span>
                <span className="font-bold font-mono text-slate-900">
                  {Math.round(mInfo.classification_metrics.precision * 100)}%
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block">Recall</span>
                <span className="font-bold font-mono text-slate-900">
                  {Math.round(mInfo.classification_metrics.recall * 100)}%
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block">F1 Score</span>
                <span className="font-bold font-mono text-emerald-700">
                  {Math.round(mInfo.classification_metrics.f1 * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EcoForecastView: React.FC<ViewNavProps> = ({ onNavigate }) => {
  const [horizonMonths, setHorizonMonths] = useState<number>(6);
  const [historyWindow, setHistoryWindow] = useState<number>(12);
  const [forecast, setForecast] = useState<Awaited<ReturnType<typeof api.getForecast>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .getForecast(horizonMonths)
      .then((res) => {
        if (mounted) setForecast(res);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [horizonMonths]);

  const filteredSeries = useMemo(() => {
    if (!forecast?.series) return [];
    const histPoints = forecast.series.filter((p) => p.historical_kg !== null);
    const predOnlyPoints = forecast.series.filter((p) => p.historical_kg === null);
    const slicedHist = histPoints.slice(-historyWindow);
    return [...slicedHist, ...predOnlyPoints];
  }, [forecast, historyWindow]);

  const chartConfig = useMemo(() => {
    if (filteredSeries.length === 0) return null;
    return {
      type: 'line' as const,
      data: {
        labels: filteredSeries.map((p) => p.month),
        datasets: [
          {
            label: 'Historical Footprint (kg CO₂e)',
            data: filteredSeries.map((p) => p.historical_kg),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.15)',
            borderWidth: 3,
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Forecasted Footprint (kg CO₂e)',
            data: filteredSeries.map((p) => p.predicted_kg),
            borderColor: '#0284c7',
            borderDash: [6, 4],
            borderWidth: 2.5,
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Upper Uncertainty Bound',
            data: filteredSeries.map((p) => p.upper_bound_kg),
            borderColor: 'rgba(148, 163, 184, 0.5)',
            borderDash: [2, 2],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'Lower Uncertainty Bound',
            data: filteredSeries.map((p) => p.lower_bound_kg),
            borderColor: 'rgba(148, 163, 184, 0.5)',
            borderDash: [2, 2],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: 'kg CO₂e / month' },
          },
        },
      },
    };
  }, [filteredSeries]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">Time-Series Carbon Projection Engine</p>
          <h1 className="text-2xl font-bold text-slate-900">Future Carbon Footprint Forecast</h1>
          <p className="text-sm text-slate-600 mt-1">
            Analyze historical footprint trends (1M, 3M, 6M, 12M) and project 3-month, 6-month, and 1-year trajectories.
          </p>
        </div>

        {/* Forecast Horizon Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {[
              { label: '1M Hist', val: 1 },
              { label: '3M Hist', val: 3 },
              { label: '6M Hist', val: 6 },
              { label: '12M Hist', val: 12 },
            ].map((btn) => (
              <button
                key={btn.val}
                type="button"
                onClick={() => setHistoryWindow(btn.val)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  historyWindow === btn.val
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-emerald-50 border border-emerald-200 rounded-lg">
            {[
              { label: '3 Months', val: 3 },
              { label: '6 Months', val: 6 },
              { label: '1 Year', val: 12 },
            ].map((btn) => (
              <button
                key={btn.val}
                type="button"
                onClick={() => setHorizonMonths(btn.val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  horizonMonths === btn.val
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-600">
          Computing {horizonMonths}-month carbon trajectory...
        </div>
      ) : !forecast || forecast.current_footprint_kg === null ? (
        <div className="bg-white border border-emerald-200 rounded-xl p-10 text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Forecast Unavailable — No Historical Baseline</h2>
          <p className="text-sm text-slate-600">{forecast?.interpretation}</p>
          <button
            onClick={() => onNavigate('calculator')}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700"
          >
            Calculate Baseline Footprint
          </button>
        </div>
      ) : (
        <>
          {forecast.limited_history_notice && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{forecast.limited_history_notice}</span>
            </div>
          )}

          {/* 4 Forecast Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <span className="text-xs text-slate-500">Current Baseline Footprint</span>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {forecast.current_footprint_kg} <span className="text-xs font-normal">kg CO₂e/mo</span>
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <span className="text-xs text-slate-500">
                Predicted Footprint (+{horizonMonths} Months)
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
                {forecast.predicted_final_kg} <span className="text-xs font-normal">kg CO₂e/mo</span>
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <span className="text-xs text-slate-500">Projected Percentage Change</span>
              <p
                className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
                  (forecast.percentage_change || 0) <= 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {(forecast.percentage_change || 0) > 0 ? '+' : ''}
                {forecast.percentage_change}%
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <span className="text-xs text-slate-500">Trajectory Trend</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{forecast.trend}</p>
            </div>
          </div>

          {/* Interactive Chart.js Forecast Graph */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Historical & Projected Carbon Emissions ({horizonMonths}-Month Horizon)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{forecast.interpretation}</p>
            </div>
            {chartConfig && <ChartCanvas config={chartConfig} height={310} />}
          </div>
        </>
      )}
    </div>
  );
};
