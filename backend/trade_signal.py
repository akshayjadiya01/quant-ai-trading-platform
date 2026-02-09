# backend/trade_signal.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.rl_inference import RLTrader

router = APIRouter(prefix="/trade-signal", tags=["Trade Signal"])

# ---------- Request schema ----------
class TradeSignalRequest(BaseModel):
    symbol: str
    horizon: int = 1


# ---------- Core reusable function ----------
def get_trade_signal(symbol: str, horizon: int = 1):
    try:
        trader = RLTrader(symbol)
        signal, confidence = trader.predict_signal()

        return {
            "symbol": symbol,
            "signal": signal,
            "confidence": round(float(confidence), 3),
            "context": "TensorFlow RL (inference-only)"
        }

    except Exception as e:
        raise RuntimeError(str(e))


# ---------- FastAPI route ----------
@router.post("")
def trade_signal(req: TradeSignalRequest):
    try:
        return get_trade_signal(req.symbol, req.horizon)

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Trade signal failed: {str(e)}"
        )
