from fastapi import FastAPI, HTTPException
import numpy as np
import os

# ---------- Internal imports (ABSOLUTE, PACKAGE-SAFE) ----------
from backend.schemas import PredictionRequest, PredictionResponse
from backend.stock_data import fetch_stock_data
from backend.features import create_features
from backend.model_registry import (
    load_or_create_lstm,
    get_model_path,
    get_scaler_path,
)
from backend.news_fetcher import fetch_company_news
from backend.sentiment import sentiment_score
from backend.rl_inference import RLTrader

# Trade signal router
from backend.trade_signal import router as trade_signal_router


# -------------------------------------------------
# FastAPI App
# -------------------------------------------------
app = FastAPI(
    title="AI Stock Prediction & Trading API",
    version="1.0.0"
)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register trade-signal router
app.include_router(trade_signal_router)

# Absolute project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Cache RL agents (performance)
RL_TRADERS = {}


# -------------------------------------------------
# Root / Health Check
# -------------------------------------------------
@app.get("/")
def root():
    return {
        "status": "running",
        "message": "AI Stock Prediction & Trading API is live",
        "endpoints": [
            "/predict",
            "/trade-signal",
            "/docs"
        ]
    }


# -------------------------------------------------
# LSTM Price Prediction Endpoint
# -------------------------------------------------
@app.post("/predict", response_model=PredictionResponse)
def predict_stock(req: PredictionRequest):
    try:
        # 1. Fetch stock data
        df = fetch_stock_data(req.symbol)
        df_feat = create_features(df)

        feature_cols = ["rsi", "ema_20", "ema_50", "volatility"]
        X = df_feat[feature_cols].values
        y = df_feat["Close"].values

        lookback = 60
        if len(X) <= lookback:
            raise ValueError("Not enough historical data")

        # 2. Load or auto-train LSTM
        predictor, needs_training = load_or_create_lstm(req.symbol)

        if needs_training:
            predictor.train(X, y)
            predictor.save(
                model_path=get_model_path(req.symbol),
                scaler_path=get_scaler_path(req.symbol),
            )

        # 3. Predict next price
        predicted_return = predictor.predict_return(X)
        predicted_price = y[-1] * (1 + predicted_return)


        # 4. News sentiment (safe fallback)
        try:
            news = fetch_company_news(req.symbol)
            sent_score = sentiment_score(news)
        except Exception:
            sent_score = 0.0

        if sent_score > 0.2:
            sentiment_label = "bullish"
        elif sent_score < -0.2:
            sentiment_label = "bearish"
        else:
            sentiment_label = "neutral"

        return PredictionResponse(
            symbol=req.symbol,
            predicted_price=round(float(predicted_price), 2),
            last_close=round(float(y[-1]), 2),
            confidence_note=(
                f"LSTM + News Sentiment | "
                f"Sentiment: {sentiment_label} "
                f"(score={sent_score:.2f})"
            )
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/history/{symbol}")
def get_price_history(symbol: str, limit: int = 60):
    df = fetch_stock_data(symbol, period="6mo")

    history = [
        {"date": str(row["Date"]), "price": float(row["Close"])}
        for _, row in df.tail(limit).iterrows()
    ]

    return {
        "symbol": symbol,
        "history": history
    }

import numpy as np

@app.get("/risk/{symbol}")
def risk_metrics(symbol: str, window: int = 252):
    """
    Returns Volatility, Max Drawdown, and VaR (95%)
    """
    df = fetch_stock_data(symbol)

    prices = df["Close"].values
    returns = np.diff(prices) / prices[:-1]

    if len(returns) < 30:
        raise HTTPException(status_code=400, detail="Not enough data for risk metrics")

    # --- Volatility (annualized) ---
    volatility = np.std(returns) * np.sqrt(252)

    # --- Max Drawdown ---
    cumulative = np.cumprod(1 + returns)
    peak = np.maximum.accumulate(cumulative)
    drawdown = (cumulative - peak) / peak
    max_drawdown = drawdown.min()

    # --- VaR (95%) ---
    var_95 = np.percentile(returns, 5)

    return {
        "symbol": symbol,
        "volatility": round(float(volatility), 4),
        "max_drawdown": round(float(max_drawdown), 4),
        "var_95": round(float(var_95), 4)
    }

@app.get("/backtest/{symbol}")
def backtest(symbol: str, capital: float = 100000):
    df = fetch_stock_data(symbol)
    df_feat = create_features(df)

    prices = df_feat["Close"].values
    features = df_feat[["rsi","ema_20","ema_50","volatility"]].values

    lookback = 60
    equity = capital
    equity_curve = []

    predictor, _ = load_or_create_lstm(symbol)

    for t in range(lookback, len(prices) - 1):
        X = features[:t]
        predicted_return = predictor.predict_return(X)

        position = np.sign(predicted_return)  # simple policy
        daily_ret = (prices[t+1] - prices[t]) / prices[t]

        equity *= (1 + position * daily_ret)
        equity_curve.append(equity)

    returns = np.diff(equity_curve) / equity_curve[:-1]

    sharpe = (
        np.mean(returns) / np.std(returns)
        if np.std(returns) > 0 else 0
    ) * np.sqrt(252)

    return {
        "symbol": symbol,
        "final_equity": round(float(equity), 2),
        "total_return": round((equity / capital - 1), 4),
        "sharpe": round(float(sharpe), 3),
        "equity_curve": equity_curve[-200:]  # last 200 points
    }

from backend.schemas import PortfolioRequest
from scipy.optimize import minimize
import numpy as np
from backend.schemas import PortfolioRequest


@app.post("/portfolio/optimize")
def optimize_portfolio(req: PortfolioRequest):
    symbols = req.symbols
    lookback = req.lookback

    if len(symbols) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least two symbols required"
        )

    returns_data = []

    for sym in symbols:
        df = fetch_stock_data(sym)
        prices = df["Close"].values[-lookback:]
        returns = np.diff(prices) / prices[:-1]
        returns_data.append(returns)

    returns_matrix = np.column_stack(returns_data)
    mean_returns = returns_matrix.mean(axis=0)
    cov_matrix = np.cov(returns_matrix.T)

    n = len(symbols)

    def portfolio_volatility(weights):
        return np.sqrt(weights.T @ cov_matrix @ weights)

    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    bounds = [(0, 1)] * n
    init_weights = np.ones(n) / n

    result = minimize(
        portfolio_volatility,
        init_weights,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
    )

    weights = result.x

    expected_return = float(mean_returns @ weights * 252)
    expected_risk = float(portfolio_volatility(weights) * np.sqrt(252))

    return {
        "symbols": symbols,
        "weights": {
            sym: round(float(w), 3)
            for sym, w in zip(symbols, weights)
        },
        "expected_return": round(expected_return, 4),
        "expected_risk": round(expected_risk, 4),
    }

from backend.paper_trading import run_paper_trading
from pydantic import BaseModel
class PaperTradeRequest(BaseModel):
    symbol: str
    days: int = 5


@app.post("/paper-trade")
def paper_trade(req: PaperTradeRequest):
    try:
        return run_paper_trading(req.symbol, req.days)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------
# Technical Indicators Endpoint
# -------------------------------------------------
@app.get("/indicators/{symbol}")
def get_technical_indicators(symbol: str, limit: int = 100):
    """
    Returns detailed technical indicators:
    - RSI (Relative Strength Index)
    - MACD (Moving Average Convergence Divergence)
    - Bollinger Bands
    - Volume
    """
    try:
        df = fetch_stock_data(symbol, period="1y")
        df_feat = create_features(df)
        
        # Limit to latest data
        df_feat = df_feat.tail(limit)
        
        # Calculate MACD manually
        ema_12 = df_feat["Close"].ewm(span=12, adjust=False).mean()
        ema_26 = df_feat["Close"].ewm(span=26, adjust=False).mean()
        macd_line = ema_12 - ema_26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        histogram = macd_line - signal_line
        
        # Calculate Bollinger Bands
        sma_20 = df_feat["Close"].rolling(window=20).mean()
        std_20 = df_feat["Close"].rolling(window=20).std()
        bb_upper = sma_20 + (std_20 * 2)
        bb_lower = sma_20 - (std_20 * 2)
        
        indicators = []
        for idx, (_, row) in enumerate(df_feat.iterrows()):
            indicators.append({
                "date": str(row["Date"]),
                "close": float(row["Close"]),
                "volume": float(row["Volume"]) if "Volume" in row else 0,
                "rsi": float(row["rsi"]) if not np.isnan(row["rsi"]) else None,
                "ema_20": float(row["ema_20"]) if not np.isnan(row["ema_20"]) else None,
                "ema_50": float(row["ema_50"]) if not np.isnan(row["ema_50"]) else None,
                "macd": float(macd_line.iloc[idx]) if not np.isnan(macd_line.iloc[idx]) else None,
                "macd_signal": float(signal_line.iloc[idx]) if not np.isnan(signal_line.iloc[idx]) else None,
                "macd_histogram": float(histogram.iloc[idx]) if not np.isnan(histogram.iloc[idx]) else None,
                "bb_upper": float(bb_upper.iloc[idx]) if not np.isnan(bb_upper.iloc[idx]) else None,
                "bb_middle": float(sma_20.iloc[idx]) if not np.isnan(sma_20.iloc[idx]) else None,
                "bb_lower": float(bb_lower.iloc[idx]) if not np.isnan(bb_lower.iloc[idx]) else None,
            })
        
        return {
            "symbol": symbol,
            "indicators": indicators
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))