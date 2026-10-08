import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import {
  GoalItem,
  FootprintRecord,
  AnomalyItem,
  RecommendationItem,
  AchievementItem,
  EcoUser,
} from '../types';
import { ChartCanvas } from './ChartCanvas';
import {
  Target,
  PlusCircle,
  Trash2,
  Edit3,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Award,
  FileDown,
  Users,
  Settings,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Leaf,
} from 'lucide-react';

// -------------------------------------------------------------------
// 1. GOALS & TRACKER VIEW
// -------------------------------------------------------------------
export const EcoGoalsView: React.FC = () => {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [currentFp, setCurrentFp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('Reduce carbon footprint by 20% in 6 months');
  const [category, setCategory] = useState('Overall Footprint');
  const [targetReductionPct, setTargetReductionPct] = useState(20);
  const [monthsDuration, setMonthsDuration] = useState(6);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const loadGoals = () => {
    setLoading(true);
    api
      .getGoals()
      .then((res) => {
        setGoals(res.goals);
        setCurrentFp(res.current_footprint_kg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (editingGoalId) {
      await api.updateGoal(editingGoalId, {
        title,
        category,
        target_reduction_pct: targetReductionPct,
      });
      setEditingGoalId(null);
    } else {
      await api.createGoal({
        title,
        category,
        target_reduction_pct: targetReductionPct,
        months_duration: monthsDuration,
      });
    }
    setTitle('Reduce carbon footprint by 15% in 6 months');
    loadGoals();
  };

  const startEdit = (g: GoalItem) => {
    setEditingGoalId(g.id);
    setTitle(g.title);
    setCategory(g.category);
    setTargetReductionPct(g.target_reduction_pct);
  };

  const handleDelete = async (id: string) => {
    await api.deleteGoal(id);
    loadGoals();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-xs font-semibold text-emerald-700">Dynamic Target Tracking</p>
        <h1 className="text-2xl font-bold text-slate-900">Environmental Goals & Milestones</h1>
        <p className="text-sm text-slate-600 mt-1">
          Set measurable carbon reduction goals and track progress automatically against your latest ML footprint assessments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCreateOrUpdate}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit"
        >
          <h2 className="text-base font-bold text-slate-900">
            {editingGoalId ? 'Edit Environmental Goal' : 'Create Environmental Goal'}
          </h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Goal Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Focus Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="Overall Footprint">Overall Footprint</option>
              <option value="Transportation">Transportation</option>
              <option value="Energy">Energy Consumption</option>
              <option value="Food">Food & Diet</option>
              <option value="Waste">Waste Management</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Reduction (%)
              </label>
              <input
                type="number"
                min={5}
                max={75}
                value={targetReductionPct}
                onChange={(e) => setTargetReductionPct(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Timeline (Months)
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={monthsDuration}
                onChange={(e) => setMonthsDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
            >
              {editingGoalId ? 'Save Changes' : 'Create Goal'}
            </button>
            {editingGoalId && (
              <button
                type="button"
                onClick={() => setEditingGoalId(null)}
                className="px-3 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="lg:col-span-8 space-y-4">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">
              Loading goals...
            </div>
          ) : goals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500">
              No environmental goals created yet. Use the form on the left to set your first reduction target.
            </div>
          ) : (
            goals.map((g) => (
              <div key={g.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{g.category}</span>
                      <span>·</span>
                      <span className="font-semibold text-emerald-700">Status: {g.status}</span>
                      <span>·</span>
                      <span className="font-mono">{g.days_remaining} days remaining</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{g.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(g)}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 rounded border border-slate-200"
                      title="Edit Goal"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-1.5 text-slate-600 hover:text-red-600 rounded border border-slate-200"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Current Footprint</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {currentFp ?? g.current_footprint_kg} kg
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/70 rounded-lg">
                    <span className="text-emerald-800 block">Target Footprint</span>
                    <span className="font-mono font-bold text-emerald-950 text-sm">
                      {g.target_footprint_kg} kg
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Required Reduction</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {g.required_reduction_kg} kg/mo
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 block">Progress</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {g.progress_pct}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${g.progress_pct}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  {g.milestones.map((m, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        m.reached
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>{m.label}</span>
                      <span className="font-mono font-semibold">{m.target_kg} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------
// 2. HISTORY VIEW
// -------------------------------------------------------------------
export const EcoHistoryView: React.FC = () => {
  const [records, setRecords] = useState<FootprintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState('all');
  const [contributorFilter, setContributorFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<FootprintRecord | null>(null);

  const fetchHistory = () => {
    setLoading(true);
    api
      .getHistory({
        risk: riskFilter,
        contributor: contributorFilter,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })
      .then((res) => setRecords(res.records))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, [riskFilter, contributorFilter, startDate, endDate]);

  const handleDelete = async (id: string) => {
    await api.deleteHistoryRecord(id);
    if (selectedRecord?.id === id) setSelectedRecord(null);
    fetchHistory();
  };

  const handleExportRecord = (rec: FootprintRecord) => {
    const csv = [
      'Date,Month,Footprint_kg_CO2e,Eco_Score,Major_Contributor,Risk_Category,Status',
      `${rec.created_at.slice(0, 10)},${rec.month_label},${rec.predicted_footprint_kg},${rec.eco_score},${rec.top_contributor},${rec.risk_category},${rec.status}`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecotwin_record_${rec.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartConfig = useMemo(() => {
    if (records.length === 0) return null;
    const chron = [...records].reverse();
    return {
      type: 'line' as const,
      data: {
        labels: chron.map((r) => r.month_label),
        datasets: [
          {
            label: 'Carbon Footprint (kg CO₂e/mo)',
            data: chron.map((r) => r.predicted_footprint_kg),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.12)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
    };
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">Longitudinal Environmental Log</p>
          <h1 className="text-2xl font-bold text-slate-900">Carbon Footprint History</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">All Risk Tiers</option>
            <option value="Low Risk">Low Risk</option>
            <option value="Moderate Risk">Moderate Risk</option>
            <option value="High Risk">High Risk</option>
            <option value="Critical Risk">Critical Risk</option>
          </select>
          <select
            value={contributorFilter}
            onChange={(e) => setContributorFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="all">All Contributors</option>
            <option value="Transportation">Transportation</option>
            <option value="Energy">Energy</option>
            <option value="Food">Food</option>
            <option value="Waste">Waste</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
          />
        </div>
      </div>

      {chartConfig && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Historical Footprint Trend</h2>
          <ChartCanvas config={chartConfig} height={220} />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {loading ? (
          <p className="text-xs text-slate-500 py-8 text-center">Loading history...</p>
        ) : records.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">No history available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 px-3 text-right">Carbon Footprint</th>
                  <th className="py-2.5 px-3 text-right">Eco Score</th>
                  <th className="py-2.5 px-3">Major Contributor</th>
                  <th className="py-2.5 px-3">Risk</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-mono">
                      {r.created_at.slice(0, 10)} ({r.month_label})
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {r.predicted_footprint_kg} kg CO₂e
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                      {r.eco_score}/100
                    </td>
                    <td className="py-3 px-3">{r.top_contributor}</td>
                    <td className="py-3 px-3 font-medium">{r.risk_category}</td>
                    <td className="py-3 px-3 text-slate-500">{r.status}</td>
                    <td className="py-3 pl-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleExportRecord(r)}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-medium"
                      >
                        Export
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="bg-emerald-950 text-white rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">
              Record Inspection — {selectedRecord.month_label} ({selectedRecord.created_at.slice(0, 10)})
            </h3>
            <button
              onClick={() => setSelectedRecord(null)}
              className="text-xs text-emerald-300 hover:underline"
            >
              Close Inspection
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {Object.entries(selectedRecord.emission_breakdown).map(([cat, val]) => (
              <div key={cat} className="p-3 bg-emerald-900/60 rounded-lg border border-emerald-800">
                <span className="text-emerald-300 block">{cat}</span>
                <span className="font-mono font-bold text-white text-sm">{val} kg CO₂e</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------------
// 3. ANOMALIES VIEW (IsolationForest)
// -------------------------------------------------------------------
export const EcoAnomaliesView: React.FC = () => {
  const [data, setData] = useState<{
    model: string;
    has_records: boolean;
    anomalies: AnomalyItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAnomalies()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-xs font-semibold text-emerald-700">
          Unsupervised Outlier Detection ({data?.model || 'IsolationForest'})
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Environmental Anomaly Alerts</h1>
        <p className="text-sm text-slate-600 mt-1">
          Detects unusual spikes across Electricity, Transport, Waste, and Overall Carbon Footprint relative to baseline distributions.
        </p>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
          Running IsolationForest anomaly scan...
        </div>
      ) : !data || data.anomalies.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">No anomalies detected</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All recorded Electricity, Transport, Waste, and Overall Footprint values fall within expected IsolationForest partition depths.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-3">Severity</th>
                <th className="py-2.5 px-3">Metric</th>
                <th className="py-2.5 px-3 text-right">Current Value</th>
                <th className="py-2.5 px-3 text-right">Baseline</th>
                <th className="py-2.5 px-3">Explanation</th>
                <th className="py-2.5 pl-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.anomalies.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-3 font-bold">
                    <span
                      className={
                        a.severity === 'High'
                          ? 'text-red-700'
                          : a.severity === 'Medium'
                          ? 'text-amber-700'
                          : 'text-slate-700'
                      }
                    >
                      {a.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900">{a.metric}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {a.current_value} {a.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    {a.baseline_value} {a.unit}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-md">{a.explanation}</td>
                  <td className="py-3 pl-3 text-right font-mono text-slate-500">{a.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------------
// 4. RECOMMENDATIONS VIEW
// -------------------------------------------------------------------
export const EcoRecommendationsView: React.FC = () => {
  const [data, setData] = useState<{
    has_data: boolean;
    current_footprint_kg?: number;
    recommendations: RecommendationItem[];
    total_potential_saving_kg: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getRecommendations()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">Personalized AI Action Plan</p>
          <h1 className="text-2xl font-bold text-slate-900">Sustainability Recommendations</h1>
          <p className="text-sm text-slate-600 mt-1">
            Generated dynamically from your specific transport, energy, dietary, and waste profile.
          </p>
        </div>
        {data?.has_data && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-right">
            <span className="text-xs text-emerald-800 block">Total Potential Monthly Saving</span>
            <span className="text-lg font-bold font-mono text-emerald-950">
              -{data.total_potential_saving_kg} kg CO₂e/mo
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
          Loading personalized recommendations...
        </div>
      ) : !data || !data.has_data || data.recommendations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
          No recommendations yet — complete your Carbon Calculator assessment first.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-700">
                    {rec.category} · {rec.priority} Priority · {rec.difficulty}
                  </span>
                  <span className="font-mono font-bold text-emerald-800">
                    -{rec.estimated_reduction_kg} kg CO₂e/mo
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{rec.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                <strong className="text-slate-700">Why recommended for you:</strong> {rec.reason}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------------
// 5. ACHIEVEMENTS VIEW
// -------------------------------------------------------------------
export const EcoAchievementsView: React.FC = () => {
  const [data, setData] = useState<{
    eco_points: number;
    level: number;
    level_title: string;
    achievements: AchievementItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAchievements()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">Verified Environmental Gamification</p>
          <h1 className="text-2xl font-bold text-slate-900">Eco Points, Levels & Achievements</h1>
          <p className="text-sm text-slate-600 mt-1">
            Earned strictly from your actual Carbon Calculator assessments, Scenario Lab runs, and Goals.
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-4 bg-emerald-950 text-white px-5 py-3 rounded-xl">
            <div>
              <span className="text-xs text-emerald-300 block">Current Level {data.level}</span>
              <span className="text-base font-bold">{data.level_title}</span>
            </div>
            <div className="pl-4 border-l border-emerald-800">
              <span className="text-xs text-emerald-300 block">Total Eco Points</span>
              <span className="text-xl font-mono font-bold text-emerald-200">{data.eco_points}</span>
            </div>
          </div>
        )}
      </div>

      {loading || !data ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
          Loading achievements...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.achievements.map((ach) => (
            <div
              key={ach.id}
              className={`rounded-xl p-5 border flex flex-col justify-between space-y-4 ${
                ach.unlocked
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : 'bg-white border-slate-200 opacity-75'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-semibold ${
                      ach.unlocked ? 'text-emerald-800' : 'text-slate-500'
                    }`}
                  >
                    {ach.unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                  <span className="font-mono font-bold text-emerald-700">+{ach.points} pts</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{ach.title}</h3>
                <p className="text-xs text-slate-600">{ach.description}</p>
              </div>
              <div className="space-y-1.5">
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600"
                    style={{ width: `${ach.progress_pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">{ach.requirement_text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------------
// 6. REPORTS VIEW (PDF Generation)
// -------------------------------------------------------------------
export const EcoReportsView: React.FC = () => {
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [reports, setReports] = useState<
    Array<{
      id: string;
      report_type: string;
      created_at: string;
      footprint_kg: number | null;
      eco_score: number | null;
      risk_category: string | null;
      summary: string;
    }>
  >([]);

  const loadReports = () => {
    api.getReportsList().then((res) => setReports(res.reports));
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleGenerate = async (
    type: 'Sustainability Report' | 'Digital Twin Report' | 'Monthly Report'
  ) => {
    setGeneratingType(type);
    try {
      await api.generateReport(type);
      loadReports();
    } finally {
      setGeneratingType(null);
    }
  };

  const reportCards: Array<{
    type: 'Sustainability Report' | 'Digital Twin Report' | 'Monthly Report';
    desc: string;
    includes: string;
  }> = [
    {
      type: 'Sustainability Report',
      desc: 'Comprehensive executive report of your Carbon Footprint, Eco Score, Risk Tier, 8-Category Emission Breakdown, XAI Feature Importance, and AI Recommendations.',
      includes: 'Footprint · Eco Score · Breakdown · XAI Explanation · Recommendations · Goals',
    },
    {
      type: 'Digital Twin Report',
      desc: 'Focused assessment of your Environmental Digital Twin biosphere state, canopy tree offset equivalents, home solar/grid efficiency, and 6-month trajectory.',
      includes: 'Digital Twin Status · Canopy Equivalents · Twin Evolution · 6M Forecast',
    },
    {
      type: 'Monthly Report',
      desc: 'Period-over-period audit comparing your latest monthly emissions, active scenarios in Scenario Lab, and progress toward reduction milestones.',
      includes: 'Monthly Summary · Scenario Lab Comparisons · Goal Milestones',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-xs font-semibold text-emerald-700">Exportable PDF Documentation</p>
        <h1 className="text-2xl font-bold text-slate-900">Sustainability & Digital Twin Reports</h1>
        <p className="text-sm text-slate-600 mt-1">
          Generate and download formatted PDF sustainability reports populated directly from your authenticated ML records.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportCards.map((card) => (
          <div
            key={card.type}
            className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">{card.type}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
              <p className="text-[11px] font-mono text-emerald-800 pt-2">{card.includes}</p>
            </div>
            <button
              onClick={() => handleGenerate(card.type)}
              disabled={generatingType !== null}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {generatingType === card.type ? 'Generating PDF...' : `Download ${card.type} (PDF)`}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Recently Generated Reports</h3>
        {reports.length === 0 ? (
          <p className="text-xs text-slate-500">No PDF reports generated in this session yet.</p>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div
                key={r.id}
                className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{r.report_type}</span>
                  <span className="text-slate-500 ml-2">{r.summary}</span>
                </div>
                <span className="font-mono text-slate-500">{r.created_at.slice(0, 16).replace('T', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------------
// 7. COMMUNITY VIEW (Anonymous Aggregate Data Only)
// -------------------------------------------------------------------
export const EcoCommunityView: React.FC = () => {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getCommunity>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCommunity()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const chartConfig = useMemo(() => {
    if (!data) return null;
    const cats = Object.keys(data.category_averages);
    return {
      type: 'bar' as const,
      data: {
        labels: cats,
        datasets: [
          {
            label: 'Community Anonymous Average (kg CO₂e)',
            data: cats.map((c) => data.category_averages[c]),
            backgroundColor: '#94a3b8',
            borderRadius: 4,
          },
          ...(data.user_categories
            ? [
                {
                  label: 'Your Footprint (kg CO₂e)',
                  data: cats.map((c) => (data.user_categories as any)[c] || 0),
                  backgroundColor: '#059669',
                  borderRadius: 4,
                },
              ]
            : []),
        ],
      },
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-xs font-semibold text-emerald-700">Privacy-Preserving Benchmarking</p>
        <h1 className="text-2xl font-bold text-slate-900">Anonymous Community Statistics</h1>
        {data?.notice && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 inline-block">
            {data.notice}
          </p>
        )}
      </div>

      {loading || !data ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
          Loading anonymous aggregate statistics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <span className="text-xs text-slate-500">Community Average</span>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {data.community_average_kg} <span className="text-xs font-normal">kg CO₂e/mo</span>
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <span className="text-xs text-slate-500">Your Footprint</span>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
                {data.user_footprint_kg !== null ? `${data.user_footprint_kg} kg` : 'Not calculated'}
              </p>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5">
              <span className="text-xs text-emerald-800">Your Anonymous Percentile</span>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-950 mt-1">
                {data.percentile_better_than !== null
                  ? `Better than ${data.percentile_better_than}%`
                  : 'N/A'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <span className="text-xs text-slate-500">Sustainable Per-Capita Target</span>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {data.sustainable_target_kg} <span className="text-xs font-normal">kg CO₂e/mo</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                Category Averages vs. Your Footprint
              </h2>
              {chartConfig && <ChartCanvas config={chartConfig} height={260} />}
            </div>

            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Community Improvement Statistics</h2>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg flex justify-between">
                  <span className="text-slate-600">Avg 6-Month Reduction</span>
                  <span className="font-mono font-bold text-emerald-700">
                    -{data.improvement_statistics.avg_6m_reduction_pct}%
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg flex justify-between">
                  <span className="text-slate-600">Solar / Clean Energy Adoption</span>
                  <span className="font-mono font-bold text-slate-900">
                    {data.improvement_statistics.solar_or_renewable_adoption_pct}%
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg flex justify-between">
                  <span className="text-slate-600">Active Organic Composting</span>
                  <span className="font-mono font-bold text-slate-900">
                    {data.improvement_statistics.active_composting_pct}%
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg flex justify-between">
                  <span className="text-slate-600">Low-Emission Transit Commute</span>
                  <span className="font-mono font-bold text-slate-900">
                    {data.improvement_statistics.low_emission_transit_pct}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// -------------------------------------------------------------------
// 8. SETTINGS VIEW
// -------------------------------------------------------------------
export const EcoSettingsView: React.FC<{ onUserUpdated: (u: EcoUser) => void }> = ({
  onUserUpdated,
}) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState(28);
  const [city, setCity] = useState('');
  const [householdSize, setHouseholdSize] = useState(2);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState(true);
  const [summary, setSummary] = useState({ footprint_records: 0, goals: 0, scenarios: 0 });
  const [saving, setSaving] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadSettings = () => {
    api.getSettings().then((res) => {
      setName(res.user.name);
      setAge(res.user.age || 28);
      setCity(res.user.city || '');
      setHouseholdSize(res.user.household_size || 2);
      setUnits(res.user.units || 'metric');
      setTheme(res.user.theme || 'light');
      setNotifications(res.user.notifications_enabled ?? true);
      setSummary(res.data_summary);
    });
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.updateSettings({
        name,
        age,
        city,
        household_size: householdSize,
        units,
        theme,
        notifications_enabled: notifications,
      });
      onUserUpdated(res.user);
      setStatusMsg('Profile, unit, and notification preferences saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteRecords = async () => {
    await api.clearAllHistory();
    setConfirmClearOpen(false);
    setStatusMsg('All environmental footprint records have been deleted.');
    loadSettings();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-xs font-semibold text-emerald-700">Account & Data Governance</p>
        <h1 className="text-2xl font-bold text-slate-900">Settings & Environmental Data Management</h1>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900">
          {statusMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h2 className="text-base font-bold text-slate-900">Profile, Units & Theme Preferences</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Age</label>
            <input
              type="number"
              min={10}
              max={110}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Household Size</label>
            <input
              type="number"
              min={1}
              max={25}
              value={householdSize}
              onChange={(e) => setHouseholdSize(Number(e.target.value))}
              className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Measurement Units</label>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value as 'metric' | 'imperial')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="metric">Metric (kg CO₂e, km, kWh, Liters)</option>
              <option value="imperial">Imperial Display Reference (lbs, miles, gallons)</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Theme Preference</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="light">Light Environmental Theme (Default)</option>
              <option value="dark">High-Contrast Slate</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-xs text-slate-700 font-medium pt-2">
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
            className="accent-emerald-600 w-4 h-4"
          />
          <span>Enable Anomaly Alerts and Monthly Goal Progress Notifications</span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
        >
          {saving ? 'Saving Preferences...' : 'Save Preferences'}
        </button>
      </form>

      {/* Destructive Data Management Section with Confirmation */}
      <div className="bg-white border border-red-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Environmental Data Management</h2>
        <p className="text-xs text-slate-600">
          You currently have <strong className="font-mono">{summary.footprint_records}</strong> footprint records,{' '}
          <strong className="font-mono">{summary.goals}</strong> goals, and{' '}
          <strong className="font-mono">{summary.scenarios}</strong> scenarios stored.
        </p>

        {!confirmClearOpen ? (
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg"
          >
            Delete All Environmental Footprint Records
          </button>
        ) : (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
            <p className="text-xs font-bold text-red-900">
              Are you sure you want to permanently delete all your environmental footprint records? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmDeleteRecords}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
              >
                Yes, Permanently Delete My Records
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
