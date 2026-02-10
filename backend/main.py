from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import os

# -------------------------------
# FastAPI App
# -------------------------------
app = FastAPI(
    title="AI Stock Prediction & Trading API",
    version="1.0.0"
)

@app.on_event("startup")
def startup_event():
    print("🚀 FASTAPI STARTED SUCCESSFULLY")

# -------------------------------
# CORS (open for deployment)
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # change later to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# SAFE ROUTER REGISTRATION
# -------------------------------
def register_trade_signal_router(app: FastAPI):
    from backend.trade_signal import router
    app.include_router(router)

register_trade_signal_router(app)

# -------------------------------
# Core imports (lightweight)
# -------------------------------
from backend.schemas import PredictionRequest, PredictionResponse, PortfolioRequest
from backend.stock_data import fetch_stock_data
from backend.features import create_features
from backend.news_fetcher import fetch_company_news
from backend.sentiment import sentiment_score
from backend.paper_trading import run_paper_trading

# -------------------------------
# Root health check (PORT BIND)
# -------------------------------
@app.get("/")
def root():
    return {
        "status": "running",
        "message": "AI Stock Prediction & Trading API is live",
        "endpoints": [
            "/predict",
            "/trade-signal",
            "/history/{symbol}",
            "/risk/{symbol}",
            "/backtest/{symbol}",
            "/paper-trade",
            "/portfolio/optimize",
            "/indicators/{symbol}",
            "/docs"
        ]
    }

# -------------------------------
# Prediction
# -------------------------------
@app.post("/predict", response_model=PredictionResponse)
def predict_stock(req: PredictionRequest):
    try:
        from backend.model_registry import (
            load_or_create_lstm,
            get_model_path,
            get_scaler_path,
        )

        df = fetch_stock_data(req.symbol)
        df_feat = create_features(df)

        X = df_feat[["rsi", "ema_20", "ema_50", "volatility"]].values
        y = df_feat["Close"].values

        if len(X) <= 60:
            raise ValueError("Not enough historical data")

        predictor, needs_training = load_or_create_lstm(req.symbol)

        if needs_training:
            predictor.train(X, y)
            predictor.save(
                model_path=get_model_path(req.symbol),
                scaler_path=get_scaler_path(req.symbol),
            )

        predicted_return = predictor.predict_return(X)
        predicted_price = y[-1] * (1 + predicted_return)

        try:
            news = fetch_company_news(req.symbol)
            sent_score = sentiment_score(news)
        except Exception:
            sent_score = 0.0

        sentiment_label = (
            "bullish" if sent_score > 0.2 else
            "bearish" if sent_score < -0.2 else
            "neutral"
        )

        return PredictionResponse(
            symbol=req.symbol,
            predicted_price=round(float(predicted_price), 2),
            last_close=round(float(y[-1]), 2),
            confidence_note=f"LSTM + News | {sentiment_label} ({sent_score:.2f})"
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------
# History
# -------------------------------
@app.get("/history/{symbol}")
def get_price_history(symbol: str, limit: int = 60):
    df = fetch_stock_data(symbol, period="6mo")
    history = [
        {"date": str(row["Date"]), "price": float(row["Close"])}
        for _, row in df.tail(limit).iterrows()
    ]
    return {"symbol": symbol, "history": history}

# -------------------------------
# Risk metrics
# -------------------------------
@app.get("/risk/{symbol}")
def risk_metrics(symbol: str):
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

# -------------------------------
# Backtest
# -------------------------------
@app.get("/backtest/{symbol}")
def backtest(symbol: str, capital: float = 100000):
    from backend.model_registry import load_or_create_lstm

    df = fetch_stock_data(symbol)
    df_feat = create_features(df)

    prices = df_feat["Close"].values
    features = df_feat[["rsi", "ema_20", "ema_50", "volatility"]].values

    predictor, _ = load_or_create_lstm(symbol)

    equity = capital
    equity_curve = []

    for t in range(60, len(prices) - 1):
        predicted_return = predictor.predict_return(features[:t])
        position = np.sign(predicted_return)
        daily_ret = (prices[t + 1] - prices[t]) / prices[t]
        equity *= (1 + position * daily_ret)
        equity_curve.append(equity)

    return {
        "symbol": symbol,
        "final_equity": round(float(equity), 2),
        "equity_curve": equity_curve[-200:],
    }

# -------------------------------
# Portfolio Optimization
# -------------------------------
from scipy.optimize import minimize

@app.post("/portfolio/optimize")
def optimize_portfolio(req: PortfolioRequest):
    returns_data = []
    for sym in req.symbols:
        df = fetch_stock_data(sym)
        prices = df["Close"].values[-req.lookback:]
        returns_data.append(np.diff(prices) / prices[:-1])

    returns_matrix = np.column_stack(returns_data)
    cov = np.cov(returns_matrix.T)
    mean_returns = returns_matrix.mean(axis=0)

    def vol(w): return np.sqrt(w.T @ cov @ w)

    n = len(req.symbols)
    result = minimize(
        vol,
        np.ones(n) / n,
        bounds=[(0, 1)] * n,
        constraints={"type": "eq", "fun": lambda w: w.sum() - 1},
    )

    return {
        "symbols": req.symbols,
        "weights": dict(zip(req.symbols, result.x.round(3))),
    }

# -------------------------------
# Paper Trading
# -------------------------------
from pydantic import BaseModel

class PaperTradeRequest(BaseModel):
    symbol: str
    days: int = 5

@app.post("/paper-trade")
def paper_trade(req: PaperTradeRequest):
    return run_paper_trading(req.symbol, req.days)

# -------------------------------
# Technical Indicators
# -------------------------------
@app.get("/indicators/{symbol}")
def indicators(symbol: str, limit: int = 100):
    df = fetch_stock_data(symbol, period="1y")
    df_feat = create_features(df).tail(limit)

    return {
        "symbol": symbol,
        "indicators": df_feat.fillna(0).to_dict(orient="records")
    }

if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 10000))

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
