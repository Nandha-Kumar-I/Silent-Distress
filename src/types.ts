export interface EcoUser {
  id: string;
  name: string;
  email: string;
  age?: number;
  city?: string;
  household_size?: number;
  created_at: string;
  eco_points: number;
  level: number;
  level_title: string;
  units: 'metric' | 'imperial';
  theme: 'light' | 'dark';
  notifications_enabled: boolean;
  is_demo?: boolean;
}

export interface CalculatorInput {
  // 01 Personal Profile
  name: string;
  age: number;
  city: string;
  household_size: number;

  // 02 Transportation
  primary_transport: 'car_petrol' | 'car_diesel' | 'car_ev' | 'motorbike' | 'public_transit' | 'bicycle' | 'walking';
  daily_distance_km: number;
  travel_days_per_week: number;
  secondary_transport: 'none' | 'public_transit' | 'car_petrol' | 'motorbike' | 'bicycle' | 'walking';

  // 03 Energy Consumption
  electricity_kwh: number;
  renewable_pct: number;
  lpg_kg: number;
  solar_installed: 'yes' | 'no' | 'planned';

  // 04 Food & Lifestyle
  diet_type: 'vegan' | 'vegetarian' | 'pescatarian' | 'omnivore_low_meat' | 'omnivore_high_meat';
  food_waste_level: 'minimal' | 'low' | 'moderate' | 'high';
  local_food_pct: number;
  outside_meals_per_week: number;

  // 05 Waste Management
  waste_kg_per_week: number;
  recycling_frequency: 'always' | 'often' | 'sometimes' | 'never';
  composting: 'yes' | 'no';
  single_use_plastic: 'minimal' | 'low' | 'moderate' | 'high';

  // 06 Lifestyle & Others
  ac_hours_per_day: number;
  water_liters_per_day: number;
  clothes_buying_frequency: 'rarely' | 'quarterly' | 'monthly' | 'weekly';
  ewaste_disposal: 'certified_recycler' | 'trade_in' | 'mixed_trash' | 'stored';

  // Advanced Environmental Data (Optional)
  flights_short_haul_yearly?: number;
  flights_long_haul_yearly?: number;
  home_area_sqft?: number;
  green_appliances_pct?: number;
}

export interface EmissionBreakdown {
  Transportation: number;
  Energy: number;
  Food: number;
  Waste: number;
  LPG: number;
  Water: number;
  Lifestyle: number;
  Other: number;
}

export interface FeatureImportanceItem {
  feature: string;
  label: string;
  category: keyof EmissionBreakdown;
  importance_pct: number;
  local_impact_kg: number;
  direction: 'increases' | 'decreases' | 'neutral';
  user_value: string;
  benchmark_value: string;
  explanation: string;
}

export interface ModelMetricsSummary {
  regression_model: string;
  classification_model: string;
  anomaly_model: string;
  dataset_label: string;
  training_samples: number;
  test_samples: number;
  regression_metrics: {
    mae: number;
    rmse: number;
    r2: number;
  };
  classification_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    confusion_matrix: number[][];
    classes: string[];
  };
  confidence: number | null;
  confidence_note: string;
}

export interface FootprintRecord {
  id: string;
  user_id: string;
  created_at: string;
  month_label: string;
  inputs: CalculatorInput;
  predicted_footprint_kg: number;
  eco_score: number;
  risk_category: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Critical Risk';
  top_contributor: keyof EmissionBreakdown;
  change_from_previous_pct: number | null;
  emission_breakdown: EmissionBreakdown;
  feature_importances: FeatureImportanceItem[];
  model_info: ModelMetricsSummary;
  status: 'Verified ML Run' | 'Simulated Run' | 'Historical Record';
}

export interface ForecastPoint {
  month: string;
  historical_kg: number | null;
  predicted_kg: number | null;
  lower_bound_kg: number | null;
  upper_bound_kg: number | null;
}

export interface ForecastResponse {
  has_sufficient_history: boolean;
  limited_history_notice: string | null;
  horizon_months: number;
  current_footprint_kg: number | null;
  predicted_final_kg: number | null;
  percentage_change: number | null;
  trend: 'Decreasing' | 'Stable' | 'Increasing' | 'Insufficient Data';
  interpretation: string;
  series: ForecastPoint[];
}

export interface WhatIfRequest {
  daily_distance_km: number;
  electricity_kwh: number;
  lpg_kg: number;
  waste_kg_per_week: number;
  diet_type: CalculatorInput['diet_type'];
  recycling_frequency: CalculatorInput['recycling_frequency'];
  ac_hours_per_day: number;
  renewable_pct: number;
}

export interface WhatIfResponse {
  current_prediction: number;
  simulated_prediction: number;
  absolute_reduction: number;
  percentage_reduction: number;
  current_eco_score: number;
  simulated_eco_score: number;
  simulated_risk: string;
  category_changes: Record<keyof EmissionBreakdown, { current: number; simulated: number; delta: number }>;
  recommendations: RecommendationItem[];
}

export interface ScenarioItem {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  parameters: WhatIfRequest;
  predicted_footprint_kg: number;
  reduction_vs_current_kg: number;
  reduction_vs_current_pct: number;
  eco_score: number;
  risk_category: string;
  transport_impact_kg: number;
  energy_impact_kg: number;
  waste_impact_kg: number;
  emission_breakdown: EmissionBreakdown;
}

export interface GoalItem {
  id: string;
  user_id: string;
  title: string;
  category: string;
  baseline_footprint_kg: number;
  current_footprint_kg: number;
  target_footprint_kg: number;
  target_reduction_pct: number;
  required_reduction_kg: number;
  progress_pct: number;
  start_date: string;
  target_date: string;
  days_remaining: number;
  status: 'On Track' | 'Needs Attention' | 'Achieved' | 'At Risk';
  milestones: Array<{ label: string; target_kg: number; reached: boolean }>;
}

export interface AnomalyItem {
  id: string;
  user_id: string;
  date: string;
  severity: 'High' | 'Medium' | 'Low';
  metric: 'Electricity' | 'Transport' | 'Waste' | 'Overall Footprint';
  current_value: number;
  baseline_value: number;
  unit: string;
  isolation_score: number;
  deviation_pct: number;
  explanation: string;
}

export interface RecommendationItem {
  id: string;
  category: keyof EmissionBreakdown;
  title: string;
  description: string;
  estimated_reduction_kg: number;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  priority: 'High' | 'Medium' | 'Low';
  reason: string;
}

export interface AchievementItem {
  id: string;
  code: string;
  title: string;
  description: string;
  points: number;
  icon: string;
  unlocked: boolean;
  unlocked_at: string | null;
  progress_pct: number;
  requirement_text: string;
}

export interface DigitalTwinState {
  has_data: boolean;
  current_footprint_kg: number | null;
  eco_score: number | null;
  twin_age_days: number;
  twin_status: 'Thriving Biosphere' | 'Balanced Ecosystem' | 'Stressed Canopy' | 'Critical Warming' | 'Uninitialized Twin';
  twin_summary: string;
  visual_state: {
    tree_count: number;
    air_clarity_pct: number;
    solar_active: boolean;
    transport_mode: string;
    recycling_tier: string;
    home_efficiency_pct: number;
    water_conservation_pct: number;
  };
  composition: EmissionBreakdown | null;
  evolution: Array<{ month: string; footprint_kg: number; eco_score: number; status: string }>;
  future_forecast_6m_kg: number | null;
  ai_insights: string[];
  anomalies: AnomalyItem[];
  goals: GoalItem[];
  recommendations: RecommendationItem[];
}
