# ============================================================================
# FastAPI Stock Prediction & Trading Platform - Production Ready
# ============================================================================

import os
import sys
from typing import List, Dict, Any, Optional
import logging

# External dependencies
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scipy.optimize import minimize

# Internal imports (ABSOLUTE, PACKAGE-SAFE)
from backend.schemas import (
    PredictionRequest,
    PredictionResponse,
    PortfolioRequest,
)
from backend.stock_data import fetch_stock_data
from backend.features import create_features
from backend.news_fetcher import fetch_company_news
from backend.sentiment import sentiment_score
from backend.model_registry import (
    load_or_create_lstm,
    get_model_path,
    get_scaler_path,
)
from backend.paper_trading import run_paper_trading

# ============================================================================
# Logging Configuration
# ============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================================================
# FastAPI Application Setup
# ============================================================================
app = FastAPI(
    title="AI Stock Prediction & Trading API",
    version="1.0.0",
    description="Advanced ML-powered stock prediction and portfolio optimization"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Pydantic Models
# ============================================================================
class PaperTradeRequest(BaseModel):
    symbol: str
    days: int = 5

# ============================================================================
# Startup / Shutdown Events
# ============================================================================
@app.on_event("startup")
async def startup_event():
    """Initialize app on startup"""
    logger.info("🚀 FastAPI application starting up...")
    logger.info("✅ All systems ready for deployment")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🛑 FastAPI application shutting down...")

# ============================================================================
# Router Registration
# ============================================================================
def register_trade_signal_router(app: FastAPI):
    """Register trade signal router if available"""
    try:
        from backend.trade_signal import router
        app.include_router(router)
        logger.info("✅ Trade signal router registered")
    except ImportError as e:
        logger.warning(f"⚠️ Trade signal router not available: {e}")

register_trade_signal_router(app)

# Project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RL_TRADERS = {}  # Cache RL agents for performance

# ============================================================================
# Health Check Endpoints
# ============================================================================
@app.get("/")
async def root():
    """Root health check endpoint"""
    return {
        "status": "running",
        "message": "AI Stock Prediction & Trading API is live",
        "version": "1.0.0",
        "endpoints": [
            "/predict",
            "/history/{symbol}",
            "/risk/{symbol}",
            "/backtest/{symbol}",
            "/portfolio/optimize",
            "/paper-trade",
            "/indicators/{symbol}",
            "/trade-signal",
            "/docs"
        ]
    }

@app.get("/health")
async def health_check():
    """Simple health check"""
    return {"status": "ok"}

# ============================================================================
# LSTM Price Prediction Endpoint
# ============================================================================
@app.post("/predict", response_model=PredictionResponse)
async def predict_stock(req: PredictionRequest):
    """
    Predict next stock price using LSTM + News Sentiment
    """
    try:
        logger.info(f"Predicting stock: {req.symbol}")
        
        # 1. Fetch stock data
        df = fetch_stock_data(req.symbol)
        if df is None or df.empty:
            raise ValueError(f"No data available for {req.symbol}")
        
        df_feat = create_features(df)
        
        feature_cols = ["rsi", "ema_20", "ema_50", "volatility"]
        X = df_feat[feature_cols].values
        y = df_feat["Close"].values

        lookback = 60
        if len(X) <= lookback:
            raise ValueError(f"Not enough historical data for {req.symbol}. Need at least {lookback} days.")

        # 2. Load or auto-train LSTM
        predictor, needs_training = load_or_create_lstm(req.symbol)

        if needs_training:
            logger.info(f"Training LSTM model for {req.symbol}...")
            predictor.train(X, y)
            predictor.save(
                model_path=get_model_path(req.symbol),
                scaler_path=get_scaler_path(req.symbol),
            )
            logger.info(f"✅ Model saved for {req.symbol}")

        # 3. Predict next price
        predicted_return = predictor.predict_return(X)
        predicted_price = float(y[-1] * (1 + predicted_return))

        # 4. News sentiment (safe fallback)
        sent_score = 0.0
        try:
            news = fetch_company_news(req.symbol)
            if news:
                sent_score = sentiment_score(news)
        except Exception as e:
            logger.warning(f"Could not fetch sentiment for {req.symbol}: {e}")
            sent_score = 0.0

        if sent_score > 0.2:
            sentiment_label = "bullish"
        elif sent_score < -0.2:
            sentiment_label = "bearish"
        else:
            sentiment_label = "neutral"

        return PredictionResponse(
            symbol=req.symbol,
            predicted_price=round(predicted_price, 2),
            last_close=round(float(y[-1]), 2),
            confidence_note=(
                f"LSTM + News Sentiment | "
                f"Sentiment: {sentiment_label} "
                f"(score={sent_score:.2f})"
            )
        )

    except Exception as e:
        logger.error(f"Prediction error for {req.symbol}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# Price History Endpoint
# ============================================================================
@app.get("/history/{symbol}")
async def get_price_history(symbol: str, limit: int = 60):
    """Get historical price data for a stock"""
    try:
        logger.info(f"Fetching history for {symbol}")
        df = fetch_stock_data(symbol, period="6mo")
        
        if df is None or df.empty:
            return {"symbol": symbol, "history": []}

        history = [
            {"date": str(row["Date"]), "price": float(row["Close"])}
            for _, row in df.tail(limit).iterrows()
        ]

        return {
            "symbol": symbol,
            "history": history
        }
    except Exception as e:
        logger.error(f"History fetch error for {symbol}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# Risk Metrics Endpoint
# ============================================================================
@app.get("/risk/{symbol}")
async def risk_metrics(symbol: str, window: int = 252):
    """
    Returns Volatility, Max Drawdown, and VaR (95%)
    """
    try:
        logger.info(f"Calculating risk metrics for {symbol}")
        df = fetch_stock_data(symbol)
        
        if df is None or df.empty:
            raise ValueError(f"No data available for {symbol}")

        prices = df["Close"].values
        returns = np.diff(prices) / prices[:-1]

        if len(returns) < 30:
            raise HTTPException(status_code=400, detail="Not enough data for risk metrics")

        # --- Volatility (annualized) ---
        volatility = float(np.std(returns) * np.sqrt(252))

        # --- Max Drawdown ---
        cumulative = np.cumprod(1 + returns)
        peak = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - peak) / peak
        max_drawdown = float(drawdown.min())

        # --- VaR (95%) ---
        var_95 = float(np.percentile(returns, 5))

        return {
            "symbol": symbol,
            "volatility": round(volatility, 4),
            "max_drawdown": round(max_drawdown, 4),
            "var_95": round(var_95, 4)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk metrics error for {symbol}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# Backtesting Endpoint
# ============================================================================
@app.get("/backtest/{symbol}")
async def backtest(symbol: str, capital: float = 100000):
    """
    Backtest trading strategy on historical data
    """
    try:
        logger.info(f"Running backtest for {symbol}")
        
        df = fetch_stock_data(symbol)
        if df is None or df.empty:
            raise ValueError(f"No data available for {symbol}")
        
        df_feat = create_features(df)

        prices = df_feat["Close"].values
        features = df_feat[["rsi", "ema_20", "ema_50", "volatility"]].values

        lookback = 60
        equity = capital
        equity_curve = []

        predictor, _ = load_or_create_lstm(symbol)

        for t in range(lookback, len(prices) - 1):
            X = features[:t]
            predicted_return = predictor.predict_return(X)

            position = np.sign(predicted_return)
            daily_ret = (prices[t+1] - prices[t]) / prices[t]

            equity *= (1 + position * daily_ret)
            equity_curve.append(equity)

        if len(equity_curve) > 1:
            returns = np.diff(equity_curve) / equity_curve[:-1]
            sharpe = (
                (np.mean(returns) / np.std(returns) * np.sqrt(252))
                if np.std(returns) > 0 else 0.0
            )
        else:
            sharpe = 0.0

        return {
            "symbol": symbol,
            "final_equity": round(float(equity), 2),
            "total_return": round((equity / capital - 1), 4),
            "sharpe": round(float(sharpe), 3),
            "equity_curve": equity_curve[-200:] if equity_curve else []
        }
    except Exception as e:
        logger.error(f"Backtest error for {symbol}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# Portfolio Optimization Endpoint
# ============================================================================
@app.post("/portfolio/optimize")
async def optimize_portfolio(req: PortfolioRequest):
    """
    Optimize portfolio weights using Markowitz mean-variance optimization
    """
    try:
        symbols = req.symbols
        lookback = req.lookback

        if len(symbols) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least two symbols required for portfolio optimization"
            )

        logger.info(f"Optimizing portfolio with symbols: {symbols}")

        returns_data = []

        for sym in symbols:
            df = fetch_stock_data(sym)
            if df is None or df.empty:
                raise ValueError(f"No data available for {sym}")
            
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portfolio optimization error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# Paper Trading Endpoint
# ============================================================================
@app.post("/paper-trade")
async def paper_trade(req: PaperTradeRequest):
    """
    Run paper trading simulation for a stock
    """
    try:
        logger.info(f"Running paper trading for {req.symbol} for {req.days} days")
        return run_paper_trading(req.symbol, req.days)
    except Exception as e:
        logger.error(f"Paper trading error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# Technical Indicators Endpoint
# ============================================================================
@app.get("/indicators/{symbol}")
async def get_technical_indicators(symbol: str, limit: int = 100):
    """
    Returns comprehensive technical indicators:
    - RSI (Relative Strength Index)
    - MACD (Moving Average Convergence Divergence)
    - Bollinger Bands
    - Volume Analysis
    """
    try:
        logger.info(f"Fetching technical indicators for {symbol}")
        
        df = fetch_stock_data(symbol, period="1y")
        if df is None or df.empty:
            raise ValueError(f"No data available for {symbol}")
        
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
            def safe_float(val):
                """Safely convert value to float, handling NaN"""
                try:
                    if isinstance(val, (int, float)):
                        if np.isnan(val):
                            return None
                        return float(val)
                    return float(val)
                except (ValueError, TypeError):
                    return None
            
            indicators.append({
                "date": str(row.get("Date", "")),
                "close": safe_float(row.get("Close")),
                "volume": safe_float(row.get("Volume", 0)),
                "rsi": safe_float(row.get("rsi")),
                "ema_20": safe_float(row.get("ema_20")),
                "ema_50": safe_float(row.get("ema_50")),
                "macd": safe_float(macd_line.iloc[idx]),
                "macd_signal": safe_float(signal_line.iloc[idx]),
                "macd_histogram": safe_float(histogram.iloc[idx]),
                "bb_upper": safe_float(bb_upper.iloc[idx]),
                "bb_middle": safe_float(sma_20.iloc[idx]),
                "bb_lower": safe_float(bb_lower.iloc[idx]),
            })
        
        return {
            "symbol": symbol,
            "indicators": indicators
        }
    except Exception as e:
        logger.error(f"Technical indicators error for {symbol}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# Main Entry Point
# ============================================================================
if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"🚀 Starting server on {host}:{port}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )

