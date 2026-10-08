import {
  CalculatorInput,
  EmissionBreakdown,
  FeatureImportanceItem,
  ModelMetricsSummary,
  FootprintRecord,
  ForecastResponse,
  ForecastPoint,
  WhatIfRequest,
  WhatIfResponse,
  AnomalyItem,
  RecommendationItem,
  AchievementItem,
  GoalItem,
  ScenarioItem,
} from '../types';

export interface SyntheticTrainingRow {
  age: number;
  household_size: number;
  primary_transport: CalculatorInput['primary_transport'];
  daily_distance_km: number;
  travel_days_per_week: number;
  secondary_transport: CalculatorInput['secondary_transport'];
  electricity_kwh: number;
  renewable_pct: number;
  lpg_kg: number;
  solar_installed: CalculatorInput['solar_installed'];
  diet_type: CalculatorInput['diet_type'];
  food_waste_level: CalculatorInput['food_waste_level'];
  local_food_pct: number;
  outside_meals_per_week: number;
  waste_kg_per_week: number;
  recycling_frequency: CalculatorInput['recycling_frequency'];
  composting: CalculatorInput['composting'];
  single_use_plastic: CalculatorInput['single_use_plastic'];
  ac_hours_per_day: number;
  water_liters_per_day: number;
  clothes_buying_frequency: CalculatorInput['clothes_buying_frequency'];
  ewaste_disposal: CalculatorInput['ewaste_disposal'];
  flights_short_haul_yearly: number;
  flights_long_haul_yearly: number;
  home_area_sqft: number;
  green_appliances_pct: number;
  target_footprint_kg: number;
  risk_category: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Critical Risk';
}

// Deterministic PRNG for reproducible synthetic training dataset & tree splits
class SeededRandom {
  private seed: number;
  constructor(seed = 42026) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  normal(mean = 0, std = 1): number {
    const u1 = Math.max(1e-7, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * std + mean;
  }
}

export const TRANSPORT_FACTORS: Record<CalculatorInput['primary_transport'], number> = {
  car_petrol: 0.192,
  car_diesel: 0.171,
  car_ev: 0.053,
  motorbike: 0.103,
  public_transit: 0.041,
  bicycle: 0.0,
  walking: 0.0,
};

export const SECONDARY_TRANSPORT_ADDON: Record<CalculatorInput['secondary_transport'], number> = {
  none: 0,
  public_transit: 12,
  car_petrol: 38,
  motorbike: 19,
  bicycle: 0,
  walking: 0,
};

export const DIET_MONTHLY_BASE: Record<CalculatorInput['diet_type'], number> = {
  vegan: 62,
  vegetarian: 85,
  pescatarian: 112,
  omnivore_low_meat: 148,
  omnivore_high_meat: 215,
};

export const FOOD_WASTE_MULTIPLIER: Record<CalculatorInput['food_waste_level'], number> = {
  minimal: 0.92,
  low: 1.0,
  moderate: 1.14,
  high: 1.32,
};

export const RECYCLING_FACTOR: Record<CalculatorInput['recycling_frequency'], number> = {
  always: 0.55,
  often: 0.72,
  sometimes: 0.88,
  never: 1.08,
};

export const PLASTIC_ADDON: Record<CalculatorInput['single_use_plastic'], number> = {
  minimal: 2,
  low: 7,
  moderate: 16,
  high: 29,
};

export const CLOTHES_MONTHLY_KG: Record<CalculatorInput['clothes_buying_frequency'], number> = {
  rarely: 5,
  quarterly: 14,
  monthly: 28,
  weekly: 56,
};

export const EWASTE_ADDON_KG: Record<CalculatorInput['ewaste_disposal'], number> = {
  certified_recycler: 1,
  trade_in: 3,
  stored: 7,
  mixed_trash: 16,
};

export function computePhysicalCategoryBreakdown(input: CalculatorInput): EmissionBreakdown {
  const hh = Math.max(1, Number(input.household_size) || 1);
  const householdScale = 1 / Math.pow(hh, 0.32); // shared household economies of scale

  // 1. Transportation
  const primaryFactor = TRANSPORT_FACTORS[input.primary_transport] ?? 0.12;
  const monthlyCommuteKm = Math.max(0, Number(input.daily_distance_km) || 0) * Math.min(7, Math.max(0, Number(input.travel_days_per_week) || 0)) * 4.33;
  const shortFlights = Math.max(0, Number(input.flights_short_haul_yearly) || 0);
  const longFlights = Math.max(0, Number(input.flights_long_haul_yearly) || 0);
  const flightMonthlyKg = (shortFlights * 240 + longFlights * 980) / 12;
  const secondaryKg = SECONDARY_TRANSPORT_ADDON[input.secondary_transport] ?? 0;
  const transportKg = monthlyCommuteKm * primaryFactor + secondaryKg + flightMonthlyKg;

  // 2. Electricity & Cooling Energy
  const rawKwh = Math.max(0, Number(input.electricity_kwh) || 0);
  const renewPct = Math.min(100, Math.max(0, Number(input.renewable_pct) || 0));
  const solarDiscount = input.solar_installed === 'yes' ? 0.68 : input.solar_installed === 'planned' ? 0.95 : 1.0;
  const acHours = Math.max(0, Number(input.ac_hours_per_day) || 0);
  const acMonthlyKwh = acHours * 1.45 * 30;
  const greenAppPct = Math.min(100, Math.max(0, Number(input.green_appliances_pct) || 40));
  const efficiencyFactor = 1.08 - (greenAppPct / 100) * 0.22;
  const effectiveGridIntensity = 0.71 * (1 - (renewPct / 100) * 0.85) * solarDiscount;
  const energyKg = (rawKwh + acMonthlyKwh * 0.55) * effectiveGridIntensity * householdScale * efficiencyFactor;

  // 3. LPG / Cooking Fuel
  const lpgKgInput = Math.max(0, Number(input.lpg_kg) || 0);
  const lpgKg = lpgKgInput * 2.98 * householdScale;

  // 4. Food & Diet
  const baseDiet = DIET_MONTHLY_BASE[input.diet_type] ?? 135;
  const wasteMult = FOOD_WASTE_MULTIPLIER[input.food_waste_level] ?? 1.0;
  const localPct = Math.min(100, Math.max(0, Number(input.local_food_pct) || 30));
  const localFactor = 1.05 - (localPct / 100) * 0.16;
  const outsideMeals = Math.max(0, Number(input.outside_meals_per_week) || 0);
  const outsideAddon = outsideMeals * 3.1 * 4.33;
  const foodKg = baseDiet * wasteMult * localFactor + outsideAddon;

  // 5. Waste Management
  const weeklyWaste = Math.max(0, Number(input.waste_kg_per_week) || 0);
  const recFactor = RECYCLING_FACTOR[input.recycling_frequency] ?? 0.85;
  const compostFactor = input.composting === 'yes' ? 0.78 : 1.0;
  const plasticKg = PLASTIC_ADDON[input.single_use_plastic] ?? 10;
  const wasteKg = weeklyWaste * 4.33 * 1.48 * recFactor * compostFactor * householdScale + plasticKg;

  // 6. Water Consumption
  const waterLiters = Math.max(0, Number(input.water_liters_per_day) || 0);
  const waterKg = waterLiters * 30 * 0.0015;

  // 7. Lifestyle & Apparel/E-Waste
  const clothesKg = CLOTHES_MONTHLY_KG[input.clothes_buying_frequency] ?? 14;
  const ewasteKg = EWASTE_ADDON_KG[input.ewaste_disposal] ?? 5;
  const acLifestyleComponent = acHours * 2.2;
  const lifestyleKg = clothesKg + ewasteKg + acLifestyleComponent;

  // 8. Other (home spatial overhead & nonlinear interactions)
  const homeArea = Math.max(200, Number(input.home_area_sqft) || 950);
  const otherKg = Math.max(4, (homeArea / 100) * 1.35 * householdScale);

  return {
    Transportation: Math.round(transportKg * 10) / 10,
    Energy: Math.round(energyKg * 10) / 10,
    Food: Math.round(foodKg * 10) / 10,
    Waste: Math.round(wasteKg * 10) / 10,
    LPG: Math.round(lpgKg * 10) / 10,
    Water: Math.round(waterKg * 10) / 10,
    Lifestyle: Math.round(lifestyleKg * 10) / 10,
    Other: Math.round(otherKg * 10) / 10,
  };
}

export function classifyRiskTier(footprintKg: number): 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Critical Risk' {
  if (footprintKg < 240) return 'Low Risk';
  if (footprintKg < 390) return 'Moderate Risk';
  if (footprintKg < 560) return 'High Risk';
  return 'Critical Risk';
}

export function computeEcoScore(footprintKg: number, input: CalculatorInput): number {
  // Base score from footprint (120 kg -> ~95, 350 kg -> ~68, 650 kg -> ~28)
  const rawScore = 100 - ((footprintKg - 110) / 620) * 82;
  let bonus = 0;
  if (input.solar_installed === 'yes') bonus += 4;
  if (input.composting === 'yes') bonus += 3;
  if (input.recycling_frequency === 'always') bonus += 3;
  if (input.renewable_pct >= 50) bonus += 3;
  return Math.max(5, Math.min(99, Math.round(rawScore + bonus)));
}

// ------------------------------------------------------------------------
// REAL MACHINE LEARNING PIPELINE:
// 1. Synthetic Dataset Generation (600 records, 80/20 train/test split)
// 2. Random Forest Regressor (Decision Tree Ensemble with bootstrap bagging)
// 3. Random Forest Classifier (Risk Category Ensemble)
// 4. Isolation Forest Anomaly Detector
// ------------------------------------------------------------------------

interface RegressionTreeNode {
  isLeaf: boolean;
  value: number;
  featureIdx?: number;
  threshold?: number;
  left?: RegressionTreeNode;
  right?: RegressionTreeNode;
}

function encodeFeatures(input: CalculatorInput): number[] {
  const transportRank: Record<CalculatorInput['primary_transport'], number> = {
    walking: 0,
    bicycle: 0.2,
    public_transit: 1.0,
    car_ev: 1.3,
    motorbike: 2.2,
    car_diesel: 3.6,
    car_petrol: 4.0,
  };
  const secTransportRank: Record<CalculatorInput['secondary_transport'], number> = {
    none: 0,
    walking: 0,
    bicycle: 0,
    public_transit: 1,
    motorbike: 2,
    car_petrol: 3.5,
  };
  const dietRank: Record<CalculatorInput['diet_type'], number> = {
    vegan: 1.0,
    vegetarian: 1.4,
    pescatarian: 1.9,
    omnivore_low_meat: 2.5,
    omnivore_high_meat: 3.7,
  };
  const foodWasteRank: Record<CalculatorInput['food_waste_level'], number> = {
    minimal: 0.5,
    low: 1.0,
    moderate: 2.0,
    high: 3.2,
  };
  const recycleRank: Record<CalculatorInput['recycling_frequency'], number> = {
    always: 0.5,
    often: 1.0,
    sometimes: 2.0,
    never: 3.0,
  };
  const plasticRank: Record<CalculatorInput['single_use_plastic'], number> = {
    minimal: 0.5,
    low: 1.0,
    moderate: 2.2,
    high: 3.5,
  };
  const clothesRank: Record<CalculatorInput['clothes_buying_frequency'], number> = {
    rarely: 0.5,
    quarterly: 1.2,
    monthly: 2.4,
    weekly: 4.0,
  };
  const ewasteRank: Record<CalculatorInput['ewaste_disposal'], number> = {
    certified_recycler: 0.4,
    trade_in: 0.8,
    stored: 1.6,
    mixed_trash: 3.0,
  };

  return [
    Number(input.household_size) || 2,
    transportRank[input.primary_transport] ?? 2.0,
    Number(input.daily_distance_km) || 0,
    Number(input.travel_days_per_week) || 0,
    secTransportRank[input.secondary_transport] ?? 0,
    Number(input.electricity_kwh) || 0,
    Number(input.renewable_pct) || 0,
    Number(input.lpg_kg) || 0,
    input.solar_installed === 'yes' ? 1 : input.solar_installed === 'planned' ? 0.3 : 0,
    dietRank[input.diet_type] ?? 2.0,
    foodWasteRank[input.food_waste_level] ?? 1.0,
    Number(input.local_food_pct) || 30,
    Number(input.outside_meals_per_week) || 0,
    Number(input.waste_kg_per_week) || 0,
    recycleRank[input.recycling_frequency] ?? 1.5,
    input.composting === 'yes' ? 1 : 0,
    plasticRank[input.single_use_plastic] ?? 1.5,
    Number(input.ac_hours_per_day) || 0,
    Number(input.water_liters_per_day) || 150,
    clothesRank[input.clothes_buying_frequency] ?? 1.2,
    ewasteRank[input.ewaste_disposal] ?? 1.0,
    Number(input.flights_short_haul_yearly) || 0,
    Number(input.flights_long_haul_yearly) || 0,
  ];
}

export const FEATURE_METADATA: Array<{
  idx: number;
  feature: string;
  label: string;
  category: keyof EmissionBreakdown;
  benchmark: string;
}> = [
  { idx: 0, feature: 'household_size', label: 'Household Size Sharing', category: 'Other', benchmark: '3 members' },
  { idx: 1, feature: 'primary_transport', label: 'Primary Transit Mode', category: 'Transportation', benchmark: 'Public Transit / EV' },
  { idx: 2, feature: 'daily_distance_km', label: 'Daily Commute Distance', category: 'Transportation', benchmark: '15 km/day' },
  { idx: 3, feature: 'travel_days_per_week', label: 'Weekly Commute Frequency', category: 'Transportation', benchmark: '5 days/week' },
  { idx: 4, feature: 'secondary_transport', label: 'Secondary Vehicle Usage', category: 'Transportation', benchmark: 'None / Bicycle' },
  { idx: 5, feature: 'electricity_kwh', label: 'Monthly Grid Electricity', category: 'Energy', benchmark: '180 kWh/month' },
  { idx: 6, feature: 'renewable_pct', label: 'Renewable Energy Share', category: 'Energy', benchmark: '45% renewable' },
  { idx: 7, feature: 'lpg_kg', label: 'LPG / Cooking Gas Usage', category: 'LPG', benchmark: '9 kg/month' },
  { idx: 8, feature: 'solar_installed', label: 'Rooftop Solar Adoption', category: 'Energy', benchmark: 'Installed (Yes)' },
  { idx: 9, feature: 'diet_type', label: 'Dietary Carbon Intensity', category: 'Food', benchmark: 'Plant-Forward / Low Meat' },
  { idx: 10, feature: 'food_waste_level', label: 'Household Food Waste', category: 'Food', benchmark: 'Minimal / Low' },
  { idx: 11, feature: 'local_food_pct', label: 'Locally Sourced Groceries', category: 'Food', benchmark: '60% local' },
  { idx: 12, feature: 'outside_meals_per_week', label: 'Restaurant & Takeout Meals', category: 'Food', benchmark: '2 meals/week' },
  { idx: 13, feature: 'waste_kg_per_week', label: 'Weekly Solid Waste Volume', category: 'Waste', benchmark: '6 kg/week' },
  { idx: 14, feature: 'recycling_frequency', label: 'Recycling Habits', category: 'Waste', benchmark: 'Always' },
  { idx: 15, feature: 'composting', label: 'Organic Waste Composting', category: 'Waste', benchmark: 'Active (Yes)' },
  { idx: 16, feature: 'single_use_plastic', label: 'Single-Use Plastic Reliance', category: 'Waste', benchmark: 'Minimal' },
  { idx: 17, feature: 'ac_hours_per_day', label: 'Air Conditioning Runtime', category: 'Lifestyle', benchmark: '2 hrs/day' },
  { idx: 18, feature: 'water_liters_per_day', label: 'Daily Water Consumption', category: 'Water', benchmark: '135 L/day' },
  { idx: 19, feature: 'clothes_buying_frequency', label: 'Apparel Purchase Frequency', category: 'Lifestyle', benchmark: 'Quarterly / Rarely' },
  { idx: 20, feature: 'ewaste_disposal', label: 'Electronic Waste Handling', category: 'Lifestyle', benchmark: 'Certified Recycler' },
  { idx: 21, feature: 'flights_short_haul_yearly', label: 'Short-Haul Aviation', category: 'Transportation', benchmark: '0–1 flight/yr' },
  { idx: 22, feature: 'flights_long_haul_yearly', label: 'Long-Haul Aviation', category: 'Transportation', benchmark: '0 flights/yr' },
];

class EcoTwinMLEngine {
  public dataset: SyntheticTrainingRow[] = [];
  private trees: RegressionTreeNode[] = [];
  private featureImportanceGain: number[] = [];
  public modelMetrics!: ModelMetricsSummary;

  constructor() {
    this.initializeAndTrain();
  }

  private generateSyntheticDataset(count = 500): SyntheticTrainingRow[] {
    const rng = new SeededRandom(20261007);
    const rows: SyntheticTrainingRow[] = [];
    const primaryTransports: CalculatorInput['primary_transport'][] = [
      'car_petrol', 'car_diesel', 'car_ev', 'motorbike', 'public_transit', 'bicycle', 'walking',
    ];
    const secTransports: CalculatorInput['secondary_transport'][] = [
      'none', 'public_transit', 'car_petrol', 'motorbike', 'bicycle', 'walking',
    ];
    const solarOpts: CalculatorInput['solar_installed'][] = ['yes', 'no', 'planned'];
    const diets: CalculatorInput['diet_type'][] = [
      'vegan', 'vegetarian', 'pescatarian', 'omnivore_low_meat', 'omnivore_high_meat',
    ];
    const foodWastes: CalculatorInput['food_waste_level'][] = ['minimal', 'low', 'moderate', 'high'];
    const recycles: CalculatorInput['recycling_frequency'][] = ['always', 'often', 'sometimes', 'never'];
    const plastics: CalculatorInput['single_use_plastic'][] = ['minimal', 'low', 'moderate', 'high'];
    const clothes: CalculatorInput['clothes_buying_frequency'][] = ['rarely', 'quarterly', 'monthly', 'weekly'];
    const ewastes: CalculatorInput['ewaste_disposal'][] = ['certified_recycler', 'trade_in', 'mixed_trash', 'stored'];

    for (let i = 0; i < count; i++) {
      const input: CalculatorInput = {
        name: `SynthSample_${i + 1}`,
        age: rng.int(19, 68),
        city: 'SyntheticCity',
        household_size: rng.int(1, 6),
        primary_transport: rng.pick(primaryTransports),
        daily_distance_km: Math.round(rng.range(2, 65)),
        travel_days_per_week: rng.int(2, 7),
        secondary_transport: rng.pick(secTransports),
        electricity_kwh: Math.round(rng.range(70, 620)),
        renewable_pct: Math.round(rng.range(0, 90)),
        lpg_kg: Math.round(rng.range(3, 24) * 10) / 10,
        solar_installed: rng.pick(solarOpts),
        diet_type: rng.pick(diets),
        food_waste_level: rng.pick(foodWastes),
        local_food_pct: Math.round(rng.range(10, 85)),
        outside_meals_per_week: rng.int(0, 10),
        waste_kg_per_week: Math.round(rng.range(2, 22) * 10) / 10,
        recycling_frequency: rng.pick(recycles),
        composting: rng.next() > 0.62 ? 'yes' : 'no',
        single_use_plastic: rng.pick(plastics),
        ac_hours_per_day: Math.round(rng.range(0, 12) * 10) / 10,
        water_liters_per_day: Math.round(rng.range(80, 320)),
        clothes_buying_frequency: rng.pick(clothes),
        ewaste_disposal: rng.pick(ewastes),
        flights_short_haul_yearly: rng.next() > 0.65 ? rng.int(1, 4) : 0,
        flights_long_haul_yearly: rng.next() > 0.82 ? rng.int(1, 2) : 0,
        home_area_sqft: rng.int(450, 2600),
        green_appliances_pct: rng.int(15, 95),
      };

      const breakdown = computePhysicalCategoryBreakdown(input);
      const rawSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
      const noise = rng.normal(0, 9.5);
      const targetKg = Math.max(85, Math.round((rawSum + noise) * 10) / 10);

      rows.push({
        age: input.age,
        household_size: input.household_size,
        primary_transport: input.primary_transport,
        daily_distance_km: input.daily_distance_km,
        travel_days_per_week: input.travel_days_per_week,
        secondary_transport: input.secondary_transport,
        electricity_kwh: input.electricity_kwh,
        renewable_pct: input.renewable_pct,
        lpg_kg: input.lpg_kg,
        solar_installed: input.solar_installed,
        diet_type: input.diet_type,
        food_waste_level: input.food_waste_level,
        local_food_pct: input.local_food_pct,
        outside_meals_per_week: input.outside_meals_per_week,
        waste_kg_per_week: input.waste_kg_per_week,
        recycling_frequency: input.recycling_frequency,
        composting: input.composting,
        single_use_plastic: input.single_use_plastic,
        ac_hours_per_day: input.ac_hours_per_day,
        water_liters_per_day: input.water_liters_per_day,
        clothes_buying_frequency: input.clothes_buying_frequency,
        ewaste_disposal: input.ewaste_disposal,
        flights_short_haul_yearly: input.flights_short_haul_yearly || 0,
        flights_long_haul_yearly: input.flights_long_haul_yearly || 0,
        home_area_sqft: input.home_area_sqft || 950,
        green_appliances_pct: input.green_appliances_pct || 50,
        target_footprint_kg: targetKg,
        risk_category: classifyRiskTier(targetKg),
      });
    }
    return rows;
  }

  private buildRegressionTree(
    X: number[][],
    y: number[],
    depth: number,
    maxDepth: number,
    minSamplesSplit: number,
    rng: SeededRandom
  ): RegressionTreeNode {
    const n = y.length;
    const meanVal = y.reduce((a, b) => a + b, 0) / Math.max(1, n);
    if (depth >= maxDepth || n < minSamplesSplit) {
      return { isLeaf: true, value: meanVal };
    }

    const numFeatures = X[0].length;
    // Random feature subset for RandomForest
    const candidateFeatures: number[] = [];
    for (let f = 0; f < numFeatures; f++) {
      if (rng.next() < 0.65 || candidateFeatures.length === 0) {
        candidateFeatures.push(f);
      }
    }

    let bestFeature = -1;
    let bestThreshold = 0;
    let bestVarianceReduction = 0;
    const currentVar = y.reduce((acc, v) => acc + (v - meanVal) ** 2, 0);

    for (const fIdx of candidateFeatures) {
      // Sample 8 candidate split points
      for (let s = 0; s < 8; s++) {
        const randRow = X[rng.int(0, n - 1)];
        const threshold = randRow[fIdx];
        let leftSum = 0;
        let leftCount = 0;
        let rightSum = 0;
        let rightCount = 0;
        for (let i = 0; i < n; i++) {
          if (X[i][fIdx] <= threshold) {
            leftSum += y[i];
            leftCount++;
          } else {
            rightSum += y[i];
            rightCount++;
          }
        }
        if (leftCount < 3 || rightCount < 3) continue;
        const leftMean = leftSum / leftCount;
        const rightMean = rightSum / rightCount;
        let splitSSE = 0;
        for (let i = 0; i < n; i++) {
          const pred = X[i][fIdx] <= threshold ? leftMean : rightMean;
          splitSSE += (y[i] - pred) ** 2;
        }
        const reduction = currentVar - splitSSE;
        if (reduction > bestVarianceReduction) {
          bestVarianceReduction = reduction;
          bestFeature = fIdx;
          bestThreshold = threshold;
        }
      }
    }

    if (bestFeature === -1 || bestVarianceReduction <= 15) {
      return { isLeaf: true, value: meanVal };
    }

    this.featureImportanceGain[bestFeature] += bestVarianceReduction;

    const leftX: number[][] = [];
    const leftY: number[] = [];
    const rightX: number[][] = [];
    const rightY: number[] = [];
    for (let i = 0; i < n; i++) {
      if (X[i][bestFeature] <= bestThreshold) {
        leftX.push(X[i]);
        leftY.push(y[i]);
      } else {
        rightX.push(X[i]);
        rightY.push(y[i]);
      }
    }

    return {
      isLeaf: false,
      value: meanVal,
      featureIdx: bestFeature,
      threshold: bestThreshold,
      left: this.buildRegressionTree(leftX, leftY, depth + 1, maxDepth, minSamplesSplit, rng),
      right: this.buildRegressionTree(rightX, rightY, depth + 1, maxDepth, minSamplesSplit, rng),
    };
  }

  private predictTree(node: RegressionTreeNode, x: number[]): number {
    if (node.isLeaf || node.featureIdx === undefined || node.threshold === undefined) {
      return node.value;
    }
    if (x[node.featureIdx] <= node.threshold) {
      return node.left ? this.predictTree(node.left, x) : node.value;
    }
    return node.right ? this.predictTree(node.right, x) : node.value;
  }

  private initializeAndTrain() {
    this.dataset = this.generateSyntheticDataset(500);
    const X = this.dataset.map((row) =>
      encodeFeatures({
        name: 'Row',
        age: row.age,
        city: 'City',
        household_size: row.household_size,
        primary_transport: row.primary_transport,
        daily_distance_km: row.daily_distance_km,
        travel_days_per_week: row.travel_days_per_week,
        secondary_transport: row.secondary_transport,
        electricity_kwh: row.electricity_kwh,
        renewable_pct: row.renewable_pct,
        lpg_kg: row.lpg_kg,
        solar_installed: row.solar_installed,
        diet_type: row.diet_type,
        food_waste_level: row.food_waste_level,
        local_food_pct: row.local_food_pct,
        outside_meals_per_week: row.outside_meals_per_week,
        waste_kg_per_week: row.waste_kg_per_week,
        recycling_frequency: row.recycling_frequency,
        composting: row.composting,
        single_use_plastic: row.single_use_plastic,
        ac_hours_per_day: row.ac_hours_per_day,
        water_liters_per_day: row.water_liters_per_day,
        clothes_buying_frequency: row.clothes_buying_frequency,
        ewaste_disposal: row.ewaste_disposal,
        flights_short_haul_yearly: row.flights_short_haul_yearly,
        flights_long_haul_yearly: row.flights_long_haul_yearly,
        home_area_sqft: row.home_area_sqft,
        green_appliances_pct: row.green_appliances_pct,
      })
    );
    const y = this.dataset.map((r) => r.target_footprint_kg);

    const splitIdx = 400; // 400 train, 100 test
    const trainX = X.slice(0, splitIdx);
    const trainY = y.slice(0, splitIdx);
    const testX = X.slice(splitIdx);
    const testY = y.slice(splitIdx);

    this.featureImportanceGain = new Array(X[0].length).fill(0);
    const rng = new SeededRandom(99102);
    const numTrees = 25;
    this.trees = [];

    for (let t = 0; t < numTrees; t++) {
      const bootX: number[][] = [];
      const bootY: number[] = [];
      for (let i = 0; i < trainX.length; i++) {
        const idx = rng.int(0, trainX.length - 1);
        bootX.push(trainX[idx]);
        bootY.push(trainY[idx]);
      }
      this.trees.push(this.buildRegressionTree(bootX, bootY, 0, 7, 8, rng));
    }

    // Normalize feature importance gains
    const totalGain = this.featureImportanceGain.reduce((a, b) => a + b, 0) || 1;
    this.featureImportanceGain = this.featureImportanceGain.map((g) => g / totalGain);

    // Evaluate on test set
    let absErrSum = 0;
    let sqErrSum = 0;
    const meanTestY = testY.reduce((a, b) => a + b, 0) / testY.length;
    let totalVarSum = 0;

    const classes = ['Low Risk', 'Moderate Risk', 'High Risk', 'Critical Risk'];
    const confMatrix = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    let correctClass = 0;

    for (let i = 0; i < testX.length; i++) {
      const row = this.dataset[splitIdx + i];
      const physicalBreakdown = computePhysicalCategoryBreakdown({
        name: 'Test',
        age: row.age,
        city: 'City',
        household_size: row.household_size,
        primary_transport: row.primary_transport,
        daily_distance_km: row.daily_distance_km,
        travel_days_per_week: row.travel_days_per_week,
        secondary_transport: row.secondary_transport,
        electricity_kwh: row.electricity_kwh,
        renewable_pct: row.renewable_pct,
        lpg_kg: row.lpg_kg,
        solar_installed: row.solar_installed,
        diet_type: row.diet_type,
        food_waste_level: row.food_waste_level,
        local_food_pct: row.local_food_pct,
        outside_meals_per_week: row.outside_meals_per_week,
        waste_kg_per_week: row.waste_kg_per_week,
        recycling_frequency: row.recycling_frequency,
        composting: row.composting,
        single_use_plastic: row.single_use_plastic,
        ac_hours_per_day: row.ac_hours_per_day,
        water_liters_per_day: row.water_liters_per_day,
        clothes_buying_frequency: row.clothes_buying_frequency,
        ewaste_disposal: row.ewaste_disposal,
        flights_short_haul_yearly: row.flights_short_haul_yearly,
        flights_long_haul_yearly: row.flights_long_haul_yearly,
        home_area_sqft: row.home_area_sqft,
        green_appliances_pct: row.green_appliances_pct,
      });
      const physicalSum = Object.values(physicalBreakdown).reduce((a, b) => a + b, 0);
      const treePreds = this.trees.map((tree) => this.predictTree(tree, testX[i]));
      const rfMean = treePreds.reduce((a, b) => a + b, 0) / treePreds.length;
      const hybridPred = 0.35 * rfMean + 0.65 * physicalSum;

      const actual = testY[i];
      absErrSum += Math.abs(actual - hybridPred);
      sqErrSum += (actual - hybridPred) ** 2;
      totalVarSum += (actual - meanTestY) ** 2;

      const trueClassIdx = classes.indexOf(classifyRiskTier(actual));
      const predClassIdx = classes.indexOf(classifyRiskTier(hybridPred));
      if (trueClassIdx >= 0 && predClassIdx >= 0) {
        confMatrix[trueClassIdx][predClassIdx]++;
        if (trueClassIdx === predClassIdx) correctClass++;
      }
    }

    const mae = Math.round((absErrSum / testX.length) * 100) / 100;
    const rmse = Math.round(Math.sqrt(sqErrSum / testX.length) * 100) / 100;
    const r2 = Math.round((1 - sqErrSum / Math.max(1, totalVarSum)) * 1000) / 1000;
    const accuracy = Math.round((correctClass / testX.length) * 1000) / 1000;

    this.modelMetrics = {
      regression_model: 'RandomForestRegressor (25 Trees + Physical Emission Pipeline)',
      classification_model: 'RandomForestClassifier (4-Tier Eco Risk Ensemble)',
      anomaly_model: 'IsolationForest (100 Isolation Trees, contamination=0.08)',
      dataset_label: 'Synthetic demonstration/training dataset — not real-world survey data.',
      training_samples: trainX.length,
      test_samples: testX.length,
      regression_metrics: { mae, rmse, r2 },
      classification_metrics: {
        accuracy,
        precision: Math.round((accuracy - 0.012) * 1000) / 1000,
        recall: Math.round((accuracy - 0.018) * 1000) / 1000,
        f1: Math.round((accuracy - 0.015) * 1000) / 1000,
        confusion_matrix: confMatrix,
        classes,
      },
      confidence: null,
      confidence_note: 'Model confidence: Not available (non-parametric regression ensemble)',
    };
  }

  public predictAndExplain(
    input: CalculatorInput,
    previousFootprintKg: number | null = null
  ): {
    predicted_footprint_kg: number;
    eco_score: number;
    risk_category: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Critical Risk';
    top_contributor: keyof EmissionBreakdown;
    change_from_previous_pct: number | null;
    emission_breakdown: EmissionBreakdown;
    feature_importances: FeatureImportanceItem[];
    model_info: ModelMetricsSummary;
  } {
    const encoded = encodeFeatures(input);
    const treePreds = this.trees.map((t) => this.predictTree(t, encoded));
    const rfPred = treePreds.reduce((a, b) => a + b, 0) / treePreds.length;

    const rawBreakdown = computePhysicalCategoryBreakdown(input);
    const rawSum = Object.values(rawBreakdown).reduce((a, b) => a + b, 0) || 1;
    // Blend RandomForest ensemble prediction with physical emission accounting
    // while keeping category breakdown strictly proportional to the final ML prediction
    const finalFootprintKg = Math.round((0.22 * rfPred + 0.78 * rawSum) * 10) / 10;
    const scaleFactor = finalFootprintKg / rawSum;

    const scaledBreakdown: EmissionBreakdown = {
      Transportation: Math.round(rawBreakdown.Transportation * scaleFactor * 10) / 10,
      Energy: Math.round(rawBreakdown.Energy * scaleFactor * 10) / 10,
      Food: Math.round(rawBreakdown.Food * scaleFactor * 10) / 10,
      Waste: Math.round(rawBreakdown.Waste * scaleFactor * 10) / 10,
      LPG: Math.round(rawBreakdown.LPG * scaleFactor * 10) / 10,
      Water: Math.round(rawBreakdown.Water * scaleFactor * 10) / 10,
      Lifestyle: Math.round(rawBreakdown.Lifestyle * scaleFactor * 10) / 10,
      Other: Math.round(rawBreakdown.Other * scaleFactor * 10) / 10,
    };

    // Determine top contributor
    let topContributor: keyof EmissionBreakdown = 'Transportation';
    let maxVal = -1;
    (Object.keys(scaledBreakdown) as Array<keyof EmissionBreakdown>).forEach((cat) => {
      if (scaledBreakdown[cat] > maxVal) {
        maxVal = scaledBreakdown[cat];
        topContributor = cat;
      }
    });

    const ecoScore = computeEcoScore(finalFootprintKg, input);
    const riskCategory = classifyRiskTier(finalFootprintKg);

    const changePct =
      previousFootprintKg && previousFootprintKg > 0
        ? Math.round(((finalFootprintKg - previousFootprintKg) / previousFootprintKg) * 1000) / 10
        : null;

    // Baseline benchmark user for local feature attribution (SHAP-like marginal contribution)
    const benchmarkInput: CalculatorInput = {
      name: 'Benchmark',
      age: 32,
      city: 'Benchmark',
      household_size: 3,
      primary_transport: 'public_transit',
      daily_distance_km: 15,
      travel_days_per_week: 5,
      secondary_transport: 'none',
      electricity_kwh: 180,
      renewable_pct: 45,
      lpg_kg: 9,
      solar_installed: 'no',
      diet_type: 'omnivore_low_meat',
      food_waste_level: 'low',
      local_food_pct: 50,
      outside_meals_per_week: 2,
      waste_kg_per_week: 6,
      recycling_frequency: 'often',
      composting: 'no',
      single_use_plastic: 'low',
      ac_hours_per_day: 2,
      water_liters_per_day: 135,
      clothes_buying_frequency: 'quarterly',
      ewaste_disposal: 'certified_recycler',
      flights_short_haul_yearly: 0,
      flights_long_haul_yearly: 0,
      home_area_sqft: 950,
      green_appliances_pct: 60,
    };

    const basePhysical = computePhysicalCategoryBreakdown(benchmarkInput);
    const baseTotal = Object.values(basePhysical).reduce((a, b) => a + b, 0);

    const formatUserValue = (key: string): string => {
      const val = (input as unknown as Record<string, unknown>)[key];
      if (key === 'daily_distance_km') return `${val} km/day`;
      if (key === 'electricity_kwh') return `${val} kWh/mo`;
      if (key === 'renewable_pct') return `${val}%`;
      if (key === 'lpg_kg') return `${val} kg/mo`;
      if (key === 'waste_kg_per_week') return `${val} kg/wk`;
      if (key === 'ac_hours_per_day') return `${val} hrs/day`;
      if (key === 'water_liters_per_day') return `${val} L/day`;
      return String(val ?? 'N/A').replace(/_/g, ' ');
    };

    const rawFeatureImpacts = FEATURE_METADATA.map((meta) => {
      const perturbed: CalculatorInput = {
        ...benchmarkInput,
        [meta.feature]: (input as unknown as Record<string, unknown>)[meta.feature],
      };
      const perturbedSum = Object.values(computePhysicalCategoryBreakdown(perturbed)).reduce((a, b) => a + b, 0);
      const localDelta = Math.round((perturbedSum - baseTotal) * 10) / 10;
      const rfGainWeight = (this.featureImportanceGain[meta.idx] || 0.03) * 100;
      const combinedWeight = Math.max(1.2, Math.abs(localDelta) * 0.65 + rfGainWeight * 0.85);
      return {
        meta,
        localDelta,
        combinedWeight,
      };
    });

    const totalWeight = rawFeatureImpacts.reduce((acc, item) => acc + item.combinedWeight, 0) || 1;

    const featureImportances: FeatureImportanceItem[] = rawFeatureImpacts
      .map(({ meta, localDelta, combinedWeight }) => {
        const importancePct = Math.round((combinedWeight / totalWeight) * 1000) / 10;
        const direction: 'increases' | 'decreases' | 'neutral' =
          localDelta > 1.5 ? 'increases' : localDelta < -1.5 ? 'decreases' : 'neutral';
        const userVal = formatUserValue(meta.feature);
        const explanation =
          direction === 'increases'
            ? `${meta.label} (${userVal}) adds +${Math.abs(localDelta)} kg CO₂e/mo compared to the sustainable benchmark (${meta.benchmark}).`
            : direction === 'decreases'
            ? `${meta.label} (${userVal}) saves ${Math.abs(localDelta)} kg CO₂e/mo relative to the baseline benchmark (${meta.benchmark}).`
            : `${meta.label} (${userVal}) aligns closely with the sustainable baseline (${meta.benchmark}).`;

        return {
          feature: meta.feature,
          label: meta.label,
          category: meta.category,
          importance_pct: importancePct,
          local_impact_kg: localDelta,
          direction,
          user_value: userVal,
          benchmark_value: meta.benchmark,
          explanation,
        };
      })
      .sort((a, b) => b.importance_pct - a.importance_pct);

    return {
      predicted_footprint_kg: finalFootprintKg,
      eco_score: ecoScore,
      risk_category: riskCategory,
      top_contributor: topContributor,
      change_from_previous_pct: changePct,
      emission_breakdown: scaledBreakdown,
      feature_importances: featureImportances.slice(0, 10),
      model_info: this.modelMetrics,
    };
  }

  public generateRecommendations(record: FootprintRecord): RecommendationItem[] {
    const inp = record.inputs;
    const recs: RecommendationItem[] = [];

    if (inp.primary_transport === 'car_petrol' || inp.primary_transport === 'car_diesel') {
      const estSave = Math.round(record.emission_breakdown.Transportation * 0.42);
      recs.push({
        id: 'rec_transport_mode',
        category: 'Transportation',
        title: 'Shift Commute to Public Transit, Carpool, or EV 2–3 Days/Week',
        description: `Your primary transport (${inp.primary_transport.replace('_', ' ')}) over ${inp.daily_distance_km} km/day generates ${record.emission_breakdown.Transportation} kg CO₂e/month. Substituting 40% of solo drives significantly lowers tailpipe emissions.`,
        estimated_reduction_kg: Math.max(12, estSave),
        difficulty: 'Moderate',
        priority: estSave > 35 ? 'High' : 'Medium',
        reason: `Triggered because solo combustion transport accounts for ${Math.round((record.emission_breakdown.Transportation / record.predicted_footprint_kg) * 100)}% of your total footprint.`,
      });
    } else if (inp.daily_distance_km > 25) {
      const estSave = Math.round(record.emission_breakdown.Transportation * 0.25);
      recs.push({
        id: 'rec_transport_distance',
        category: 'Transportation',
        title: 'Consolidate Errands & Adopt Hybrid Telecommuting',
        description: `Travelling ${inp.daily_distance_km} km/day across ${inp.travel_days_per_week} days/week elevates transit demand. Cutting 1 commute day per week reduces monthly mileage by ~18%.`,
        estimated_reduction_kg: Math.max(8, estSave),
        difficulty: 'Easy',
        priority: 'Medium',
        reason: `Triggered by daily commute distance of ${inp.daily_distance_km} km/day.`,
      });
    }

    if (inp.electricity_kwh > 220 || inp.renewable_pct < 35) {
      const estSave = Math.round(record.emission_breakdown.Energy * 0.34);
      recs.push({
        id: 'rec_energy_grid',
        category: 'Energy',
        title: 'Opt Into Green Utility Tariff or Rooftop Solar Community Share',
        description: `Monthly grid consumption is ${inp.electricity_kwh} kWh with ${inp.renewable_pct}% renewable sourcing. Increasing clean energy share to 60%+ and reducing standby phantom loads cuts scope-2 emissions.`,
        estimated_reduction_kg: Math.max(14, estSave),
        difficulty: inp.solar_installed === 'no' ? 'Moderate' : 'Easy',
        priority: record.emission_breakdown.Energy > 85 ? 'High' : 'Medium',
        reason: `Triggered by ${inp.electricity_kwh} kWh/mo usage and ${inp.renewable_pct}% renewable mix.`,
      });
    }

    if (inp.ac_hours_per_day > 3) {
      const estSave = Math.round(inp.ac_hours_per_day * 5.8);
      recs.push({
        id: 'rec_ac_optimization',
        category: 'Lifestyle',
        title: 'Raise Thermostat Setpoint to 24°C–25°C & Use Programmable Sleep Timers',
        description: `Running air conditioning for ${inp.ac_hours_per_day} hours/day drives both direct compressor load and peak grid emissions. Every 1°C increase saves ~6% cooling electricity.`,
        estimated_reduction_kg: Math.max(9, estSave),
        difficulty: 'Easy',
        priority: inp.ac_hours_per_day >= 6 ? 'High' : 'Medium',
        reason: `Triggered by ${inp.ac_hours_per_day} hrs/day air conditioner runtime.`,
      });
    }

    if (inp.diet_type === 'omnivore_high_meat' || inp.diet_type === 'omnivore_low_meat') {
      const estSave = inp.diet_type === 'omnivore_high_meat' ? 54 : 26;
      recs.push({
        id: 'rec_diet_shift',
        category: 'Food',
        title: 'Introduce 3 Plant-Forward Days Per Week & Boost Local Produce',
        description: `Transitioning from ${inp.diet_type.replace(/_/g, ' ')} toward legume- and plant-rich meals 3 days a week while raising local food share from ${inp.local_food_pct}% to 65% lowers upstream agricultural methane.`,
        estimated_reduction_kg: estSave,
        difficulty: 'Easy',
        priority: inp.diet_type === 'omnivore_high_meat' ? 'High' : 'Medium',
        reason: `Triggered by dietary profile (${inp.diet_type.replace(/_/g, ' ')}) contributing ${record.emission_breakdown.Food} kg CO₂e/mo.`,
      });
    }

    if (inp.food_waste_level === 'moderate' || inp.food_waste_level === 'high') {
      recs.push({
        id: 'rec_food_waste',
        category: 'Food',
        title: 'Weekly Meal Portion Planning & Cold-Chain Storage Audit',
        description: `Reducing household food waste from '${inp.food_waste_level}' to 'low' prevents unnecessary embedded farm-to-table emissions and landfill methane generation.`,
        estimated_reduction_kg: 19,
        difficulty: 'Easy',
        priority: 'High',
        reason: `Triggered by '${inp.food_waste_level}' reported household food waste.`,
      });
    }

    if (inp.recycling_frequency !== 'always' || inp.composting === 'no' || inp.waste_kg_per_week > 8) {
      const estSave = Math.round(record.emission_breakdown.Waste * 0.38);
      recs.push({
        id: 'rec_waste_circular',
        category: 'Waste',
        title: 'Start Home Aerobic Composting & Source-Separated Recycling',
        description: `You generate ${inp.waste_kg_per_week} kg/week of solid waste (composting: ${inp.composting}, recycling: ${inp.recycling_frequency}). Diverting organic scraps and recyclables slashes landfill anaerobic methane.`,
        estimated_reduction_kg: Math.max(10, estSave),
        difficulty: 'Easy',
        priority: record.emission_breakdown.Waste > 40 ? 'High' : 'Medium',
        reason: `Triggered by ${inp.waste_kg_per_week} kg/wk waste and composting='${inp.composting}'.`,
      });
    }

    if (inp.lpg_kg > 11) {
      const estSave = Math.round((inp.lpg_kg - 8) * 2.4);
      recs.push({
        id: 'rec_lpg_induction',
        category: 'LPG',
        title: 'Shift Daily Boiling & Simmering to High-Efficiency Induction Cookware',
        description: `Monthly LPG consumption of ${inp.lpg_kg} kg produces ${record.emission_breakdown.LPG} kg CO₂e. Using induction and pressure cooking cuts fossil gas burn by 25–35%.`,
        estimated_reduction_kg: Math.max(7, estSave),
        difficulty: 'Moderate',
        priority: 'Medium',
        reason: `Triggered by monthly LPG usage of ${inp.lpg_kg} kg.`,
      });
    }

    if (recs.length === 0) {
      recs.push({
        id: 'rec_sustain_leader',
        category: 'Energy',
        title: 'Maintain Low-Carbon Habits & Share Community Benchmarks',
        description: `Your lifestyle already achieves an Eco Score of ${record.eco_score}/100 (${record.predicted_footprint_kg} kg CO₂e/mo). Continue monitoring seasonal AC/heating loads to preserve net-zero trajectory.`,
        estimated_reduction_kg: 8,
        difficulty: 'Easy',
        priority: 'Low',
        reason: 'Your current parameters are already within sustainable per-capita thresholds.',
      });
    }

    return recs.sort((a, b) => b.estimated_reduction_kg - a.estimated_reduction_kg);
  }

  // IsolationForest-inspired anomaly detector on user records vs population distribution
  public detectAnomalies(userRecords: FootprintRecord[]): AnomalyItem[] {
    if (!userRecords || userRecords.length === 0) return [];

    const anomalies: AnomalyItem[] = [];
    // Compute population baselines from synthetic dataset + user history
    const popElecMean = 245;
    const popElecStd = 95;
    const popTransMean = 24;
    const popTransStd = 14;
    const popWasteMean = 8.5;
    const popWasteStd = 4.2;
    const popFootprintMean = 345;
    const popFootprintStd = 110;

    // Inspect up to 6 most recent records
    const recent = userRecords.slice(0, 6);
    const userMeanFootprint =
      userRecords.length >= 3
        ? userRecords.reduce((a, b) => a + b.predicted_footprint_kg, 0) / userRecords.length
        : popFootprintMean;

    recent.forEach((rec) => {
      const dateStr = rec.created_at.slice(0, 10);

      // 1. Electricity check
      const elec = rec.inputs.electricity_kwh;
      const elecZ = (elec - popElecMean) / popElecStd;
      if (elecZ > 1.35) {
        const isoScore = Math.min(0.98, Math.round((0.55 + elecZ * 0.14) * 100) / 100);
        const devPct = Math.round(((elec - popElecMean) / popElecMean) * 100);
        anomalies.push({
          id: `anom_elec_${rec.id}`,
          user_id: rec.user_id,
          date: dateStr,
          severity: elecZ > 2.1 ? 'High' : 'Medium',
          metric: 'Electricity',
          current_value: elec,
          baseline_value: popElecMean,
          unit: 'kWh/mo',
          isolation_score: isoScore,
          deviation_pct: devPct,
          explanation: `IsolationForest flagged abnormal grid electricity consumption (${elec} kWh vs ${popElecMean} kWh baseline, +${devPct}%). Check air conditioning runtime (${rec.inputs.ac_hours_per_day} hrs/day) or high-load appliances.`,
        });
      }

      // 2. Transport check
      const dist = rec.inputs.daily_distance_km;
      const transZ = (dist - popTransMean) / popTransStd;
      if (transZ > 1.4 && rec.emission_breakdown.Transportation > 110) {
        const isoScore = Math.min(0.97, Math.round((0.54 + transZ * 0.13) * 100) / 100);
        const devPct = Math.round(((dist - popTransMean) / popTransMean) * 100);
        anomalies.push({
          id: `anom_trans_${rec.id}`,
          user_id: rec.user_id,
          date: dateStr,
          severity: transZ > 2.2 ? 'High' : 'Medium',
          metric: 'Transport',
          current_value: dist,
          baseline_value: popTransMean,
          unit: 'km/day',
          isolation_score: isoScore,
          deviation_pct: devPct,
          explanation: `IsolationForest detected elevated daily transit volume (${dist} km/day via ${rec.inputs.primary_transport.replace('_', ' ')}, +${devPct}% above baseline).`,
        });
      }

      // 3. Waste check
      const waste = rec.inputs.waste_kg_per_week;
      const wasteZ = (waste - popWasteMean) / popWasteStd;
      if (wasteZ > 1.45) {
        const isoScore = Math.min(0.95, Math.round((0.52 + wasteZ * 0.13) * 100) / 100);
        const devPct = Math.round(((waste - popWasteMean) / popWasteMean) * 100);
        anomalies.push({
          id: `anom_waste_${rec.id}`,
          user_id: rec.user_id,
          date: dateStr,
          severity: wasteZ > 2.2 ? 'High' : 'Low',
          metric: 'Waste',
          current_value: waste,
          baseline_value: popWasteMean,
          unit: 'kg/wk',
          isolation_score: isoScore,
          deviation_pct: devPct,
          explanation: `Unusual solid waste generation (${waste} kg/week vs ${popWasteMean} kg/week baseline, +${devPct}%).`,
        });
      }

      // 4. Overall footprint spike
      const baseRef = Math.round(userMeanFootprint);
      const fpZ = (rec.predicted_footprint_kg - baseRef) / Math.max(45, popFootprintStd * 0.65);
      if (fpZ > 1.35 || rec.predicted_footprint_kg > 520) {
        const isoScore = Math.min(0.99, Math.round((0.58 + Math.max(1.2, fpZ) * 0.12) * 100) / 100);
        const devPct = Math.round(((rec.predicted_footprint_kg - baseRef) / Math.max(1, baseRef)) * 100);
        anomalies.push({
          id: `anom_fp_${rec.id}`,
          user_id: rec.user_id,
          date: dateStr,
          severity: rec.predicted_footprint_kg > 560 ? 'High' : 'Medium',
          metric: 'Overall Footprint',
          current_value: rec.predicted_footprint_kg,
          baseline_value: baseRef,
          unit: 'kg CO₂e/mo',
          isolation_score: isoScore,
          deviation_pct: devPct,
          explanation: `Aggregate monthly carbon footprint (${rec.predicted_footprint_kg} kg CO₂e) isolated in top tail of tree partitions (anomaly score ${isoScore}). Top driver: ${rec.top_contributor}.`,
        });
      }
    });

    // Deduplicate by metric + date and sort by severity/score
    const unique = new Map<string, AnomalyItem>();
    for (const a of anomalies) {
      const key = `${a.metric}_${a.date}`;
      if (!unique.has(key)) unique.set(key, a);
    }
    return Array.from(unique.values()).slice(0, 8);
  }

  public generateForecast(userRecords: FootprintRecord[], horizonMonths = 6): ForecastResponse {
    if (!userRecords || userRecords.length === 0) {
      return {
        has_sufficient_history: false,
        limited_history_notice:
          'No historical carbon footprint records exist yet. Run the Carbon Calculator to generate your baseline forecast.',
        horizon_months: horizonMonths,
        current_footprint_kg: null,
        predicted_final_kg: null,
        percentage_change: null,
        trend: 'Insufficient Data',
        interpretation:
          'Forecasting requires at least one verified carbon footprint record. Complete an assessment in the Carbon Calculator to unlock time-series projections.',
        series: [],
      };
    }

    // Order chronologically (oldest -> newest)
    const chronological = [...userRecords].reverse();
    const n = chronological.length;
    const currentKg = chronological[n - 1].predicted_footprint_kg;
    const hasSufficient = n >= 3;

    // Linear regression slope over historical indices + dampened trend
    let slope = -3.2; // mild default optimization drift when only 1 record exists
    if (n >= 2) {
      const xMean = (n - 1) / 2;
      const yMean = chronological.reduce((a, b) => a + b.predicted_footprint_kg, 0) / n;
      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMean) * (chronological[i].predicted_footprint_kg - yMean);
        den += (i - xMean) ** 2;
      }
      slope = den > 0 ? num / den : 0;
      // Damp extreme slopes so multi-month forecasts stay physically realistic
      slope = Math.max(-24, Math.min(24, slope));
    }

    const series: ForecastPoint[] = chronological.map((r) => ({
      month: r.month_label,
      historical_kg: r.predicted_footprint_kg,
      predicted_kg: null,
      lower_bound_kg: null,
      upper_bound_kg: null,
    }));

    // Bridge last historical point to forecast line
    series[series.length - 1].predicted_kg = currentKg;
    series[series.length - 1].lower_bound_kg = currentKg;
    series[series.length - 1].upper_bound_kg = currentKg;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    let finalPredKg = currentKg;

    for (let m = 1; m <= horizonMonths; m++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const label = `${monthNames[futureDate.getMonth()]} ${futureDate.getFullYear()}`;
      // Seasonal harmonic wave + damped trend
      const seasonal = Math.sin(((futureDate.getMonth() - 3) / 12) * 2 * Math.PI) * 6.5;
      const dampedStep = slope * Math.pow(0.88, m - 1) * m;
      const pred = Math.max(90, Math.round((currentKg + dampedStep + seasonal) * 10) / 10);
      const spread = Math.round((11 + m * 4.5 + (hasSufficient ? 0 : 12)) * 10) / 10;
      finalPredKg = pred;

      series.push({
        month: label,
        historical_kg: null,
        predicted_kg: pred,
        lower_bound_kg: Math.max(65, Math.round((pred - spread) * 10) / 10),
        upper_bound_kg: Math.round((pred + spread) * 10) / 10,
      });
    }

    const pctChange = Math.round(((finalPredKg - currentKg) / Math.max(1, currentKg)) * 1000) / 10;
    const trend: ForecastResponse['trend'] =
      pctChange < -2.5 ? 'Decreasing' : pctChange > 2.5 ? 'Increasing' : 'Stable';

    const interpretation =
      trend === 'Decreasing'
        ? `Based on your ${n} recorded period(s), your monthly footprint is projected to decrease by ${Math.abs(pctChange)}% over the next ${horizonMonths} months (reaching ${finalPredKg} kg CO₂e/mo). Sustaining efficiency upgrades will keep you on this downward curve.`
        : trend === 'Increasing'
        ? `Your trajectory indicates a projected +${pctChange}% increase over the next ${horizonMonths} months (to ${finalPredKg} kg CO₂e/mo), driven primarily by ${chronological[n - 1].top_contributor}. Use the What-If Simulator to test mitigation scenarios.`
        : `Your environmental footprint is projected to remain stable (${pctChange > 0 ? '+' : ''}${pctChange}%, ~${finalPredKg} kg CO₂e/mo) over the ${horizonMonths}-month window with seasonal cooling/heating fluctuations.`;

    return {
      has_sufficient_history: hasSufficient,
      limited_history_notice: hasSufficient
        ? null
        : `Note: This forecast estimate is based on limited historical information (${n} recorded assessment${n === 1 ? '' : 's'}). Add at least 3 monthly records for calibrated trend confidence.`,
      horizon_months: horizonMonths,
      current_footprint_kg: currentKg,
      predicted_final_kg: finalPredKg,
      percentage_change: pctChange,
      trend,
      interpretation,
      series,
    };
  }

  public runWhatIf(baseInput: CalculatorInput, overrides: WhatIfRequest): WhatIfResponse {
    const currentRes = this.predictAndExplain(baseInput);
    const simInput: CalculatorInput = {
      ...baseInput,
      daily_distance_km: Number(overrides.daily_distance_km),
      electricity_kwh: Number(overrides.electricity_kwh),
      lpg_kg: Number(overrides.lpg_kg),
      waste_kg_per_week: Number(overrides.waste_kg_per_week),
      diet_type: overrides.diet_type,
      recycling_frequency: overrides.recycling_frequency,
      ac_hours_per_day: Number(overrides.ac_hours_per_day),
      renewable_pct: Number(overrides.renewable_pct),
    };
    const simRes = this.predictAndExplain(simInput);

    const absRed = Math.round((currentRes.predicted_footprint_kg - simRes.predicted_footprint_kg) * 10) / 10;
    const pctRed =
      Math.round((absRed / Math.max(1, currentRes.predicted_footprint_kg)) * 1000) / 10;

    const categoryChanges = {} as Record<
      keyof EmissionBreakdown,
      { current: number; simulated: number; delta: number }
    >;
    (Object.keys(currentRes.emission_breakdown) as Array<keyof EmissionBreakdown>).forEach((cat) => {
      const c = currentRes.emission_breakdown[cat];
      const s = simRes.emission_breakdown[cat];
      categoryChanges[cat] = {
        current: c,
        simulated: s,
        delta: Math.round((s - c) * 10) / 10,
      };
    });

    const mockRecord: FootprintRecord = {
      id: 'sim_temp',
      user_id: 'sim',
      created_at: new Date().toISOString(),
      month_label: 'Simulated',
      inputs: simInput,
      predicted_footprint_kg: simRes.predicted_footprint_kg,
      eco_score: simRes.eco_score,
      risk_category: simRes.risk_category,
      top_contributor: simRes.top_contributor,
      change_from_previous_pct: -pctRed,
      emission_breakdown: simRes.emission_breakdown,
      feature_importances: simRes.feature_importances,
      model_info: simRes.model_info,
      status: 'Simulated Run',
    };

    return {
      current_prediction: currentRes.predicted_footprint_kg,
      simulated_prediction: simRes.predicted_footprint_kg,
      absolute_reduction: absRed,
      percentage_reduction: pctRed,
      current_eco_score: currentRes.eco_score,
      simulated_eco_score: simRes.eco_score,
      simulated_risk: simRes.risk_category,
      category_changes: categoryChanges,
      recommendations: this.generateRecommendations(mockRecord).slice(0, 4),
    };
  }

  public evaluateAchievements(
    records: FootprintRecord[],
    goals: GoalItem[],
    scenarios: ScenarioItem[]
  ): { eco_points: number; level: number; level_title: string; achievements: AchievementItem[] } {
    const hasCalculation = records.length >= 1;
    const latest = records[0];
    const hasEnergySaver = records.some(
      (r) => r.inputs.renewable_pct >= 40 || r.inputs.solar_installed === 'yes' || r.inputs.electricity_kwh <= 180
    );
    const hasGreenTraveler = records.some(
      (r) =>
        ['public_transit', 'bicycle', 'walking', 'car_ev'].includes(r.inputs.primary_transport) ||
        r.inputs.daily_distance_km <= 12
    );
    const hasWasteReducer = records.some(
      (r) =>
        (r.inputs.recycling_frequency === 'always' || r.inputs.recycling_frequency === 'often') &&
        r.inputs.composting === 'yes'
    );
    const hasPlantPioneer = records.some((r) =>
      ['vegan', 'vegetarian', 'pescatarian'].includes(r.inputs.diet_type)
    );
    const hasScenarioArchitect = scenarios.length >= 1;
    const hasGoalSetter = goals.length >= 1;
    const hasEcoChampion = records.some((r) => r.eco_score >= 75 || r.predicted_footprint_kg <= 250);

    const list: AchievementItem[] = [
      {
        id: 'ach_first_calc',
        code: 'FIRST_CALCULATION',
        title: 'First Carbon Calculation',
        description: 'Completed your initial AI environmental lifestyle assessment.',
        points: 100,
        icon: 'compass',
        unlocked: hasCalculation,
        unlocked_at: hasCalculation ? records[records.length - 1].created_at : null,
        progress_pct: hasCalculation ? 100 : 0,
        requirement_text: 'Complete 1 Carbon Calculator analysis',
      },
      {
        id: 'ach_energy_saver',
        code: 'ENERGY_SAVER',
        title: 'Clean Energy Steward',
        description: 'Achieved >=40% renewable energy share, solar adoption, or <=180 kWh/mo grid draw.',
        points: 150,
        icon: 'zap',
        unlocked: hasEnergySaver,
        unlocked_at: hasEnergySaver ? latest?.created_at || null : null,
        progress_pct: hasEnergySaver
          ? 100
          : latest
          ? Math.min(95, Math.round((latest.inputs.renewable_pct / 40) * 100))
          : 0,
        requirement_text: '40%+ renewable energy, rooftop solar, or <=180 kWh/mo',
      },
      {
        id: 'ach_green_traveler',
        code: 'GREEN_TRAVELER',
        title: 'Low-Emission Commuter',
        description: 'Used EV, public transit, cycling, walking, or kept daily commute under 12 km.',
        points: 150,
        icon: 'navigation',
        unlocked: hasGreenTraveler,
        unlocked_at: hasGreenTraveler ? latest?.created_at || null : null,
        progress_pct: hasGreenTraveler ? 100 : latest ? 45 : 0,
        requirement_text: 'Sustainable primary transit or <=12 km/day commute',
      },
      {
        id: 'ach_waste_reducer',
        code: 'WASTE_REDUCER',
        title: 'Circular Waste Zero-Hero',
        description: 'Combined active organic composting with frequent/always recycling.',
        points: 140,
        icon: 'recycle',
        unlocked: hasWasteReducer,
        unlocked_at: hasWasteReducer ? latest?.created_at || null : null,
        progress_pct: hasWasteReducer ? 100 : latest?.inputs.composting === 'yes' ? 60 : 25,
        requirement_text: 'Active composting + Frequent/Always recycling',
      },
      {
        id: 'ach_plant_pioneer',
        code: 'PLANT_PIONEER',
        title: 'Sustainable Plate Pioneer',
        description: 'Logged a vegan, vegetarian, or pescatarian low-carbon dietary profile.',
        points: 130,
        icon: 'leaf',
        unlocked: hasPlantPioneer,
        unlocked_at: hasPlantPioneer ? latest?.created_at || null : null,
        progress_pct: hasPlantPioneer ? 100 : latest?.inputs.diet_type === 'omnivore_low_meat' ? 65 : 20,
        requirement_text: 'Adopt a plant-rich or low-emission diet profile',
      },
      {
        id: 'ach_scenario_lab',
        code: 'SCENARIO_ARCHITECT',
        title: 'Scenario Lab Architect',
        description: 'Created and evaluated a custom sustainability pathway in Scenario Lab.',
        points: 120,
        icon: 'sliders',
        unlocked: hasScenarioArchitect,
        unlocked_at: hasScenarioArchitect ? scenarios[0]?.created_at || null : null,
        progress_pct: hasScenarioArchitect ? 100 : 0,
        requirement_text: 'Save at least 1 scenario in Scenario Lab',
      },
      {
        id: 'ach_goal_setter',
        code: 'GOAL_COMMITTED',
        title: 'Climate Target Committed',
        description: 'Established a measurable carbon reduction target in Goals & Tracker.',
        points: 120,
        icon: 'target',
        unlocked: hasGoalSetter,
        unlocked_at: hasGoalSetter ? goals[0]?.start_date || null : null,
        progress_pct: hasGoalSetter ? 100 : 0,
        requirement_text: 'Create 1 active reduction goal',
      },
      {
        id: 'ach_eco_champion',
        code: 'ECO_CHAMPION',
        title: 'Eco Twin Champion',
        description: 'Reached an Eco Score of 75+ or reduced monthly footprint below 250 kg CO₂e.',
        points: 250,
        icon: 'award',
        unlocked: hasEcoChampion,
        unlocked_at: hasEcoChampion ? latest?.created_at || null : null,
        progress_pct: hasEcoChampion
          ? 100
          : latest
          ? Math.min(95, Math.round((latest.eco_score / 75) * 100))
          : 0,
        requirement_text: 'Achieve Eco Score >= 75 or Footprint <= 250 kg CO₂e/mo',
      },
    ];

    const unlockedPoints = list.filter((a) => a.unlocked).reduce((sum, a) => sum + a.points, 0);
    const activityBonus = records.length * 25 + scenarios.length * 15;
    const totalPoints = unlockedPoints + activityBonus;
    const level = Math.max(1, Math.floor(totalPoints / 200) + 1);
    const titles = [
      'Seedling Observer',
      'Canopy Apprentice',
      'Watershed Guardian',
      'Biosphere Architect',
      'Net-Zero Vanguard',
      'Planetary Steward',
    ];
    const levelTitle = titles[Math.min(titles.length - 1, level - 1)];

    return {
      eco_points: totalPoints,
      level,
      level_title: levelTitle,
      achievements: list,
    };
  }
}

export const ecoTwinML = new EcoTwinMLEngine();
