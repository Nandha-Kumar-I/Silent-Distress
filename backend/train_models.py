"""
ECO TWIN ML — Machine Learning Training Pipeline (train_models.py)
Trains:
1. RandomForestRegressor (Carbon Footprint Regression)
2. RandomForestClassifier (Eco Risk Classification)
3. IsolationForest (Environmental Anomaly Detection)
Uses ColumnTransformer + Pipeline preprocessing and prints evaluation metrics.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, IsolationForest
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)

from generate_dataset import generate_synthetic_dataset

NUMERIC_COLS = [
    "age",
    "household_size",
    "daily_distance_km",
    "travel_days_per_week",
    "electricity_kwh",
    "renewable_pct",
    "lpg_kg",
    "local_food_pct",
    "outside_meals_per_week",
    "waste_kg_per_week",
    "ac_hours_per_day",
    "water_liters_per_day",
]

CATEGORICAL_COLS = [
    "primary_transport",
    "secondary_transport",
    "solar_installed",
    "diet_type",
    "food_waste_level",
    "recycling_frequency",
    "composting",
    "single_use_plastic",
    "clothes_buying_frequency",
    "ewaste_disposal",
]


def train_and_evaluate():
    os.makedirs("data", exist_ok=True)
    os.makedirs("models", exist_ok=True)

    csv_path = os.path.join("data", "training_data.csv")
    if not os.path.exists(csv_path):
        df = generate_synthetic_dataset(800)
        df.to_csv(csv_path, index=False)
    else:
        df = pd.read_csv(csv_path)

    required_cols = set(NUMERIC_COLS + CATEGORICAL_COLS + ["target_footprint_kg", "risk_category"])
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")

    X = df[NUMERIC_COLS + CATEGORICAL_COLS]
    y_reg = df["target_footprint_kg"]
    y_clf = df["risk_category"]

    X_train, X_test, y_reg_train, y_reg_test, y_clf_train, y_clf_test = train_test_split(
        X, y_reg, y_clf, test_size=0.2, random_state=42
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_COLS),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_COLS),
        ]
    )

    reg_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", RandomForestRegressor(n_estimators=150, max_depth=12, random_state=42)),
        ]
    )
    reg_pipeline.fit(X_train, y_reg_train)

    reg_preds = reg_pipeline.predict(X_test)
    mae = float(mean_absolute_error(y_reg_test, reg_preds))
    rmse = float(np.sqrt(mean_squared_error(y_reg_test, reg_preds)))
    r2 = float(r2_score(y_reg_test, reg_preds))

    clf_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", RandomForestClassifier(n_estimators=150, max_depth=12, random_state=42)),
        ]
    )
    clf_pipeline.fit(X_train, y_clf_train)

    clf_preds = clf_pipeline.predict(X_test)
    acc = float(accuracy_score(y_clf_test, clf_preds))
    prec = float(precision_score(y_clf_test, clf_preds, average="weighted", zero_division=0))
    rec = float(recall_score(y_clf_test, clf_preds, average="weighted", zero_division=0))
    f1 = float(f1_score(y_clf_test, clf_preds, average="weighted", zero_division=0))
    c_matrix = confusion_matrix(
        y_clf_test, clf_preds, labels=["Low Risk", "Moderate Risk", "High Risk", "Critical Risk"]
    ).tolist()

    anomaly_features = df[["electricity_kwh", "daily_distance_km", "waste_kg_per_week", "target_footprint_kg"]]
    iso_forest = IsolationForest(n_estimators=100, contamination=0.08, random_state=42)
    iso_forest.fit(anomaly_features)

    joblib.dump(reg_pipeline, os.path.join("models", "footprint_regressor.joblib"))
    joblib.dump(clf_pipeline, os.path.join("models", "risk_classifier.joblib"))
    joblib.dump(iso_forest, os.path.join("models", "anomaly_detector.joblib"))

    metrics_summary = {
        "dataset_label": "Synthetic demonstration/training dataset — not real-world survey data.",
        "regression": {"MAE": round(mae, 2), "RMSE": round(rmse, 2), "R2": round(r2, 4)},
        "classification": {
            "Accuracy": round(acc, 4),
            "Precision": round(prec, 4),
            "Recall": round(rec, 4),
            "F1": round(f1, 4),
            "ConfusionMatrix": c_matrix,
        },
    }
    with open(os.path.join("models", "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2)

    print("=== ECO TWIN ML TRAINING METRICS ===")
    print(json.dumps(metrics_summary, indent=2))


if __name__ == "__main__":
    train_and_evaluate()
