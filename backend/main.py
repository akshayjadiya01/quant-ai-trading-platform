from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import numpy as np

# -------------------------------------------------
# FastAPI App (LIGHTWEIGHT)
# -------------------------------------------------
app = FastAPI(
    title="AI Stock Prediction & Trading API",
    version="1.0.0"
)

# -------------------------------------------------
# CORS (Frontend Access)
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change later if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# HEALTH CHECK (IMPORTANT FOR RENDER)
# -------------------------------------------------
@app.get("/")
def root():
    return {
        "status": "running",
        "message": "FastAPI is live and listening"
    }

@app.get("/health")
def health():
    return {"alive": True}

# -------------------------------------------------
# PRICE HISTORY
# -------------------------------------------------
@app.get("/history/{symbol}")
def get_price_history(symbol: str, limit: int = 60):
    from backend.stock_data import fetch_stock_data

    df = fetch_stock_data(symbol, period="6mo")
    df = df.tail(limit)

    history = [
        {"date": str(row["Date"]), "price": float(row["Close"])}
        for _, row in df.iterrows()
    ]

    return {"symbol": symbol, "history": history}

# -------------------------------------------------
# PREDICTION
# -------------------------------------------------
class PredictionRequest(BaseModel):
    symbol: str
    horizon: int = 1

@app.post("/predict")
def predict_stock(req: PredictionRequest):
    try:
        from backend.stock_data import fetch_stock_data
        from backend.features import create_features
        from backend.model_registry import (
            load_or_create_lstm,
            get_model_path,
            get_scaler_path,
        )
        from backend.news_fetcher import fetch_company_news
        from backend.sentiment import sentiment_score

        df = fetch_stock_data(req.symbol)
        df_feat = create_features(df)

        feature_cols = ["rsi", "ema_20", "ema_50", "volatility"]
        X = df_feat[feature_cols].values
        y = df_feat["Close"].values

        if len(X) <= 60:
            raise ValueError("Not enough historical data")

        model, needs_training = load_or_create_lstm(req.symbol)

        if needs_training:
            model.train(X, y)
            model.save(
                model_path=get_model_path(req.symbol),
                scaler_path=get_scaler_path(req.symbol),
            )

        predicted_return = model.predict_return(X)
        predicted_price = y[-1] * (1 + predicted_return)

        try:
            news = fetch_company_news(req.symbol)
            sent = sentiment_score(news)
        except Exception:
            sent = 0.0

        sentiment_label = (
            "bullish" if sent > 0.2 else "bearish" if sent < -0.2 else "neutral"
        )

        return {
            "symbol": req.symbol,
            "last_close": round(float(y[-1]), 2),
            "predicted_price": round(float(predicted_price), 2),
            "confidence_note": f"LSTM + News | {sentiment_label} ({sent:.2f})",
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------
# TRADE SIGNAL (RL)
# -------------------------------------------------
@app.post("/trade-signal")
def trade_signal(req: PredictionRequest):
    try:
        from backend.trade_signal import get_trade_signal
        return get_trade_signal(req.symbol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------
# PAPER TRADING
# -------------------------------------------------
class PaperTradeRequest(BaseModel):
    symbol: str
    days: int = 5

@app.post("/paper-trade")
def paper_trade(req: PaperTradeRequest):
    try:
        from backend.paper_trading import run_paper_trading
        return run_paper_trading(req.symbol, req.days)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------
# RISK METRICS
# -------------------------------------------------
@app.get("/risk/{symbol}")
def risk_metrics(symbol: str):
    from backend.stock_data import fetch_stock_data

    df = fetch_stock_data(symbol)
    prices = df["Close"].values
    returns = np.diff(prices) / prices[:-1]

    if len(returns) < 30:
        raise HTTPException(status_code=400, detail="Not enough data")

    volatility = np.std(returns) * np.sqrt(252)

    cumulative = np.cumprod(1 + returns)
    peak = np.maximum.accumulate(cumulative)
    drawdown = (cumulative - peak) / peak

    return {
        "symbol": symbol,
        "volatility": round(float(volatility), 4),
        "max_drawdown": round(float(drawdown.min()), 4),
        "var_95": round(float(np.percentile(returns, 5)), 4),
    }

# -------------------------------------------------
# BACKTEST
# -------------------------------------------------
@app.get("/backtest/{symbol}")
def backtest(symbol: str, capital: float = 100000):
    from backend.stock_data import fetch_stock_data
    from backend.features import create_features
    from backend.model_registry import load_or_create_lstm

    df = fetch_stock_data(symbol)
    df_feat = create_features(df)

    prices = df_feat["Close"].values
    features = df_feat[["rsi", "ema_20", "ema_50", "volatility"]].values

    equity = capital
    equity_curve = []

    model, _ = load_or_create_lstm(symbol)

    for t in range(60, len(prices) - 1):
        pred = model.predict_return(features[:t])
        position = np.sign(pred)
        ret = (prices[t + 1] - prices[t]) / prices[t]
        equity *= (1 + position * ret)
        equity_curve.append(round(float(equity), 2))

    return {
        "symbol": symbol,
        "final_equity": round(float(equity), 2),
        "equity_curve": equity_curve[-200:],
    }
