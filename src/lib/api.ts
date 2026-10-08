import {
  EcoUser,
  CalculatorInput,
  FootprintRecord,
  ForecastResponse,
  WhatIfRequest,
  WhatIfResponse,
  ScenarioItem,
  GoalItem,
  AnomalyItem,
  RecommendationItem,
  AchievementItem,
  DigitalTwinState,
  EmissionBreakdown,
  FeatureImportanceItem,
  ModelMetricsSummary,
} from '../types';

const TOKEN_STORAGE_KEY = 'ecotwin_jwt_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export class ApiError extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError('Backend unavailable. Please check your network or server connection.', 0);
  }

  if (!response.ok) {
    let errorDetail = `Request failed (${response.status})`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.error || errJson.message || errorDetail;
    } catch {
      // fallback
    }
    if (response.status === 401) {
      setStoredToken(null);
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getHealth: () =>
    request<{
      status: string;
      service: string;
      ml_available: boolean;
      models_loaded: Record<string, string>;
      metrics: { mae: number; rmse: number; r2: number };
      dataset_notice: string;
    }>('/api/health'),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    age?: number;
    city?: string;
    household_size?: number;
  }) =>
    request<{ access_token: string; token_type: string; user: EcoUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ access_token: string; token_type: string; user: EcoUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: EcoUser }>('/api/auth/me'),

  getCalculatorDraft: () =>
    request<{ draft: CalculatorInput | null; latest_record: FootprintRecord | null }>('/api/calculator/draft'),

  saveCalculatorDraft: (input: CalculatorInput) =>
    request<{ message: string; draft: CalculatorInput }>('/api/calculator/draft', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  predictFootprint: (input: CalculatorInput) =>
    request<{
      predicted_footprint_kg: number;
      current_footprint_kg: number | null;
      eco_score: number;
      risk_category: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Critical Risk';
      top_contributor: keyof EmissionBreakdown;
      change_from_previous_pct: number | null;
      emission_breakdown: EmissionBreakdown;
      feature_importances: FeatureImportanceItem[];
      model_info: ModelMetricsSummary;
    }>('/api/calculator/predict', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  calculateFootprint: (input: CalculatorInput) =>
    request<{
      record: FootprintRecord;
      current_footprint_kg: number | null;
      recommendations: RecommendationItem[];
      user: EcoUser;
    }>('/api/calculator/analyze', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getDashboard: () =>
    request<{
      has_data: boolean;
      user: EcoUser;
      current_footprint_kg: number | null;
      change_from_previous_pct: number | null;
      eco_score: number | null;
      risk_category: string | null;
      top_contributor: keyof EmissionBreakdown | null;
      future_prediction_6m_kg: number | null;
      community_rank: {
        percentile_better_than: number | null;
        community_average_kg: number;
        is_demo_aggregate: boolean;
        notice: string | null;
      };
      emission_breakdown: EmissionBreakdown | null;
      feature_importances: FeatureImportanceItem[];
      recommendations: RecommendationItem[];
      forecast: ForecastResponse;
      anomalies: AnomalyItem[];
      monthly_history: FootprintRecord[];
      recent_achievements: AchievementItem[];
      eco_points: number;
      level: number;
      level_title: string;
      goals: GoalItem[];
      environmental_context: {
        trees_needed_monthly: number;
        km_driven_equivalent: number;
        smartphone_charges_equivalent: number;
        sustainable_target_kg: number;
      } | null;
    }>('/api/dashboard'),

  getTwin: () => request<DigitalTwinState>('/api/twin'),

  getAnalysis: () =>
    request<{
      has_data: boolean;
      message?: string;
      record?: FootprintRecord;
      current_footprint_kg?: number;
      eco_score?: number;
      risk_category?: string;
      top_contributor?: keyof EmissionBreakdown;
      emission_breakdown?: EmissionBreakdown;
      feature_importances?: FeatureImportanceItem[];
      model_info: ModelMetricsSummary;
      recommendations?: RecommendationItem[];
      expected_reduction_kg?: number;
      why_footprint_explanation?: string;
    }>('/api/analysis'),

  getAnalysisExplain: () =>
    request<{
      has_data: boolean;
      method: string;
      baseline_footprint_kg?: number;
      predicted_footprint_kg?: number;
      feature_importances: FeatureImportanceItem[];
      emission_breakdown?: EmissionBreakdown;
      model_info: ModelMetricsSummary;
    }>('/api/analysis/explain'),

  getForecast: (months = 6) => request<ForecastResponse>(`/api/forecast?months=${months}`),

  runWhatIfSimulation: (params: Partial<WhatIfRequest>) =>
    request<
      WhatIfResponse & {
        base_parameters: WhatIfRequest;
        simulated_parameters: WhatIfRequest;
      }
    >('/api/simulator/what-if', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getScenarios: () =>
    request<{
      scenarios: ScenarioItem[];
      current_baseline: {
        predicted_footprint_kg: number;
        eco_score: number;
        emission_breakdown: EmissionBreakdown;
      } | null;
    }>('/api/scenarios'),

  createScenario: (payload: { name: string; description: string; parameters: WhatIfRequest }) =>
    request<ScenarioItem>('/api/scenarios', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteScenario: (id: string) =>
    request<{ message: string }>(`/api/scenarios/${id}`, {
      method: 'DELETE',
    }),

  compareScenarios: (scenarioIds: string[]) =>
    request<{
      baseline: {
        name: string;
        predicted_footprint_kg: number;
        reduction_vs_current_kg: number;
        reduction_vs_current_pct: number;
        eco_score: number;
        transport_impact_kg: number;
        energy_impact_kg: number;
        waste_impact_kg: number;
      } | null;
      scenarios: ScenarioItem[];
    }>('/api/scenarios/compare', {
      method: 'POST',
      body: JSON.stringify({ scenario_ids: scenarioIds }),
    }),

  getGoals: () =>
    request<{
      goals: GoalItem[];
      current_footprint_kg: number | null;
    }>('/api/goals'),

  createGoal: (payload: {
    title: string;
    category: string;
    target_reduction_pct: number;
    months_duration: number;
  }) =>
    request<GoalItem>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateGoal: (
    id: string,
    payload: { title?: string; category?: string; target_reduction_pct?: number }
  ) =>
    request<GoalItem>(`/api/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteGoal: (id: string) =>
    request<{ message: string }>(`/api/goals/${id}`, {
      method: 'DELETE',
    }),

  getHistory: (filters?: {
    risk?: string;
    contributor?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.risk && filters.risk !== 'all') params.set('risk', filters.risk);
    if (filters?.contributor && filters.contributor !== 'all')
      params.set('contributor', filters.contributor);
    if (filters?.start_date) params.set('start_date', filters.start_date);
    if (filters?.end_date) params.set('end_date', filters.end_date);
    const qs = params.toString();
    return request<{ count: number; records: FootprintRecord[] }>(
      `/api/history${qs ? `?${qs}` : ''}`
    );
  },

  deleteHistoryRecord: (id: string) =>
    request<{ message: string }>(`/api/history/${id}`, {
      method: 'DELETE',
    }),

  clearAllHistory: () =>
    request<{ message: string }>('/api/history', {
      method: 'DELETE',
    }),

  getAnomalies: () =>
    request<{
      model: string;
      has_records: boolean;
      anomalies: AnomalyItem[];
    }>('/api/anomalies'),

  getRecommendations: () =>
    request<{
      has_data: boolean;
      current_footprint_kg?: number;
      recommendations: RecommendationItem[];
      total_potential_saving_kg: number;
    }>('/api/recommendations'),

  getAchievements: () =>
    request<{
      eco_points: number;
      level: number;
      level_title: string;
      achievements: AchievementItem[];
    }>('/api/achievements'),

  generateReport: async (
    reportType: 'Sustainability Report' | 'Digital Twin Report' | 'Monthly Report'
  ): Promise<void> => {
    const token = getStoredToken();
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ report_type: reportType }),
    });
    if (!res.ok) {
      throw new ApiError('Failed to generate PDF report', res.status);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType.toLowerCase().replace(/\s+/g, '_')}_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  getReportsList: () =>
    request<{
      reports: Array<{
        id: string;
        report_type: string;
        created_at: string;
        footprint_kg: number | null;
        eco_score: number | null;
        risk_category: string | null;
        summary: string;
      }>;
    }>('/api/reports'),

  getCommunity: () =>
    request<{
      is_demo_aggregate: boolean;
      notice: string;
      total_anonymous_participants: number;
      community_average_kg: number;
      sustainable_target_kg: number;
      user_footprint_kg: number | null;
      user_eco_score: number | null;
      percentile_better_than: number | null;
      category_averages: Record<string, number>;
      user_categories: EmissionBreakdown | null;
      improvement_statistics: {
        avg_6m_reduction_pct: number;
        solar_or_renewable_adoption_pct: number;
        active_composting_pct: number;
        low_emission_transit_pct: number;
      };
      distribution_buckets: Array<{ range: string; pct: number }>;
    }>('/api/community'),

  getSettings: () =>
    request<{
      user: EcoUser;
      data_summary: {
        footprint_records: number;
        goals: number;
        scenarios: number;
      };
    }>('/api/settings'),

  updateSettings: (payload: {
    name?: string;
    age?: number;
    city?: string;
    household_size?: number;
    units?: 'metric' | 'imperial';
    theme?: 'light' | 'dark';
    notifications_enabled?: boolean;
  }) =>
    request<{ message: string; user: EcoUser }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
