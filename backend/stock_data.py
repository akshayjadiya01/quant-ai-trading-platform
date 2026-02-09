import yfinance as yf
import pandas as pd

def fetch_stock_data(symbol: str, period="2y", interval="1d"):
    """
    Fetch live historical stock data.
    Supports US and Indian stocks.
    Example:
      AAPL
      RELIANCE.NS
    """
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, interval=interval)

    if df.empty:
        raise ValueError("Invalid stock symbol or no data found")

    df = df.reset_index()
    return df
