import { useState } from "react";

export default function StockSearch({ onAnalyze }) {
  const [symbol, setSymbol] = useState("");

  return (
    <div className="flex gap-2">
      <input
        className="flex-1 border p-3 rounded"
        placeholder="Enter stock symbol (AAPL)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
      />
      <button
        onClick={() => onAnalyze(symbol)}
        className="bg-blue-600 text-white px-5 rounded"
      >
        Analyze
      </button>
    </div>
  );
}
