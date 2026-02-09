import pandas as pd
import ta

def create_features(df: pd.DataFrame):
    df = df.copy()

    df["returns"] = df["Close"].pct_change()

    df["rsi"] = ta.momentum.RSIIndicator(df["Close"]).rsi()
    df["ema_20"] = ta.trend.EMAIndicator(df["Close"], window=20).ema_indicator()
    df["ema_50"] = ta.trend.EMAIndicator(df["Close"], window=50).ema_indicator()
    df["volatility"] = df["returns"].rolling(window=20).std()

    df = df.dropna()
    return df
