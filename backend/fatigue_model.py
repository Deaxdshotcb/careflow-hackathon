"""
CareFlow — Caregiver Fatigue Prediction Model
==============================================
Uses a Gradient Boosting Regressor trained on synthetic shift data
to predict a fatigue score (0–100) for each caregiver in real time.

Features used:
  - assignments_today        : total tasks assigned this shift
  - active_episodes          : currently active alarm episodes
  - active_tasks             : total active scheduled tasks
  - shift_hour               : hour into the shift (0–12)
  - critical_episodes_today  : how many were severity=critical
  - avg_episode_severity     : weighted severity of today's episodes
  - time_since_break_mins    : minutes since last break
  - role_numeric             : nurse=1, caregiver=0 (nurses handle more stress)
  - consecutive_assignments  : assignments in last 2 hours
  - floor_changes_today      : number of floor switches (physical strain)

Output:
  - fatigue_score (0–100)    : 0=fresh, 100=critically fatigued
  - fatigue_level            : "Low" | "Moderate" | "High" | "Critical"
  - recommendation           : plain-English action suggestion
"""

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import warnings
warnings.filterwarnings("ignore")

# ── FEATURE NAMES (must match exactly when predicting) ─────────────────────
FEATURES = [
    "assignments_today",
    "active_episodes",
    "active_tasks",
    "shift_hour",
    "critical_episodes_today",
    "avg_episode_severity",
    "time_since_break_mins",
    "role_numeric",
    "consecutive_assignments",
    "floor_changes_today",
]


# ── SYNTHETIC TRAINING DATA GENERATOR ──────────────────────────────────────

def generate_training_data(n=2000, seed=42):
    """
    Generate realistic synthetic shift data with ground-truth fatigue scores.
    Ground truth is computed from a weighted formula designed by domain logic,
    then we train the model to learn this mapping from raw features.
    """
    rng = np.random.RandomState(seed)

    assignments_today        = rng.randint(0, 15, n)
    active_episodes          = rng.randint(0, 5, n)
    active_tasks             = rng.randint(0, 8, n)
    shift_hour               = rng.randint(0, 13, n)
    critical_episodes_today  = rng.randint(0, assignments_today + 1)
    critical_episodes_today  = np.minimum(critical_episodes_today, assignments_today)
    avg_episode_severity     = rng.uniform(0, 3, n)   # 0=info, 1=warning, 2=critical, fractional avg
    time_since_break_mins    = rng.randint(0, 300, n)
    role_numeric             = rng.randint(0, 2, n)   # 0=caregiver, 1=nurse
    consecutive_assignments  = rng.randint(0, assignments_today + 1)
    consecutive_assignments  = np.minimum(consecutive_assignments, assignments_today)
    floor_changes_today      = rng.randint(0, 10, n)

    # ── Ground truth fatigue formula (domain-logic derived) ──
    fatigue = (
        assignments_today        * 4.5 +
        active_episodes          * 8.0 +
        active_tasks             * 3.0 +
        shift_hour               * 1.5 +
        critical_episodes_today  * 7.0 +
        avg_episode_severity     * 5.0 +
        (time_since_break_mins / 60) * 4.0 +
        role_numeric             * 5.0 +   # nurses take on more complex tasks
        consecutive_assignments  * 3.5 +
        floor_changes_today      * 2.0
    )

    # Add realistic noise
    fatigue += rng.normal(0, 4, n)

    # Clip to 0–100
    fatigue = np.clip(fatigue, 0, 100)

    X = np.column_stack([
        assignments_today, active_episodes, active_tasks, shift_hour,
        critical_episodes_today, avg_episode_severity, time_since_break_mins,
        role_numeric, consecutive_assignments, floor_changes_today
    ])

    return X, fatigue


# ── MODEL TRAINING ──────────────────────────────────────────────────────────

def train_model():
    """Train a GradientBoosting pipeline and return it."""
    X, y = generate_training_data(n=2000)

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("gbr", GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.08,
            max_depth=4,
            subsample=0.85,
            random_state=42,
        ))
    ])

    model.fit(X, y)
    return model


# ── SINGLETON — train once at import time ───────────────────────────────────
_MODEL = train_model()


# ── FEATURE EXTRACTION FROM CAREGIVER DICT ──────────────────────────────────

def extract_features(cg: dict, shift_hour: int = 6) -> np.ndarray:
    """
    Convert a caregiver dict into the feature vector expected by the model.
    
    Args:
        cg:         caregiver dict from CAREGIVERS list
        shift_hour: current hour into the shift (0–12), passed at runtime
    
    Returns:
        np.ndarray of shape (1, 10)
    """
    role_numeric = 1 if cg.get("role") == "nurse" else 0

    # Estimate critical episodes today from assignments (approx 30% critical)
    critical_episodes_today = max(0, round(cg.get("assignments_today", 0) * 0.3))

    # Avg severity: mix active_episodes as proxy (0=info baseline)
    avg_episode_severity = min(2.0, cg.get("active_episodes", 0) * 0.7)

    # Time since break: use last_assigned_mins_ago as proxy
    time_since_break_mins = cg.get("last_assigned_mins_ago", 60)
    if cg.get("status") == "break":
        time_since_break_mins = 0

    # Consecutive assignments in last 2 hours: rough estimate
    consecutive_assignments = min(
        cg.get("assignments_today", 0),
        max(0, round(cg.get("assignments_today", 0) * (1 - cg.get("last_assigned_mins_ago", 60) / 240)))
    )

    # Floor changes: rough estimate based on active tasks
    floor_changes_today = min(9, cg.get("active_tasks", 0) + cg.get("assignments_today", 0) // 3)

    features = np.array([[
        cg.get("assignments_today", 0),
        cg.get("active_episodes", 0),
        cg.get("active_tasks", 0),
        shift_hour,
        critical_episodes_today,
        avg_episode_severity,
        time_since_break_mins,
        role_numeric,
        consecutive_assignments,
        floor_changes_today,
    ]])

    return features


# ── PREDICTION ───────────────────────────────────────────────────────────────

def predict_fatigue(cg: dict, shift_hour: int = 6) -> dict:
    """
    Predict fatigue for a single caregiver.

    Returns a dict with:
        fatigue_score     : float 0–100
        fatigue_level     : "Low" | "Moderate" | "High" | "Critical"
        fatigue_color     : hex color for UI
        recommendation    : plain-English action
        feature_breakdown : dict of feature values used
        dispatch_penalty  : multiplier applied to dispatch score (0.4–1.0)
    """
    X = extract_features(cg, shift_hour)
    raw_score = float(np.clip(_MODEL.predict(X)[0], 0, 100))
    score = round(raw_score, 1)

    # ── Level classification ──
    if score < 25:
        level = "Low"
        color = "#22c55e"
        recommendation = "Fully fit for any assignment."
        penalty = 1.0
    elif score < 50:
        level = "Moderate"
        color = "#f59e0b"
        recommendation = "Suitable for standard assignments. Monitor workload."
        penalty = 0.85
    elif score < 72:
        level = "High"
        color = "#ef4444"
        recommendation = "Limit to non-critical tasks only. Schedule break soon."
        penalty = 0.65
    else:
        level = "Critical"
        color = "#7c3aed"
        recommendation = "Do not assign new episodes. Immediate rest recommended."
        penalty = 0.40

    # ── Feature breakdown for UI transparency ──
    feat_vals = extract_features(cg, shift_hour)[0]
    feature_breakdown = {name: round(float(val), 2) for name, val in zip(FEATURES, feat_vals)}

    return {
        "fatigue_score": score,
        "fatigue_level": level,
        "fatigue_color": color,
        "recommendation": recommendation,
        "dispatch_penalty": penalty,
        "feature_breakdown": feature_breakdown,
    }


def predict_fatigue_all(caregivers: list, shift_hour: int = 6) -> dict:
    """
    Predict fatigue for all caregivers. Returns dict keyed by caregiver id.
    """
    return {cg["id"]: predict_fatigue(cg, shift_hour) for cg in caregivers}


# ── FEATURE IMPORTANCE (for UI explainability panel) ────────────────────────

def get_feature_importance() -> list:
    """Return feature importances from the trained GBR model."""
    gbr = _MODEL.named_steps["gbr"]
    importances = gbr.feature_importances_
    return sorted(
        [{"feature": FEATURES[i], "importance": round(float(importances[i]) * 100, 1)}
         for i in range(len(FEATURES))],
        key=lambda x: x["importance"],
        reverse=True
    )


# ── SHIFT FATIGUE TREND (for history chart) ──────────────────────────────────

def simulate_fatigue_trend(cg: dict) -> list:
    """
    Simulate how a caregiver's fatigue score evolves over a 12-hour shift.
    Returns list of {hour, fatigue_score} for charting.
    """
    trend = []
    for hour in range(13):
        # Simulate increasing workload over shift
        simulated = dict(cg)
        simulated["assignments_today"] = min(15, round(cg["assignments_today"] * hour / 8))
        simulated["active_tasks"] = min(8, round(cg["active_tasks"] * hour / 6))
        simulated["last_assigned_mins_ago"] = max(5, 120 - hour * 8)
        result = predict_fatigue(simulated, shift_hour=hour)
        trend.append({"hour": hour, "fatigue_score": result["fatigue_score"],
                      "fatigue_level": result["fatigue_level"]})
    return trend


if __name__ == "__main__":
    # Quick test
    test_cg = {
        "id": "cg1", "name": "Maria John", "role": "nurse", "floor": 2,
        "status": "available", "active_tasks": 2, "active_episodes": 0,
        "assignments_today": 3, "eta_minutes": 0, "last_assigned_mins_ago": 45,
    }
    result = predict_fatigue(test_cg, shift_hour=6)
    print(f"\nFatigue for {test_cg['name']}:")
    print(f"  Score      : {result['fatigue_score']}")
    print(f"  Level      : {result['fatigue_level']}")
    print(f"  Penalty    : {result['dispatch_penalty']}")
    print(f"  Action     : {result['recommendation']}")
    print(f"\nFeature importances:")
    for f in get_feature_importance():
        print(f"  {f['feature']:30s} {f['importance']}%")
