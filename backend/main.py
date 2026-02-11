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

        if df.empty:
            raise HTTPException(status_code=404, detail="No data found")

        df = df.tail(limit)

        data = [
            {
                "date": str(index.date()),
                "price": float(row["Close"])
            }
            for index, row in df.iterrows()
        ]

        return {"symbol": symbol, "history": data}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
