from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf

app = FastAPI(
    title="Quant AI API",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "API running"}

@app.get("/history/{symbol}")
def history(symbol: str, limit: int = 60):
    try:
        df = yf.download(symbol, period="6mo")

        if df is None or df.empty:
            return {
                "symbol": symbol,
                "history": []
            }

        df = df.tail(limit)

        history = []
        for index, row in df.iterrows():
            try:
                history.append({
                    "date": str(index.date()),
                    "price": float(row["Close"])
                })
            except:
                continue

        return {
            "symbol": symbol,
            "history": history
        }

    except Exception as e:
        print("HISTORY ERROR:", e)
        return {
            "symbol": symbol,
            "history": []
        }

@app.get("/indicators/{symbol}")
def indicators(symbol: str):
    return {"symbol": symbol, "indicators": []}

