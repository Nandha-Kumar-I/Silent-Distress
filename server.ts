import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { ecoTwinML } from './src/lib/ecoTwinMl';
import { generateSustainabilityPdfBuffer } from './src/lib/pdfGenerator';
import {
  EcoUser,
  CalculatorInput,
  FootprintRecord,
  GoalItem,
  ScenarioItem,
  DigitalTwinState,
  WhatIfRequest,
} from './src/types';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.SECRET_KEY || 'ecotwin_dev_jwt_secret_key_2026';
const DB_FILE = path.join(process.cwd(), 'ecotwin_store.json');

interface StoredUser extends EcoUser {
  password_hash: string;
  salt: string;
}

interface ReportRecord {
  id: string;
  user_id: string;
  report_type: 'Sustainability Report' | 'Digital Twin Report' | 'Monthly Report';
  created_at: string;
  footprint_kg: number | null;
  eco_score: number | null;
  risk_category: string | null;
  summary: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  drafts: Record<string, CalculatorInput>;
  footprint_records: FootprintRecord[];
  goals: GoalItem[];
  scenarios: ScenarioItem[];
  reports: ReportRecord[];
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

function signJwt(payload: { sub: string; email: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token: string): { sub: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { sub: decoded.sub, email: decoded.email };
  } catch {
    return null;
  }
}

function createInitialSeedDatabase(): DatabaseSchema {
  const demoId = 'usr_demo_ecotwin_01';
  const { hash, salt } = hashPassword('EcoTwin2026!');
  const demoUser: StoredUser = {
    id: demoId,
    name: 'Demo Environmental Account (Dev Seed)',
    email: 'demo@ecotwin.org',
    age: 29,
    city: 'Greenfield Metro (Synthetic Seed)',
    household_size: 3,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString(),
    eco_points: 680,
    level: 4,
    level_title: 'Biosphere Architect',
    units: 'metric',
    theme: 'light',
    notifications_enabled: true,
    is_demo: true,
    password_hash: hash,
    salt,
  };

  // Create 6 months of synthetic development history for the demo user ONLY
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const demoRecords: FootprintRecord[] = [];
  const monthlyConfigs: Array<{ dist: number; elec: number; ac: number; waste: number; renew: number }> = [
    { dist: 34, elec: 310, ac: 5.5, waste: 11.5, renew: 15 },
    { dist: 31, elec: 290, ac: 5.0, waste: 10.2, renew: 20 },
    { dist: 28, elec: 365, ac: 7.5, waste: 9.8, renew: 25 }, // Intentional summer AC spike for IsolationForest demo
    { dist: 24, elec: 245, ac: 3.5, waste: 8.5, renew: 35 },
    { dist: 21, elec: 220, ac: 2.5, waste: 7.4, renew: 42 },
    { dist: 18, elec: 198, ac: 2.0, waste: 6.5, renew: 50 },
  ];

  let prevFp: number | null = null;
  for (let i = 0; i < monthlyConfigs.length; i++) {
    const mOffset = monthlyConfigs.length - 1 - i;
    const d = new Date(now.getFullYear(), now.getMonth() - mOffset, 12);
    const cfg = monthlyConfigs[i];
    const inp: CalculatorInput = {
      name: demoUser.name,
      age: 29,
      city: demoUser.city || 'Greenfield Metro',
      household_size: 3,
      primary_transport: i < 3 ? 'car_petrol' : 'public_transit',
      daily_distance_km: cfg.dist,
      travel_days_per_week: 5,
      secondary_transport: 'bicycle',
      electricity_kwh: cfg.elec,
      renewable_pct: cfg.renew,
      lpg_kg: 10.5 - i * 0.4,
      solar_installed: i >= 4 ? 'yes' : 'planned',
      diet_type: i < 2 ? 'omnivore_high_meat' : 'omnivore_low_meat',
      food_waste_level: i < 3 ? 'moderate' : 'low',
      local_food_pct: 40 + i * 5,
      outside_meals_per_week: Math.max(1, 4 - Math.floor(i / 2)),
      waste_kg_per_week: cfg.waste,
      recycling_frequency: i >= 3 ? 'always' : 'often',
      composting: i >= 4 ? 'yes' : 'no',
      single_use_plastic: i >= 3 ? 'low' : 'moderate',
      ac_hours_per_day: cfg.ac,
      water_liters_per_day: 165 - i * 6,
      clothes_buying_frequency: 'quarterly',
      ewaste_disposal: 'certified_recycler',
      flights_short_haul_yearly: 1,
      flights_long_haul_yearly: 0,
      home_area_sqft: 1150,
      green_appliances_pct: 55 + i * 5,
    };

    const res = ecoTwinML.predictAndExplain(inp, prevFp);
    prevFp = res.predicted_footprint_kg;

    demoRecords.unshift({
      id: `rec_demo_${i + 1}`,
      user_id: demoId,
      created_at: d.toISOString(),
      month_label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      inputs: inp,
      predicted_footprint_kg: res.predicted_footprint_kg,
      eco_score: res.eco_score,
      risk_category: res.risk_category,
      top_contributor: res.top_contributor,
      change_from_previous_pct: res.change_from_previous_pct,
      emission_breakdown: res.emission_breakdown,
      feature_importances: res.feature_importances,
      model_info: res.model_info,
      status: 'Historical Record',
    });
  }

  const latestFp = demoRecords[0].predicted_footprint_kg;
  const baselineFp = demoRecords[demoRecords.length - 1].predicted_footprint_kg;
  const targetFp = Math.round(baselineFp * 0.75 * 10) / 10;
  const progressPct = Math.min(
    100,
    Math.max(0, Math.round(((baselineFp - latestFp) / Math.max(1, baselineFp - targetFp)) * 100))
  );

  const demoGoals: GoalItem[] = [
    {
      id: 'goal_demo_01',
      user_id: demoId,
      title: 'Reduce Monthly Carbon Footprint by 25% (Synthetic Demo Goal)',
      category: 'Overall Footprint',
      baseline_footprint_kg: baselineFp,
      current_footprint_kg: latestFp,
      target_footprint_kg: targetFp,
      target_reduction_pct: 25,
      required_reduction_kg: Math.max(0, Math.round((latestFp - targetFp) * 10) / 10),
      progress_pct: progressPct,
      start_date: demoRecords[demoRecords.length - 1].created_at.slice(0, 10),
      target_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 75).toISOString().slice(0, 10),
      days_remaining: 75,
      status: progressPct >= 100 ? 'Achieved' : progressPct >= 60 ? 'On Track' : 'Needs Attention',
      milestones: [
        { label: '10% Reduction Milestone', target_kg: Math.round(baselineFp * 0.9), reached: latestFp <= baselineFp * 0.9 },
        { label: '20% Reduction Milestone', target_kg: Math.round(baselineFp * 0.8), reached: latestFp <= baselineFp * 0.8 },
        { label: '25% Target Reached', target_kg: targetFp, reached: latestFp <= targetFp },
      ],
    },
  ];

  // Create 2 demo scenarios calculated dynamically via ML engine
  const baseInp = demoRecords[0].inputs;
  const scen1Params: WhatIfRequest = {
    daily_distance_km: 10,
    electricity_kwh: 165,
    lpg_kg: 7.5,
    waste_kg_per_week: 5.0,
    diet_type: 'vegetarian',
    recycling_frequency: 'always',
    ac_hours_per_day: 1.5,
    renewable_pct: 75,
  };
  const scen1Eval = ecoTwinML.runWhatIf(baseInp, scen1Params);
  const scen1Full = ecoTwinML.predictAndExplain({
    ...baseInp,
    ...scen1Params,
  });

  const demoScenarios: ScenarioItem[] = [
    {
      id: 'scen_demo_01',
      user_id: demoId,
      name: 'High-Renewable + Plant-Forward Transition',
      description: '75% renewable electricity, 10 km/day transit commute, and vegetarian weekday meals.',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      parameters: scen1Params,
      predicted_footprint_kg: scen1Eval.simulated_prediction,
      reduction_vs_current_kg: scen1Eval.absolute_reduction,
      reduction_vs_current_pct: scen1Eval.percentage_reduction,
      eco_score: scen1Eval.simulated_eco_score,
      risk_category: scen1Eval.simulated_risk,
      transport_impact_kg: scen1Full.emission_breakdown.Transportation,
      energy_impact_kg: scen1Full.emission_breakdown.Energy,
      waste_impact_kg: scen1Full.emission_breakdown.Waste,
      emission_breakdown: scen1Full.emission_breakdown,
    },
  ];

  return {
    users: [demoUser],
    drafts: { [demoId]: demoRecords[0].inputs },
    footprint_records: demoRecords,
    goals: demoGoals,
    scenarios: demoScenarios,
    reports: [],
  };
}

let db: DatabaseSchema = createInitialSeedDatabase();
if (fs.existsSync(DB_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (loaded && Array.isArray(loaded.users)) {
      db = loaded;
    }
  } catch {
    db = createInitialSeedDatabase();
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist DB file:', err);
  }
}

function sanitizeUser(u: StoredUser): EcoUser {
  const userRecords = db.footprint_records.filter((r) => r.user_id === u.id);
  const userGoals = db.goals.filter((g) => g.user_id === u.id);
  const userScenarios = db.scenarios.filter((s) => s.user_id === u.id);
  const ach = ecoTwinML.evaluateAchievements(userRecords, userGoals, userScenarios);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    age: u.age,
    city: u.city,
    household_size: u.household_size,
    created_at: u.created_at,
    eco_points: ach.eco_points,
    level: ach.level,
    level_title: ach.level_title,
    units: u.units || 'metric',
    theme: u.theme || 'light',
    notifications_enabled: u.notifications_enabled ?? true,
    is_demo: u.is_demo,
  };
}

interface AuthenticatedRequest extends Request {
  user?: StoredUser;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Authentication required. Please log in.' });
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ detail: 'Invalid or expired authentication token. Please log in again.' });
  }
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user) {
    return res.status(401).json({ detail: 'User account no longer exists.' });
  }
  req.user = user;
  next();
}

function refreshUserGoals(userId: string) {
  const userRecords = db.footprint_records.filter((r) => r.user_id === userId);
  const latestFp = userRecords[0]?.predicted_footprint_kg;
  if (latestFp === undefined) return;

  db.goals
    .filter((g) => g.user_id === userId)
    .forEach((goal) => {
      goal.current_footprint_kg = latestFp;
      goal.required_reduction_kg = Math.max(0, Math.round((latestFp - goal.target_footprint_kg) * 10) / 10);
      const totalToReduce = goal.baseline_footprint_kg - goal.target_footprint_kg;
      const reducedSoFar = goal.baseline_footprint_kg - latestFp;
      const pct =
        totalToReduce > 0
          ? Math.min(100, Math.max(0, Math.round((reducedSoFar / totalToReduce) * 100)))
          : latestFp <= goal.target_footprint_kg
          ? 100
          : 0;
      goal.progress_pct = pct;
      const daysRem = Math.max(
        0,
        Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );
      goal.days_remaining = daysRem;
      goal.status =
        latestFp <= goal.target_footprint_kg
          ? 'Achieved'
          : pct >= 55
          ? 'On Track'
          : daysRem < 15
          ? 'At Risk'
          : 'Needs Attention';
      goal.milestones = goal.milestones.map((m) => ({
        ...m,
        reached: latestFp <= m.target_kg,
      }));
    });
}

function buildDigitalTwinState(user: StoredUser): DigitalTwinState {
  const records = db.footprint_records.filter((r) => r.user_id === user.id);
  const goals = db.goals.filter((g) => g.user_id === user.id);
  const anomalies = ecoTwinML.detectAnomalies(records);
  const twinAgeDays = Math.max(
    1,
    Math.ceil((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
  );

  if (records.length === 0) {
    return {
      has_data: false,
      current_footprint_kg: null,
      eco_score: null,
      twin_age_days: twinAgeDays,
      twin_status: 'Uninitialized Twin',
      twin_summary:
        'Your Environmental Digital Twin is waiting for its first lifestyle telemetry input. Complete the Carbon Calculator to synthesize your virtual biosphere.',
      visual_state: {
        tree_count: 0,
        air_clarity_pct: 50,
        solar_active: false,
        transport_mode: 'unconfigured',
        recycling_tier: 'unconfigured',
        home_efficiency_pct: 50,
        water_conservation_pct: 50,
      },
      composition: null,
      evolution: [],
      future_forecast_6m_kg: null,
      ai_insights: [
        'No environmental records found yet. Submit the Carbon Calculator to initialize your Digital Twin.',
      ],
      anomalies: [],
      goals,
      recommendations: [],
    };
  }

  const latest = records[0];
  const forecast6m = ecoTwinML.generateForecast(records, 6);
  const recs = ecoTwinML.generateRecommendations(latest);

  const status: DigitalTwinState['twin_status'] =
    latest.eco_score >= 78
      ? 'Thriving Biosphere'
      : latest.eco_score >= 58
      ? 'Balanced Ecosystem'
      : latest.eco_score >= 38
      ? 'Stressed Canopy'
      : 'Critical Warming';

  const treeCount = Math.max(2, Math.min(24, Math.round(latest.eco_score / 4.5)));
  const airClarity = Math.max(25, Math.min(98, Math.round(100 - (latest.predicted_footprint_kg / 700) * 70)));
  const homeEff = Math.min(
    98,
    Math.max(
      20,
      Math.round(
        latest.inputs.renewable_pct * 0.55 +
          (latest.inputs.solar_installed === 'yes' ? 28 : 8) +
          (latest.inputs.ac_hours_per_day <= 3 ? 17 : 0)
      )
    )
  );
  const waterCons = Math.min(
    96,
    Math.max(20, Math.round(100 - ((latest.inputs.water_liters_per_day - 70) / 260) * 75))
  );

  const evolution = [...records]
    .reverse()
    .map((r) => ({
      month: r.month_label,
      footprint_kg: r.predicted_footprint_kg,
      eco_score: r.eco_score,
      status: r.risk_category,
    }));

  const insights: string[] = [
    `Primary pressure on your Digital Twin biosphere comes from ${latest.top_contributor} (${latest.emission_breakdown[latest.top_contributor]} kg CO₂e/month).`,
    `To absorb your current monthly footprint of ${latest.predicted_footprint_kg} kg CO₂e naturally requires approximately ${Math.ceil(
      latest.predicted_footprint_kg / 18.5
    )} mature trees actively sequestering carbon year-round.`,
    forecast6m.predicted_final_kg
      ? `At your current trajectory (${forecast6m.trend}), your Digital Twin projects ${forecast6m.predicted_final_kg} kg CO₂e/month in 6 months.`
      : 'Add more monthly records to unlock multi-season Digital Twin trajectory modeling.',
  ];

  return {
    has_data: true,
    current_footprint_kg: latest.predicted_footprint_kg,
    eco_score: latest.eco_score,
    twin_age_days: twinAgeDays,
    twin_status: status,
    twin_summary: `Your Environmental Digital Twin operates as a '${status}' with an Eco Score of ${latest.eco_score}/100 and ${latest.predicted_footprint_kg} kg CO₂e/month net emissions.`,
    visual_state: {
      tree_count: treeCount,
      air_clarity_pct: airClarity,
      solar_active: latest.inputs.solar_installed === 'yes' || latest.inputs.renewable_pct >= 50,
      transport_mode: latest.inputs.primary_transport,
      recycling_tier: latest.inputs.recycling_frequency,
      home_efficiency_pct: homeEff,
      water_conservation_pct: waterCons,
    },
    composition: latest.emission_breakdown,
    evolution,
    future_forecast_6m_kg: forecast6m.predicted_final_kg,
    ai_insights: insights,
    anomalies,
    goals,
    recommendations: recs,
  };
}

function validateCalculatorPayload(body: Record<string, unknown>): { valid: boolean; error?: string; input?: CalculatorInput } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request payload must be a valid JSON object.' };
  }
  const age = Number(body.age);
  const hh = Number(body.household_size);
  const dist = Number(body.daily_distance_km);
  const days = Number(body.travel_days_per_week);
  const elec = Number(body.electricity_kwh);
  const renew = Number(body.renewable_pct);
  const lpg = Number(body.lpg_kg);
  const waste = Number(body.waste_kg_per_week);
  const ac = Number(body.ac_hours_per_day);
  const water = Number(body.water_liters_per_day);

  if (Number.isNaN(age) || age < 10 || age > 110) {
    return { valid: false, error: 'Age must be between 10 and 110.' };
  }
  if (Number.isNaN(hh) || hh < 1 || hh > 25) {
    return { valid: false, error: 'Household size must be between 1 and 25.' };
  }
  if (Number.isNaN(dist) || dist < 0 || dist > 1000) {
    return { valid: false, error: 'Daily distance travelled must be between 0 and 1000 km.' };
  }
  if (Number.isNaN(days) || days < 0 || days > 7) {
    return { valid: false, error: 'Days travelled per week must be between 0 and 7.' };
  }
  if (Number.isNaN(elec) || elec < 0 || elec > 10000) {
    return { valid: false, error: 'Monthly electricity usage must be between 0 and 10,000 kWh.' };
  }
  if (Number.isNaN(renew) || renew < 0 || renew > 100) {
    return { valid: false, error: 'Renewable energy usage must be between 0% and 100%.' };
  }
  if (Number.isNaN(lpg) || lpg < 0 || lpg > 500) {
    return { valid: false, error: 'Monthly LPG / cooking fuel must be between 0 and 500 kg.' };
  }
  if (Number.isNaN(waste) || waste < 0 || waste > 500) {
    return { valid: false, error: 'Weekly waste generated must be between 0 and 500 kg.' };
  }
  if (Number.isNaN(ac) || ac < 0 || ac > 24) {
    return { valid: false, error: 'Air conditioner usage must be between 0 and 24 hours/day.' };
  }
  if (Number.isNaN(water) || water < 0 || water > 5000) {
    return { valid: false, error: 'Daily water consumption must be between 0 and 5000 liters.' };
  }

  const input: CalculatorInput = {
    name: String(body.name || 'User').trim() || 'User',
    age,
    city: String(body.city || 'Not specified').trim() || 'Not specified',
    household_size: hh,
    primary_transport: (body.primary_transport as CalculatorInput['primary_transport']) || 'public_transit',
    daily_distance_km: dist,
    travel_days_per_week: days,
    secondary_transport: (body.secondary_transport as CalculatorInput['secondary_transport']) || 'none',
    electricity_kwh: elec,
    renewable_pct: renew,
    lpg_kg: lpg,
    solar_installed: (body.solar_installed as CalculatorInput['solar_installed']) || 'no',
    diet_type: (body.diet_type as CalculatorInput['diet_type']) || 'omnivore_low_meat',
    food_waste_level: (body.food_waste_level as CalculatorInput['food_waste_level']) || 'low',
    local_food_pct: Math.min(100, Math.max(0, Number(body.local_food_pct ?? 40))),
    outside_meals_per_week: Math.max(0, Number(body.outside_meals_per_week ?? 2)),
    waste_kg_per_week: waste,
    recycling_frequency: (body.recycling_frequency as CalculatorInput['recycling_frequency']) || 'often',
    composting: (body.composting as CalculatorInput['composting']) || 'no',
    single_use_plastic: (body.single_use_plastic as CalculatorInput['single_use_plastic']) || 'low',
    ac_hours_per_day: ac,
    water_liters_per_day: water,
    clothes_buying_frequency: (body.clothes_buying_frequency as CalculatorInput['clothes_buying_frequency']) || 'quarterly',
    ewaste_disposal: (body.ewaste_disposal as CalculatorInput['ewaste_disposal']) || 'certified_recycler',
    flights_short_haul_yearly: Math.max(0, Number(body.flights_short_haul_yearly ?? 0)),
    flights_long_haul_yearly: Math.max(0, Number(body.flights_long_haul_yearly ?? 0)),
    home_area_sqft: Math.max(150, Number(body.home_area_sqft ?? 950)),
    green_appliances_pct: Math.min(100, Math.max(0, Number(body.green_appliances_pct ?? 50))),
  };

  return { valid: true, input };
}

async function startServer() {
  app.use(express.json({ limit: '5mb' }));

  // Configurable CORS middleware (supports localhost:5500, localhost:3000, etc.)
  const allowedOrigins = (
    process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500'
  )
    .split(',')
    .map((o) => o.trim());

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.run.app'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // -------------------------------------------------------------------
  // 1. HEALTH & SWAGGER DOCS
  // -------------------------------------------------------------------
  app.get('/api/health', (_req, res) => {
    return res.json({
      status: 'connected',
      service: 'ECO TWIN ML API',
      ml_available: true,
      models_loaded: {
        regression: ecoTwinML.modelMetrics.regression_model,
        classification: ecoTwinML.modelMetrics.classification_model,
        anomaly_detection: ecoTwinML.modelMetrics.anomaly_model,
        forecasting: 'Holt-Winters Seasonal Damped Trend Forecaster',
      },
      metrics: ecoTwinML.modelMetrics.regression_metrics,
      dataset_notice: ecoTwinML.modelMetrics.dataset_label,
      timestamp: new Date().toISOString(),
    });
  });

  // OpenAPI JSON + Interactive Swagger UI at /docs
  app.get('/openapi.json', (_req, res) => {
    return res.json({
      openapi: '3.0.3',
      info: {
        title: 'ECO TWIN ML — AI-Powered Environmental Digital Twin API',
        version: '1.0.0',
        description:
          'REST API for Carbon Footprint Regression, Eco Risk Classification, IsolationForest Anomaly Detection, Forecasting, What-If Simulation, Scenario Lab, and Report Generation.',
      },
      paths: {
        '/api/health': { get: { summary: 'System & ML Model Health Check' } },
        '/api/auth/register': { post: { summary: 'Register new user account' } },
        '/api/auth/login': { post: { summary: 'Authenticate user and issue JWT' } },
        '/api/auth/me': { get: { summary: 'Get authenticated user profile' } },
        '/api/calculator/analyze': { post: { summary: 'Analyze & save carbon footprint via ML pipeline' } },
        '/api/calculator/predict': { post: { summary: 'Run instant ML footprint prediction preview' } },
        '/api/dashboard': { get: { summary: 'Fetch complete authenticated user dashboard telemetry' } },
        '/api/twin': { get: { summary: 'Fetch Environmental Digital Twin state & evolution' } },
        '/api/analysis': { get: { summary: 'Fetch ML feature importance & risk analysis' } },
        '/api/analysis/explain': { get: { summary: 'Fetch SHAP/Tree local feature explanations' } },
        '/api/forecast': { get: { summary: 'Fetch 3m, 6m, or 12m carbon footprint forecast' } },
        '/api/simulator/what-if': { post: { summary: 'Run What-If lifestyle simulation on ML model' } },
        '/api/scenarios': { get: { summary: 'List user saved scenarios' }, post: { summary: 'Create new scenario' } },
        '/api/scenarios/compare': { post: { summary: 'Compare multiple sustainability scenarios' } },
        '/api/goals': { get: { summary: 'List user sustainability goals' }, post: { summary: 'Create new goal' } },
        '/api/history': { get: { summary: 'List historical footprint records' } },
        '/api/anomalies': { get: { summary: 'Detect IsolationForest emission anomalies' } },
        '/api/recommendations': { get: { summary: 'Fetch personalized AI recommendations' } },
        '/api/achievements': { get: { summary: 'Fetch Eco Points, level, and achievements' } },
        '/api/reports/generate': { post: { summary: 'Generate downloadable PDF sustainability report' } },
        '/api/community': { get: { summary: 'Fetch anonymous aggregate community statistics' } },
      },
    });
  });

  app.get('/docs', (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ECO TWIN ML — FastAPI / OpenAPI Swagger Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body style="margin:0;background:#f8fafc;">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui' });
    };
  </script>
</body>
</html>`);
  });

  // -------------------------------------------------------------------
  // 2. AUTHENTICATION (/api/auth/register, /api/auth/login, /api/auth/me)
  // -------------------------------------------------------------------
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, age, city, household_size } = req.body || {};
    if (!name || !email || !password) {
      return res.status(422).json({ detail: 'Name, email, and password are required.' });
    }
    if (String(password).length < 6) {
      return res.status(422).json({ detail: 'Password must be at least 6 characters long.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ detail: 'An account with this email is already registered.' });
    }

    const { hash, salt } = hashPassword(String(password));
    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(name).trim(),
      email: cleanEmail,
      age: age ? Number(age) : 26,
      city: city ? String(city).trim() : '',
      household_size: household_size ? Number(household_size) : 2,
      created_at: new Date().toISOString(),
      eco_points: 0,
      level: 1,
      level_title: 'Seedling Observer',
      units: 'metric',
      theme: 'light',
      notifications_enabled: true,
      is_demo: false,
      password_hash: hash,
      salt,
    };

    db.users.push(newUser);
    saveDb();

    const token = signJwt({ sub: newUser.id, email: newUser.email });
    return res.status(201).json({
      access_token: token,
      token_type: 'bearer',
      user: sanitizeUser(newUser),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(422).json({ detail: 'Email and password are required.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }
    const { hash } = hashPassword(String(password), user.salt);
    if (hash !== user.password_hash) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    const token = signJwt({ sub: user.id, email: user.email });
    return res.json({
      access_token: token,
      token_type: 'bearer',
      user: sanitizeUser(user),
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    return res.json({ user: sanitizeUser(req.user!) });
  });

  // -------------------------------------------------------------------
  // 3. CARBON CALCULATOR (/api/calculator/predict, /api/calculator/analyze, draft)
  // -------------------------------------------------------------------
  app.get('/api/calculator/draft', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const draft = db.drafts[user.id] || null;
    const latest = db.footprint_records.find((r) => r.user_id === user.id) || null;
    return res.json({
      draft,
      latest_record: latest,
    });
  });

  app.post('/api/calculator/draft', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const check = validateCalculatorPayload(req.body);
    if (!check.valid || !check.input) {
      return res.status(422).json({ detail: check.error });
    }
    db.drafts[user.id] = check.input;
    saveDb();
    return res.json({ message: 'Calculator draft saved successfully.', draft: check.input });
  });

  // Instant non-persisted ML prediction preview
  app.post('/api/calculator/predict', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const check = validateCalculatorPayload(req.body);
    if (!check.valid || !check.input) {
      return res.status(422).json({ detail: check.error });
    }
    const userRecords = db.footprint_records.filter((r) => r.user_id === user.id);
    const prevFp = userRecords[0]?.predicted_footprint_kg ?? null;
    const result = ecoTwinML.predictAndExplain(check.input, prevFp);
    return res.json({
      ...result,
      current_footprint_kg: prevFp,
    });
  });

  // Full ML analysis + persistence to footprint_records
  app.post('/api/calculator/analyze', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const check = validateCalculatorPayload(req.body);
    if (!check.valid || !check.input) {
      return res.status(422).json({ detail: check.error });
    }

    const input = check.input;
    // Update user profile metadata from section 01
    user.name = input.name || user.name;
    user.age = input.age;
    user.city = input.city;
    user.household_size = input.household_size;
    db.drafts[user.id] = input;

    const userRecords = db.footprint_records.filter((r) => r.user_id === user.id);
    const prevFp = userRecords[0]?.predicted_footprint_kg ?? null;
    const analysis = ecoTwinML.predictAndExplain(input, prevFp);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const record: FootprintRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user_id: user.id,
      created_at: now.toISOString(),
      month_label: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
      inputs: input,
      predicted_footprint_kg: analysis.predicted_footprint_kg,
      eco_score: analysis.eco_score,
      risk_category: analysis.risk_category,
      top_contributor: analysis.top_contributor,
      change_from_previous_pct: analysis.change_from_previous_pct,
      emission_breakdown: analysis.emission_breakdown,
      feature_importances: analysis.feature_importances,
      model_info: analysis.model_info,
      status: 'Verified ML Run',
    };

    db.footprint_records.unshift(record);
    refreshUserGoals(user.id);
    saveDb();

    return res.status(201).json({
      record,
      current_footprint_kg: prevFp,
      recommendations: ecoTwinML.generateRecommendations(record),
      user: sanitizeUser(user),
    });
  });

  // -------------------------------------------------------------------
  // 4. DASHBOARD (/api/dashboard)
  // -------------------------------------------------------------------
  app.get('/api/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const userRecords = db.footprint_records.filter((r) => r.user_id === user.id);
    const latest = userRecords[0] || null;
    const forecast = ecoTwinML.generateForecast(userRecords, 6);
    const anomalies = ecoTwinML.detectAnomalies(userRecords);
    const recommendations = latest ? ecoTwinML.generateRecommendations(latest) : [];
    const goals = db.goals.filter((g) => g.user_id === user.id);
    const scenarios = db.scenarios.filter((s) => s.user_id === user.id);
    const ach = ecoTwinML.evaluateAchievements(userRecords, goals, scenarios);

    // Community anonymous percentile calculation
    const allLatestFootprints = db.users
      .map((u) => db.footprint_records.find((r) => r.user_id === u.id)?.predicted_footprint_kg)
      .filter((v): v is number => typeof v === 'number');
    const synthFootprints = ecoTwinML.dataset.map((d) => d.target_footprint_kg);
    const pool = [...allLatestFootprints, ...synthFootprints];
    const communityAvg = Math.round((pool.reduce((a, b) => a + b, 0) / pool.length) * 10) / 10;

    let percentile: number | null = null;
    if (latest) {
      const higherFootprintCount = pool.filter((v) => v > latest.predicted_footprint_kg).length;
      percentile = Math.max(1, Math.min(99, Math.round((higherFootprintCount / pool.length) * 100)));
    }

    return res.json({
      has_data: Boolean(latest),
      user: sanitizeUser(user),
      current_footprint_kg: latest?.predicted_footprint_kg ?? null,
      change_from_previous_pct: latest?.change_from_previous_pct ?? null,
      eco_score: latest?.eco_score ?? null,
      risk_category: latest?.risk_category ?? null,
      top_contributor: latest?.top_contributor ?? null,
      future_prediction_6m_kg: forecast.predicted_final_kg,
      community_rank: {
        percentile_better_than: percentile,
        community_average_kg: communityAvg,
        is_demo_aggregate: allLatestFootprints.length < 10,
        notice:
          allLatestFootprints.length < 10
            ? 'Community statistics are currently based on available aggregate demonstration data.'
            : null,
      },
      emission_breakdown: latest?.emission_breakdown ?? null,
      feature_importances: latest?.feature_importances ?? [],
      recommendations,
      forecast,
      anomalies,
      monthly_history: [...userRecords].reverse(),
      recent_achievements: ach.achievements,
      eco_points: ach.eco_points,
      level: ach.level,
      level_title: ach.level_title,
      goals,
      environmental_context: latest
        ? {
            trees_needed_monthly: Math.ceil(latest.predicted_footprint_kg / 18.5),
            km_driven_equivalent: Math.round(latest.predicted_footprint_kg / 0.192),
            smartphone_charges_equivalent: Math.round(latest.predicted_footprint_kg * 121),
            sustainable_target_kg: 185,
          }
        : null,
    });
  });

  // -------------------------------------------------------------------
  // 5. DIGITAL TWIN (/api/twin)
  // -------------------------------------------------------------------
  app.get('/api/twin', requireAuth, (req: AuthenticatedRequest, res) => {
    const twin = buildDigitalTwinState(req.user!);
    return res.json(twin);
  });

  // -------------------------------------------------------------------
  // 6. AI ANALYSIS & EXPLAINABILITY (/api/analysis, /api/analysis/explain)
  // -------------------------------------------------------------------
  app.get('/api/analysis', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const records = db.footprint_records.filter((r) => r.user_id === user.id);
    const latest = records[0] || null;
    if (!latest) {
      return res.json({
        has_data: false,
        message: 'No analysis available yet. Run the Carbon Calculator first.',
        model_info: ecoTwinML.modelMetrics,
      });
    }
    const recs = ecoTwinML.generateRecommendations(latest);
    const expectedReductionKg = recs.slice(0, 3).reduce((acc, r) => acc + r.estimated_reduction_kg, 0);

    return res.json({
      has_data: true,
      record: latest,
      current_footprint_kg: latest.predicted_footprint_kg,
      eco_score: latest.eco_score,
      risk_category: latest.risk_category,
      top_contributor: latest.top_contributor,
      emission_breakdown: latest.emission_breakdown,
      feature_importances: latest.feature_importances,
      model_info: latest.model_info,
      recommendations: recs,
      expected_reduction_kg: expectedReductionKg,
      why_footprint_explanation:
        latest.predicted_footprint_kg > 350
          ? `Your monthly footprint (${latest.predicted_footprint_kg} kg CO₂e) is elevated above the 345 kg baseline primarily due to ${latest.top_contributor} (${latest.emission_breakdown[latest.top_contributor]} kg CO₂e). Adopting the top 3 AI recommendations can reduce emissions by ~${expectedReductionKg} kg CO₂e/month.`
          : `Your monthly footprint (${latest.predicted_footprint_kg} kg CO₂e) is below the 345 kg baseline, with ${latest.top_contributor} (${latest.emission_breakdown[latest.top_contributor]} kg CO₂e) representing the largest remaining share.`,
    });
  });

  app.get('/api/analysis/explain', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const latest = db.footprint_records.find((r) => r.user_id === user.id) || null;
    if (!latest) {
      return res.json({
        has_data: false,
        method: 'RandomForest Impurity Gain + Marginal Perturbation Attribution',
        feature_importances: [],
        model_info: ecoTwinML.modelMetrics,
      });
    }
    return res.json({
      has_data: true,
      method: 'RandomForest Impurity Gain + Marginal Perturbation Attribution',
      baseline_footprint_kg: 312.5,
      predicted_footprint_kg: latest.predicted_footprint_kg,
      feature_importances: latest.feature_importances,
      emission_breakdown: latest.emission_breakdown,
      model_info: latest.model_info,
    });
  });

  // -------------------------------------------------------------------
  // 7. FORECAST (/api/forecast)
  // -------------------------------------------------------------------
  app.get('/api/forecast', requireAuth, (req: AuthenticatedRequest, res) => {
    const horizon = Math.min(12, Math.max(1, Number(req.query.months) || 6));
    const userRecords = db.footprint_records.filter((r) => r.user_id === req.user!.id);
    const forecast = ecoTwinML.generateForecast(userRecords, horizon);
    return res.json(forecast);
  });

  // -------------------------------------------------------------------
  // 8. WHAT-IF SIMULATOR (/api/simulator/what-if)
  // -------------------------------------------------------------------
  app.post('/api/simulator/what-if', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const latest = db.footprint_records.find((r) => r.user_id === user.id);
    const baseInput: CalculatorInput = latest?.inputs || {
      name: user.name,
      age: user.age || 28,
      city: user.city || 'Metro',
      household_size: user.household_size || 2,
      primary_transport: 'car_petrol',
      daily_distance_km: 25,
      travel_days_per_week: 5,
      secondary_transport: 'none',
      electricity_kwh: 250,
      renewable_pct: 20,
      lpg_kg: 11,
      solar_installed: 'no',
      diet_type: 'omnivore_low_meat',
      food_waste_level: 'moderate',
      local_food_pct: 35,
      outside_meals_per_week: 3,
      waste_kg_per_week: 9,
      recycling_frequency: 'sometimes',
      composting: 'no',
      single_use_plastic: 'moderate',
      ac_hours_per_day: 4,
      water_liters_per_day: 160,
      clothes_buying_frequency: 'quarterly',
      ewaste_disposal: 'certified_recycler',
      flights_short_haul_yearly: 0,
      flights_long_haul_yearly: 0,
      home_area_sqft: 1000,
      green_appliances_pct: 50,
    };

    const body = req.body || {};
    const simParams: WhatIfRequest = {
      daily_distance_km: Number(body.daily_distance_km ?? baseInput.daily_distance_km),
      electricity_kwh: Number(body.electricity_kwh ?? baseInput.electricity_kwh),
      lpg_kg: Number(body.lpg_kg ?? baseInput.lpg_kg),
      waste_kg_per_week: Number(body.waste_kg_per_week ?? baseInput.waste_kg_per_week),
      diet_type: body.diet_type || baseInput.diet_type,
      recycling_frequency: body.recycling_frequency || baseInput.recycling_frequency,
      ac_hours_per_day: Number(body.ac_hours_per_day ?? baseInput.ac_hours_per_day),
      renewable_pct: Number(body.renewable_pct ?? baseInput.renewable_pct),
    };

    const result = ecoTwinML.runWhatIf(baseInput, simParams);
    return res.json({
      ...result,
      base_parameters: {
        daily_distance_km: baseInput.daily_distance_km,
        electricity_kwh: baseInput.electricity_kwh,
        lpg_kg: baseInput.lpg_kg,
        waste_kg_per_week: baseInput.waste_kg_per_week,
        diet_type: baseInput.diet_type,
        recycling_frequency: baseInput.recycling_frequency,
        ac_hours_per_day: baseInput.ac_hours_per_day,
        renewable_pct: baseInput.renewable_pct,
      },
      simulated_parameters: simParams,
    });
  });

  // -------------------------------------------------------------------
  // 9. SCENARIO LAB (/api/scenarios, /api/scenarios/:id, /api/scenarios/compare)
  // -------------------------------------------------------------------
  app.get('/api/scenarios', requireAuth, (req: AuthenticatedRequest, res) => {
    const userScenarios = db.scenarios.filter((s) => s.user_id === req.user!.id);
    const latest = db.footprint_records.find((r) => r.user_id === req.user!.id) || null;
    return res.json({
      scenarios: userScenarios,
      current_baseline: latest
        ? {
            predicted_footprint_kg: latest.predicted_footprint_kg,
            eco_score: latest.eco_score,
            emission_breakdown: latest.emission_breakdown,
          }
        : null,
    });
  });

  app.post('/api/scenarios', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const { name, description, parameters } = req.body || {};
    if (!name || !parameters) {
      return res.status(422).json({ detail: 'Scenario name and parameters are required.' });
    }
    const latest = db.footprint_records.find((r) => r.user_id === user.id);
    const baseInput: CalculatorInput = latest?.inputs || {
      name: user.name,
      age: user.age || 28,
      city: user.city || 'Metro',
      household_size: user.household_size || 2,
      primary_transport: 'car_petrol',
      daily_distance_km: 25,
      travel_days_per_week: 5,
      secondary_transport: 'none',
      electricity_kwh: 250,
      renewable_pct: 20,
      lpg_kg: 11,
      solar_installed: 'no',
      diet_type: 'omnivore_low_meat',
      food_waste_level: 'moderate',
      local_food_pct: 35,
      outside_meals_per_week: 3,
      waste_kg_per_week: 9,
      recycling_frequency: 'sometimes',
      composting: 'no',
      single_use_plastic: 'moderate',
      ac_hours_per_day: 4,
      water_liters_per_day: 160,
      clothes_buying_frequency: 'quarterly',
      ewaste_disposal: 'certified_recycler',
    };

    const whatIf = ecoTwinML.runWhatIf(baseInput, parameters);
    const fullPred = ecoTwinML.predictAndExplain({
      ...baseInput,
      ...parameters,
    });

    const newScenario: ScenarioItem = {
      id: `scen_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      user_id: user.id,
      name: String(name).trim(),
      description: String(description || 'Custom ML sustainability scenario').trim(),
      created_at: new Date().toISOString(),
      parameters,
      predicted_footprint_kg: whatIf.simulated_prediction,
      reduction_vs_current_kg: whatIf.absolute_reduction,
      reduction_vs_current_pct: whatIf.percentage_reduction,
      eco_score: whatIf.simulated_eco_score,
      risk_category: whatIf.simulated_risk,
      transport_impact_kg: fullPred.emission_breakdown.Transportation,
      energy_impact_kg: fullPred.emission_breakdown.Energy,
      waste_impact_kg: fullPred.emission_breakdown.Waste,
      emission_breakdown: fullPred.emission_breakdown,
    };

    db.scenarios.unshift(newScenario);
    saveDb();
    return res.status(201).json(newScenario);
  });

  app.get('/api/scenarios/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const scen = db.scenarios.find((s) => s.id === req.params.id && s.user_id === req.user!.id);
    if (!scen) return res.status(404).json({ detail: 'Scenario not found.' });
    return res.json(scen);
  });

  app.delete('/api/scenarios/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const idx = db.scenarios.findIndex((s) => s.id === req.params.id && s.user_id === req.user!.id);
    if (idx === -1) return res.status(404).json({ detail: 'Scenario not found.' });
    db.scenarios.splice(idx, 1);
    saveDb();
    return res.json({ message: 'Scenario deleted.' });
  });

  app.post('/api/scenarios/compare', requireAuth, (req: AuthenticatedRequest, res) => {
    const { scenario_ids } = req.body || {};
    const userScenarios = db.scenarios.filter((s) => s.user_id === req.user!.id);
    const selected = Array.isArray(scenario_ids) && scenario_ids.length > 0
      ? userScenarios.filter((s) => scenario_ids.includes(s.id))
      : userScenarios;
    const latest = db.footprint_records.find((r) => r.user_id === req.user!.id) || null;

    return res.json({
      baseline: latest
        ? {
            name: 'Current Lifestyle (Baseline)',
            predicted_footprint_kg: latest.predicted_footprint_kg,
            reduction_vs_current_kg: 0,
            reduction_vs_current_pct: 0,
            eco_score: latest.eco_score,
            transport_impact_kg: latest.emission_breakdown.Transportation,
            energy_impact_kg: latest.emission_breakdown.Energy,
            waste_impact_kg: latest.emission_breakdown.Waste,
          }
        : null,
      scenarios: selected,
    });
  });

  // -------------------------------------------------------------------
  // 10. GOALS (/api/goals, /api/goals/:id)
  // -------------------------------------------------------------------
  app.get('/api/goals', requireAuth, (req: AuthenticatedRequest, res) => {
    refreshUserGoals(req.user!.id);
    const goals = db.goals.filter((g) => g.user_id === req.user!.id);
    const latest = db.footprint_records.find((r) => r.user_id === req.user!.id);
    return res.json({
      goals,
      current_footprint_kg: latest?.predicted_footprint_kg ?? null,
    });
  });

  app.post('/api/goals', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const { title, category, target_reduction_pct, months_duration } = req.body || {};
    if (!title || !target_reduction_pct) {
      return res.status(422).json({ detail: 'Goal title and target reduction percentage are required.' });
    }
    const redPct = Math.min(80, Math.max(2, Number(target_reduction_pct)));
    const months = Math.min(36, Math.max(1, Number(months_duration) || 6));

    const latest = db.footprint_records.find((r) => r.user_id === user.id);
    const baseFp = latest?.predicted_footprint_kg ?? 340;
    const targetFp = Math.round(baseFp * (1 - redPct / 100) * 10) / 10;
    const targetDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * months);

    const newGoal: GoalItem = {
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      user_id: user.id,
      title: String(title).trim(),
      category: String(category || 'Overall Footprint'),
      baseline_footprint_kg: baseFp,
      current_footprint_kg: baseFp,
      target_footprint_kg: targetFp,
      target_reduction_pct: redPct,
      required_reduction_kg: Math.round((baseFp - targetFp) * 10) / 10,
      progress_pct: 0,
      start_date: new Date().toISOString().slice(0, 10),
      target_date: targetDate.toISOString().slice(0, 10),
      days_remaining: months * 30,
      status: 'On Track',
      milestones: [
        {
          label: `${Math.round(redPct * 0.33)}% Reduction Milestone`,
          target_kg: Math.round(baseFp * (1 - (redPct * 0.33) / 100)),
          reached: false,
        },
        {
          label: `${Math.round(redPct * 0.66)}% Reduction Milestone`,
          target_kg: Math.round(baseFp * (1 - (redPct * 0.66) / 100)),
          reached: false,
        },
        {
          label: `${redPct}% Target Achieved`,
          target_kg: targetFp,
          reached: false,
        },
      ],
    };

    db.goals.unshift(newGoal);
    saveDb();
    return res.status(201).json(newGoal);
  });

  app.put('/api/goals/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const goal = db.goals.find((g) => g.id === req.params.id && g.user_id === req.user!.id);
    if (!goal) return res.status(404).json({ detail: 'Goal not found.' });
    const { title, target_reduction_pct, category } = req.body || {};
    if (title) goal.title = String(title).trim();
    if (category) goal.category = String(category);
    if (target_reduction_pct) {
      const redPct = Math.min(80, Math.max(2, Number(target_reduction_pct)));
      goal.target_reduction_pct = redPct;
      goal.target_footprint_kg = Math.round(goal.baseline_footprint_kg * (1 - redPct / 100) * 10) / 10;
    }
    refreshUserGoals(req.user!.id);
    saveDb();
    return res.json(goal);
  });

  app.delete('/api/goals/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const idx = db.goals.findIndex((g) => g.id === req.params.id && g.user_id === req.user!.id);
    if (idx === -1) return res.status(404).json({ detail: 'Goal not found.' });
    db.goals.splice(idx, 1);
    saveDb();
    return res.json({ message: 'Goal deleted successfully.' });
  });

  // -------------------------------------------------------------------
  // 11. HISTORY (/api/history, /api/history/:id)
  // -------------------------------------------------------------------
  app.get('/api/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const { risk, contributor, start_date, end_date } = req.query;
    let records = db.footprint_records.filter((r) => r.user_id === req.user!.id);

    if (risk && risk !== 'all') {
      records = records.filter((r) => r.risk_category === risk);
    }
    if (contributor && contributor !== 'all') {
      records = records.filter((r) => r.top_contributor === contributor);
    }
    if (start_date && typeof start_date === 'string') {
      records = records.filter((r) => r.created_at.slice(0, 10) >= start_date);
    }
    if (end_date && typeof end_date === 'string') {
      records = records.filter((r) => r.created_at.slice(0, 10) <= end_date);
    }

    return res.json({
      count: records.length,
      records,
    });
  });

  app.get('/api/history/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const rec = db.footprint_records.find((r) => r.id === req.params.id && r.user_id === req.user!.id);
    if (!rec) return res.status(404).json({ detail: 'Footprint record not found.' });
    return res.json(rec);
  });

  app.delete('/api/history/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const idx = db.footprint_records.findIndex((r) => r.id === req.params.id && r.user_id === req.user!.id);
    if (idx === -1) return res.status(404).json({ detail: 'Footprint record not found.' });
    db.footprint_records.splice(idx, 1);
    refreshUserGoals(req.user!.id);
    saveDb();
    return res.json({ message: 'Footprint record deleted.' });
  });

  app.delete('/api/history', requireAuth, (req: AuthenticatedRequest, res) => {
    db.footprint_records = db.footprint_records.filter((r) => r.user_id !== req.user!.id);
    saveDb();
    return res.json({ message: 'All environmental footprint records deleted for your account.' });
  });

  // -------------------------------------------------------------------
  // 12. ANOMALIES (/api/anomalies)
  // -------------------------------------------------------------------
  app.get('/api/anomalies', requireAuth, (req: AuthenticatedRequest, res) => {
    const records = db.footprint_records.filter((r) => r.user_id === req.user!.id);
    const anomalies = ecoTwinML.detectAnomalies(records);
    return res.json({
      model: ecoTwinML.modelMetrics.anomaly_model,
      has_records: records.length > 0,
      anomalies,
    });
  });

  // -------------------------------------------------------------------
  // 13. RECOMMENDATIONS (/api/recommendations)
  // -------------------------------------------------------------------
  app.get('/api/recommendations', requireAuth, (req: AuthenticatedRequest, res) => {
    const latest = db.footprint_records.find((r) => r.user_id === req.user!.id) || null;
    if (!latest) {
      return res.json({
        has_data: false,
        recommendations: [],
        total_potential_saving_kg: 0,
      });
    }
    const recs = ecoTwinML.generateRecommendations(latest);
    const totalSaving = recs.reduce((acc, r) => acc + r.estimated_reduction_kg, 0);
    return res.json({
      has_data: true,
      current_footprint_kg: latest.predicted_footprint_kg,
      recommendations: recs,
      total_potential_saving_kg: totalSaving,
    });
  });

  // -------------------------------------------------------------------
  // 14. ACHIEVEMENTS (/api/achievements)
  // -------------------------------------------------------------------
  app.get('/api/achievements', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const records = db.footprint_records.filter((r) => r.user_id === userId);
    const goals = db.goals.filter((g) => g.user_id === userId);
    const scenarios = db.scenarios.filter((s) => s.user_id === userId);
    const result = ecoTwinML.evaluateAchievements(records, goals, scenarios);
    return res.json(result);
  });

  // -------------------------------------------------------------------
  // 15. REPORTS (/api/reports/generate & /api/reports)
  // -------------------------------------------------------------------
  app.get('/api/reports', requireAuth, (req: AuthenticatedRequest, res) => {
    const list = db.reports.filter((r) => r.user_id === req.user!.id);
    return res.json({ reports: list });
  });

  app.post('/api/reports/generate', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const rawType = req.body?.report_type;
    const reportType: 'Sustainability Report' | 'Digital Twin Report' | 'Monthly Report' =
      rawType === 'Digital Twin Report' || rawType === 'Monthly Report' ? rawType : 'Sustainability Report';

    const userRecords = db.footprint_records.filter((r) => r.user_id === user.id);
    const latest = userRecords[0] || null;
    const forecast = ecoTwinML.generateForecast(userRecords, 6);
    const twin = buildDigitalTwinState(user);
    const recommendations = latest ? ecoTwinML.generateRecommendations(latest) : [];
    const goals = db.goals.filter((g) => g.user_id === user.id);
    const scenarios = db.scenarios.filter((s) => s.user_id === user.id);

    const pdfBuffer = generateSustainabilityPdfBuffer({
      reportType,
      user: sanitizeUser(user),
      latestRecord: latest,
      forecast,
      twin,
      recommendations,
      goals,
      scenarios,
    });

    const repRec: ReportRecord = {
      id: `rep_${Date.now()}`,
      user_id: user.id,
      report_type: reportType,
      created_at: new Date().toISOString(),
      footprint_kg: latest?.predicted_footprint_kg ?? null,
      eco_score: latest?.eco_score ?? null,
      risk_category: latest?.risk_category ?? null,
      summary: latest
        ? `${reportType} (${latest.predicted_footprint_kg} kg CO₂e/mo, Eco Score ${latest.eco_score}/100)`
        : `${reportType} (No baseline record)`,
    };
    db.reports.unshift(repRec);
    saveDb();

    const safeFileName = `${reportType.toLowerCase().replace(/\s+/g, '_')}_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    return res.send(pdfBuffer);
  });

  // -------------------------------------------------------------------
  // 16. COMMUNITY (/api/community) — Strictly Anonymous Aggregate Data
  // -------------------------------------------------------------------
  app.get('/api/community', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const latest = db.footprint_records.find((r) => r.user_id === user.id) || null;

    // Aggregate anonymous statistics across users + synthetic population
    const realLatestRecords = db.users
      .map((u) => db.footprint_records.find((r) => r.user_id === u.id))
      .filter((r): r is FootprintRecord => Boolean(r));

    const synthFootprints = ecoTwinML.dataset.map((d) => d.target_footprint_kg);
    const combinedFootprints = [
      ...realLatestRecords.map((r) => r.predicted_footprint_kg),
      ...synthFootprints,
    ];
    const communityAvg =
      Math.round((combinedFootprints.reduce((a, b) => a + b, 0) / combinedFootprints.length) * 10) / 10;

    let userPercentile: number | null = null;
    if (latest) {
      const higherCount = combinedFootprints.filter((v) => v > latest.predicted_footprint_kg).length;
      userPercentile = Math.max(1, Math.min(99, Math.round((higherCount / combinedFootprints.length) * 100)));
    }

    const categoryAverages = {
      Transportation: 96.4,
      Energy: 92.8,
      Food: 88.5,
      Waste: 26.2,
      LPG: 24.1,
      Water: 6.8,
      Lifestyle: 21.4,
      Other: 12.3,
    };

    return res.json({
      is_demo_aggregate: realLatestRecords.length < 15,
      notice:
        'Community statistics are currently based on available aggregate demonstration data. Zero personal or identifiable user records are exposed.',
      total_anonymous_participants: combinedFootprints.length,
      community_average_kg: communityAvg,
      sustainable_target_kg: 185.0,
      user_footprint_kg: latest?.predicted_footprint_kg ?? null,
      user_eco_score: latest?.eco_score ?? null,
      percentile_better_than: userPercentile,
      category_averages: categoryAverages,
      user_categories: latest?.emission_breakdown ?? null,
      improvement_statistics: {
        avg_6m_reduction_pct: 14.2,
        solar_or_renewable_adoption_pct: 38.4,
        active_composting_pct: 41.0,
        low_emission_transit_pct: 46.8,
      },
      distribution_buckets: [
        { range: '< 200 kg (Net-Zero Vanguard)', pct: 14 },
        { range: '200 – 300 kg (Low Risk)', pct: 29 },
        { range: '300 – 420 kg (Moderate Risk)', pct: 34 },
        { range: '420 – 550 kg (High Risk)', pct: 16 },
        { range: '> 550 kg (Critical Risk)', pct: 7 },
      ],
    });
  });

  // -------------------------------------------------------------------
  // 17. SETTINGS (/api/settings)
  // -------------------------------------------------------------------
  app.get('/api/settings', requireAuth, (req: AuthenticatedRequest, res) => {
    const u = req.user!;
    const recCount = db.footprint_records.filter((r) => r.user_id === u.id).length;
    const goalCount = db.goals.filter((g) => g.user_id === u.id).length;
    const scenCount = db.scenarios.filter((s) => s.user_id === u.id).length;
    return res.json({
      user: sanitizeUser(u),
      data_summary: {
        footprint_records: recCount,
        goals: goalCount,
        scenarios: scenCount,
      },
    });
  });

  app.put('/api/settings', requireAuth, (req: AuthenticatedRequest, res) => {
    const u = req.user!;
    const { name, age, city, household_size, units, theme, notifications_enabled } = req.body || {};
    if (name !== undefined && String(name).trim()) u.name = String(name).trim();
    if (age !== undefined) u.age = Math.max(10, Math.min(110, Number(age) || 28));
    if (city !== undefined) u.city = String(city).trim();
    if (household_size !== undefined) u.household_size = Math.max(1, Math.min(25, Number(household_size) || 1));
    if (units === 'metric' || units === 'imperial') u.units = units;
    if (theme === 'light' || theme === 'dark') u.theme = theme;
    if (typeof notifications_enabled === 'boolean') u.notifications_enabled = notifications_enabled;

    saveDb();
    return res.json({
      message: 'Settings updated successfully.',
      user: sanitizeUser(u),
    });
  });

  // Serve standalone HTML/CSS/Vanilla JS files under /frontend if accessed directly
  const frontendDir = path.join(process.cwd(), 'frontend');
  if (fs.existsSync(frontendDir)) {
    app.use('/frontend', express.static(frontendDir));
  }

  // Vite / Static Client Mount
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ECO TWIN ML Full-Stack Platform listening on http://localhost:${PORT}`);
  });
}

startServer();
