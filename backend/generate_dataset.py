"""
ECO TWIN ML — Synthetic Dataset Generator (generate_dataset.py)
Notice: Synthetic demonstration/training dataset — not real-world survey data.
"""

import os
import numpy as np
import pandas as pd


def generate_synthetic_dataset(n_samples: int = 800, seed: int = 2026) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    primary_transports = [
        "car_petrol", "car_diesel", "car_ev", "motorbike", "public_transit", "bicycle", "walking"
    ]
    secondary_transports = [
        "none", "public_transit", "car_petrol", "motorbike", "bicycle", "walking"
    ]
    solar_opts = ["yes", "no", "planned"]
    diets = ["vegan", "vegetarian", "pescatarian", "omnivore_low_meat", "omnivore_high_meat"]
    food_wastes = ["minimal", "low", "moderate", "high"]
    recycles = ["always", "often", "sometimes", "never"]
    plastics = ["minimal", "low", "moderate", "high"]
    clothes = ["rarely", "quarterly", "monthly", "weekly"]
    ewastes = ["certified_recycler", "trade_in", "mixed_trash", "stored"]

    records = []
    for _ in range(n_samples):
        age = int(rng.integers(19, 70))
        household_size = int(rng.integers(1, 7))
        primary_transport = str(rng.choice(primary_transports))
        daily_distance_km = round(float(rng.uniform(2, 65)), 1)
        travel_days_per_week = int(rng.integers(2, 8))
        secondary_transport = str(rng.choice(secondary_transports))

        electricity_kwh = round(float(rng.uniform(70, 620)), 1)
        renewable_pct = round(float(rng.uniform(0, 95)), 1)
        lpg_kg = round(float(rng.uniform(3, 24)), 1)
        solar_installed = str(rng.choice(solar_opts))

        diet_type = str(rng.choice(diets))
        food_waste_level = str(rng.choice(food_wastes))
        local_food_pct = round(float(rng.uniform(10, 85)), 1)
        outside_meals_per_week = int(rng.integers(0, 11))

        waste_kg_per_week = round(float(rng.uniform(2, 22)), 1)
        recycling_frequency = str(rng.choice(recycles))
        composting = "yes" if rng.random() > 0.6 else "no"
        single_use_plastic = str(rng.choice(plastics))

        ac_hours_per_day = round(float(rng.uniform(0, 12)), 1)
        water_liters_per_day = round(float(rng.uniform(80, 320)), 1)
        clothes_buying_frequency = str(rng.choice(clothes))
        ewaste_disposal = str(rng.choice(ewastes))

        # Physical emission formula + gaussian noise
        hh_scale = 1.0 / (household_size ** 0.32)
        t_factor = {
            "car_petrol": 0.192, "car_diesel": 0.171, "car_ev": 0.053,
            "motorbike": 0.103, "public_transit": 0.041, "bicycle": 0.0, "walking": 0.0
        }[primary_transport]
        transport_kg = daily_distance_km * travel_days_per_week * 4.33 * t_factor

        solar_disc = 0.68 if solar_installed == "yes" else 0.95 if solar_installed == "planned" else 1.0
        grid_int = 0.71 * (1.0 - (renewable_pct / 100.0) * 0.85) * solar_disc
        energy_kg = (electricity_kwh + ac_hours_per_day * 1.45 * 30 * 0.55) * grid_int * hh_scale
        lpg_emissions = lpg_kg * 2.98 * hh_scale

        diet_base = {
            "vegan": 62, "vegetarian": 85, "pescatarian": 112,
            "omnivore_low_meat": 148, "omnivore_high_meat": 215
        }[diet_type]
        fw_mult = {"minimal": 0.92, "low": 1.0, "moderate": 1.14, "high": 1.32}[food_waste_level]
        food_kg = diet_base * fw_mult * (1.05 - (local_food_pct / 100.0) * 0.16) + outside_meals_per_week * 13.4

        rec_mult = {"always": 0.55, "often": 0.72, "sometimes": 0.88, "never": 1.08}[recycling_frequency]
        comp_mult = 0.78 if composting == "yes" else 1.0
        waste_kg = waste_kg_per_week * 4.33 * 1.48 * rec_mult * comp_mult * hh_scale

        water_kg = water_liters_per_day * 30 * 0.0015
        clothes_kg = {"rarely": 5, "quarterly": 14, "monthly": 28, "weekly": 56}[clothes_buying_frequency]
        ewaste_kg = {"certified_recycler": 1, "trade_in": 3, "stored": 7, "mixed_trash": 16}[ewaste_disposal]
        lifestyle_kg = clothes_kg + ewaste_kg + ac_hours_per_day * 2.2

        total_kg = max(
            85.0,
            round(
                transport_kg + energy_kg + lpg_emissions + food_kg + waste_kg + water_kg + lifestyle_kg + 12.0 + rng.normal(0, 9.0),
                1,
            ),
        )

        if total_kg < 240:
            risk = "Low Risk"
        elif total_kg < 390:
            risk = "Moderate Risk"
        elif total_kg < 560:
            risk = "High Risk"
        else:
            risk = "Critical Risk"

        records.append({
            "age": age,
            "household_size": household_size,
            "primary_transport": primary_transport,
            "daily_distance_km": daily_distance_km,
            "travel_days_per_week": travel_days_per_week,
            "secondary_transport": secondary_transport,
            "electricity_kwh": electricity_kwh,
            "renewable_pct": renewable_pct,
            "lpg_kg": lpg_kg,
            "solar_installed": solar_installed,
            "diet_type": diet_type,
            "food_waste_level": food_waste_level,
            "local_food_pct": local_food_pct,
            "outside_meals_per_week": outside_meals_per_week,
            "waste_kg_per_week": waste_kg_per_week,
            "recycling_frequency": recycling_frequency,
            "composting": composting,
            "single_use_plastic": single_use_plastic,
            "ac_hours_per_day": ac_hours_per_day,
            "water_liters_per_day": water_liters_per_day,
            "clothes_buying_frequency": clothes_buying_frequency,
            "ewaste_disposal": ewaste_disposal,
            "target_footprint_kg": total_kg,
            "risk_category": risk,
            "dataset_notice": "Synthetic demonstration/training dataset — not real-world survey data."
        })

    return pd.DataFrame(records)


if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    df = generate_synthetic_dataset(800)
    output_path = os.path.join("data", "training_data.csv")
    df.to_csv(output_path, index=False)
    print(f"[ECO TWIN ML] Saved {len(df)} synthetic training records to {output_path}")
    print("Label: Synthetic demonstration/training dataset — not real-world survey data.")
