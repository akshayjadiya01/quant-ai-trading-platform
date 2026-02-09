from pydantic import BaseModel
from typing import List


# ---------- Prediction ----------
class PredictionRequest(BaseModel):
    symbol: str
    horizon: int = 1


class PredictionResponse(BaseModel):
    symbol: str
    predicted_price: float
    last_close: float
    confidence_note: str


# ---------- Portfolio Optimization ----------
class PortfolioRequest(BaseModel):
    symbols: List[str]
    lookback: int = 252
