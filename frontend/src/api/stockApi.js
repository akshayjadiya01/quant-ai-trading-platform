import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export const fetchHistory = (symbol) =>
  api.get(`/history/${symbol}`);

export const predictStock = (payload) =>
  api.post("/predict", payload);

export const tradeSignal = (payload) =>
  api.post("/trade-signal", payload);

export default api;

export const fetchRiskMetrics = (symbol) =>
  api.get(`/risk/${symbol}`);

export const fetchBacktest = (symbol) =>
  api.get(`/backtest/${symbol}`);

export const optimizePortfolio = (symbols) =>
  api.post("/portfolio/optimize", { symbols });

export const paperTrade = async (symbol) => {
  const res = await axios.post("/paper-trade", { symbol });
  return res.data;
};
