import { useState } from "react";
import { fetchPrediction, fetchTradeSignal } from "../api/stockApi";

export const useStockAnalysis = () => {
  const [prediction, setPrediction] = useState(null);
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeStock = async (symbol) => {
    setLoading(true);
    setError(null);

    try {
      const [predRes, signalRes] = await Promise.all([
        fetchPrediction(symbol),
        fetchTradeSignal(symbol),
      ]);

      setPrediction(predRes.data);
      setSignal(signalRes.data);
    } catch (err) {
      setError("Backend error or model not ready");
    } finally {
      setLoading(false);
    }
  };

  return {
    prediction,
    signal,
    loading,
    error,
    analyzeStock,
  };
};
