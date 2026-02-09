import os

# ---------- Internal imports (ABSOLUTE, PACKAGE-SAFE) ----------
from backend.lstm_model import LSTMPredictor


# -------------------------------------------------
# Project root (absolute, uvicorn-safe)
# -------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_DIR = os.path.join(BASE_DIR, "models", "lstm")
SCALER_DIR = os.path.join(BASE_DIR, "models", "scalers")


# -------------------------------------------------
# Path helpers
# -------------------------------------------------
def get_model_path(symbol: str) -> str:
    return os.path.join(MODEL_DIR, f"{symbol}.keras")


def get_scaler_path(symbol: str) -> str:
    return os.path.join(SCALER_DIR, f"{symbol}_scaler.joblib")


# -------------------------------------------------
# Model registry (FINAL, SAFE)
# -------------------------------------------------
def load_or_create_lstm(symbol: str):
    """
    Always returns a predictor that is either:
    - fully loaded (model + scaler), OR
    - empty but explicitly marked for training

    Returns:
        predictor: LSTMPredictor
        needs_training: bool
    """

    model_path = get_model_path(symbol)
    scaler_path = get_scaler_path(symbol)

    predictor = LSTMPredictor()

    model_exists = os.path.exists(model_path)
    scaler_exists = os.path.exists(scaler_path)

    # -------------------------------------------------
    # Case 1: Both artifacts exist → LOAD
    # -------------------------------------------------
    if model_exists and scaler_exists:
        predictor.load(model_path, scaler_path)
        return predictor, False

    # -------------------------------------------------
    # Case 2: Partial / corrupt state → retrain
    # -------------------------------------------------
    if model_exists or scaler_exists:
        # One exists without the other → unsafe
        return predictor, True

    # -------------------------------------------------
    # Case 3: Fresh start → train
    # -------------------------------------------------
    return predictor, True
