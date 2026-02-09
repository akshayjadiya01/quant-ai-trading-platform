import { useState } from "react";
import axios from "axios";
import TradeTable from "./TradeTable";
import EquityCurve from "./EquityCurve";

export default function PaperTrading() {
  const [symbol, setSymbol] = useState("AAPL");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runPaperTrade = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/paper-trade",
        { symbol }
      );
      setResult(res.data);
    } catch (err) {
      alert("Paper trading failed");
    }
    setLoading(false);
  };

  return (
    <div className="card">
      <h2>📄 Paper Trading</h2>

      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="Stock symbol"
      />

      <button onClick={runPaperTrade}>
        {loading ? "Running..." : "Run Simulation"}
      </button>

      {result && (
        <>
          <p>💰 Final Value: ₹{result.final_value}</p>
          <p>📈 Return: {result.return_pct}%</p>

          <EquityCurve trades={result.trades} />
          <TradeTable trades={result.trades} />
        </>
      )}
    </div>
  );
}
