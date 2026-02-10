import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const API_BASE = "https://quant-ai-backend.onrender.com";

export default function Dashboard() {
  const [symbol, setSymbol] = useState("AAPL");

  const [history, setHistory] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [tradeSignal, setTradeSignal] = useState(null);
  const [equityCurve, setEquityCurve] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clickedButton, setClickedButton] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [timeRange, setTimeRange] = useState("1M");
  const [showTooltip, setShowTooltip] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [showSettings, setShowSettings] = useState(false);
  const [indicators, setIndicators] = useState([]);
  const [showAdvancedCharts, setShowAdvancedCharts] = useState(true);

  /* ---------------- API CALLS ---------------- */

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/history/${symbol}`);
      setHistory(res.data.history || []);
    } catch {
      setError("Failed to load price history");
    }
  };

  const fetchIndicators = async () => {
    try {
      const res = await axios.get(`${API_BASE}/indicators/${symbol}`);
      setIndicators(res.data.indicators || []);
    } catch {
      setError("Failed to load technical indicators");
    }
  };

  const runPrediction = async () => {
    setClickedButton("predict");
    setTimeout(() => setClickedButton(null), 600);
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_BASE}/predict`, {
        symbol,
        horizon: 1,
      });
      setPrediction(res.data);
      fetchHistory();
    } catch {
      setError("Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const runTradeSignal = async () => {
    setClickedButton("signal");
    setTimeout(() => setClickedButton(null), 600);
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_BASE}/trade-signal`, {
        symbol,
        horizon: 1,
      });
      setTradeSignal(res.data);
    } catch {
      setError("Trade signal failed");
    } finally {
      setLoading(false);
    }
  };

  const runPaperTrading = async () => {
    setClickedButton("trade");
    setTimeout(() => setClickedButton(null), 600);
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_BASE}/paper-trade`, {
        symbol,
        days: 10,
      });
      setEquityCurve(res.data.equity_curve || []);
    } catch {
      setError("Paper trading failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchIndicators();
  }, []);

  // Auto-refresh data at intervals
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchHistory();
      fetchIndicators();
      setLastUpdated(new Date());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Auto-refresh predictions
  useEffect(() => {
    if (!autoRefresh || !prediction) return;

    const interval = setInterval(() => {
      runPrediction();
    }, refreshInterval * 3 * 1000); // 3x slower than price updates

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, prediction]);

  /* ----------- HELPER FUNCTIONS ----------- */

  const getFilteredHistory = () => {
    if (!history.length) return [];
    
    const now = new Date();
    let days = 30;
    
    switch(timeRange) {
      case "1D": days = 1; break;
      case "1W": days = 7; break;
      case "1M": days = 30; break;
      case "3M": days = 90; break;
      case "1Y": days = 365; break;
      default: days = 30;
    }
    
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return history.filter(item => new Date(item.date) >= cutoffDate);
  };

  const calculatePriceChange = () => {
    if (history.length < 2) return 0;
    const latest = history[history.length - 1].price;
    const previous = history[history.length - 2].price;
    return ((latest - previous) / previous) * 100;
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return "Never";
    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const getCurrentPrice = () => {
    if (!history.length) return 0;
    return history[history.length - 1].price;
  };

  const exportToCSV = () => {
    let csvContent = "Symbol,Date,Price\n";
    history.forEach(item => {
      csvContent += `${symbol},${item.date},${item.price}\n`;
    });
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${symbol}_history.csv`;
    a.click();
  };

  const Tooltip = ({ text, children }) => (
    <div className="tooltip-wrapper">
      {children}
      <div className="tooltip-text">{text}</div>
    </div>
  );

  /* ---------------- UI ---------------- */

  return (
    <div className={`page theme-${theme}`} style={{
      backgroundColor: theme === "dark" ? "#0b0f14" : "#f5f5f5",
      color: theme === "dark" ? "#e5e7eb" : "#1f2937"
    }}>
      <div className="container">
        {/* HEADER */}
        <header className="header">
          <div className="header-left">
            <h1>⚡ Quant AI Trading</h1>
            <p className="subtitle">LSTM • Reinforcement Learning • Paper Trading</p>
          </div>

          <div className="live-ticker">
            <div className="ticker-content">
              <span className="ticker-label">{symbol}</span>
              <span className="ticker-price">${getCurrentPrice().toFixed(2)}</span>
              <span className={`ticker-change ${calculatePriceChange() >= 0 ? "positive" : "negative"}`}>
                {calculatePriceChange() >= 0 ? "↑" : "↓"} {Math.abs(calculatePriceChange()).toFixed(2)}%
              </span>
              <span className="ticker-updated">Updated: {formatLastUpdated()}</span>
            </div>
          </div>

          <div className="header-right">
            <button 
              className={`auto-refresh-btn ${autoRefresh ? "active" : ""}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={`${autoRefresh ? "Disable" : "Enable"} auto-refresh`}
            >
              {autoRefresh ? "🔄" : "⏸"}
            </button>
            <button 
              className="settings-btn" 
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              ⚙️
            </button>
            <button 
              className="theme-toggle" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {/* SETTINGS PANEL */}
        {showSettings && (
          <div className="settings-panel">
            <div className="settings-content">
              <h3>⚙️ Real-time Settings</h3>
              
              <div className="setting-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                  Enable Auto-Refresh
                </label>
              </div>

              {autoRefresh && (
                <div className="setting-group">
                  <label>Refresh Interval</label>
                  <div className="interval-controls">
                    <div className="slider-wrapper">
                      <input 
                        type="range" 
                        min="1" 
                        max="60" 
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                        className="refresh-slider"
                      />
                    </div>
                    <div className="interval-display">
                      <span>{refreshInterval}s</span>
                      <button 
                        onClick={() => setRefreshInterval(Math.max(1, refreshInterval - 1))}
                        className="interval-btn"
                      >
                        −
                      </button>
                      <button 
                        onClick={() => setRefreshInterval(Math.min(60, refreshInterval + 1))}
                        className="interval-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <small>Price updates every {refreshInterval} seconds</small>
                </div>
              )}

              <button 
                onClick={() => setShowSettings(false)}
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* CONTROLS */}
        <div className="controls-section">
          <div className="controls">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="symbol-input"
            />
            <button 
              onClick={runPrediction} 
              disabled={loading}
              className={`btn btn-primary ${clickedButton === "predict" ? "btn-active" : ""}`}
            >
              🔮 Predict
            </button>
            <button 
              onClick={runTradeSignal} 
              disabled={loading}
              className={`btn btn-primary ${clickedButton === "signal" ? "btn-active" : ""}`}
            >
              ⚡ Trade Signal
            </button>
            <button 
              onClick={runPaperTrading} 
              disabled={loading}
              className={`btn btn-primary ${clickedButton === "trade" ? "btn-active" : ""}`}
            >
              📊 Paper Trade
            </button>
          </div>

          {history.length > 0 && (
            <div className="export-section">
              <button onClick={exportToCSV} className="btn btn-secondary">
                📥 Export CSV
              </button>
            </div>
          )}
        </div>

        {error && <div className="error">❌ {error}</div>}

        {/* TOP CARDS */}
        <section className="grid">
          <div className="card">
            <div className="card-header">
              <h3>🔮 Prediction</h3>
              <Tooltip text="LSTM model prediction for next day price movement">
                <span className="info-icon">ⓘ</span>
              </Tooltip>
            </div>
            {prediction ? (
              <>
                <div className="metric">
                  <span className="label">Last Close</span>
                  <span className="value">${prediction.last_close.toFixed(2)}</span>
                </div>
                <div className="metric highlight-metric">
                  <span className="label">Predicted Price</span>
                  <span className="value highlight">${prediction.predicted_price.toFixed(2)}</span>
                </div>
                <span className="confidence-note">{prediction.confidence_note}</span>
              </>
            ) : (
              <span className="muted">Run prediction to get started</span>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3>⚡ Trade Signal</h3>
              <Tooltip text="Buy/Sell/Hold signal based on model analysis">
                <span className="info-icon">ⓘ</span>
              </Tooltip>
            </div>
            {tradeSignal ? (
              <>
                <div
                  className={`signal ${tradeSignal.signal.toLowerCase()}`}
                >
                  {tradeSignal.signal}
                </div>
                <div className="metric">
                  <span className="label">Confidence</span>
                  <span className="value">{(tradeSignal.confidence * 100).toFixed(1)}%</span>
                </div>
              </>
            ) : (
              <span className="muted">Generate signal for trading insights</span>
            )}
          </div>
        </section>

        {/* PRICE HISTORY */}
        <div className="card chart">
          <div className="chart-header">
            <h3>📈 Price History</h3>
            <div className="time-range-selector">
              {["1D", "1W", "1M", "3M", "1Y"].map(range => (
                <button
                  key={range}
                  className={`time-btn ${timeRange === range ? "active" : ""}`}
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          {getFilteredHistory().length ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={getFilteredHistory()}>
                  <CartesianGrid
                    stroke={theme === "dark" ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.3)"}
                    strokeDasharray="3 3"
                  />
                  <XAxis dataKey="date" hide />
                  <YAxis
                    domain={[
                      (min) => Math.floor(min * 0.995),
                      (max) => Math.ceil(max * 1.005),
                    ]}
                    stroke={theme === "dark" ? "#94a3b8" : "#6b7280"}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme === "dark" ? "#020617" : "#ffffff",
                      border: `1px solid ${theme === "dark" ? "#1e293b" : "#e5e7eb"}`,
                      borderRadius: "6px",
                      color: theme === "dark" ? "#e5e7eb" : "#1f2937"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <span className="muted">No data available</span>
          )}
        </div>

        {/* EQUITY CURVE */}
        <div className="card chart">
          <div className="chart-header">
            <h3>📊 Equity Curve (Paper Trading)</h3>
            <Tooltip text="Portfolio value progression during paper trading">
              <span className="info-icon">ⓘ</span>
            </Tooltip>
          </div>
          {equityCurve.length ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={equityCurve}>
                  <CartesianGrid
                    stroke={theme === "dark" ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.3)"}
                    strokeDasharray="3 3"
                  />
                  <XAxis dataKey="step" stroke={theme === "dark" ? "#94a3b8" : "#6b7280"} />
                  <YAxis
                    domain={[
                      (min) => Math.floor(min * 0.998),
                      (max) => Math.ceil(max * 1.002),
                    ]}
                    stroke={theme === "dark" ? "#94a3b8" : "#6b7280"}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme === "dark" ? "#020617" : "#ffffff",
                      border: `1px solid ${theme === "dark" ? "#1e293b" : "#e5e7eb"}`,
                      borderRadius: "6px",
                      color: theme === "dark" ? "#e5e7eb" : "#1f2937"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <span className="muted">Run paper trading to see equity progression</span>
          )}
        </div>

        {/* ADVANCED CHARTS TOGGLE */}
        {indicators.length > 0 && (
          <>
            <div className="advanced-toggle">
              <button
                className={`toggle-btn ${showAdvancedCharts ? "active" : ""}`}
                onClick={() => setShowAdvancedCharts(!showAdvancedCharts)}
              >
                {showAdvancedCharts ? "📉 Hide" : "📈 Show"} Technical Indicators
              </button>
            </div>

            {showAdvancedCharts && (
              <>
                {/* PRICE WITH BOLLINGER BANDS */}
                <div className="card chart">
                  <div className="chart-header">
                    <h3>📈 Price with Bollinger Bands</h3>
                    <Tooltip text="Price movement with 20-period SMA ± 2 standard deviations">
                      <span className="info-icon">ⓘ</span>
                    </Tooltip>
                  </div>
                  {indicators.length ? (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={indicators}>
                          <CartesianGrid
                            stroke={theme === "dark" ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.3)"}
                            strokeDasharray="3 3"
                          />
                          <XAxis dataKey="date" hide />
                          <YAxis
                            stroke={theme === "dark" ? "#94a3b8" : "#6b7280"}
                          />
                          <Tooltip
                            contentStyle={{
                              background: theme === "dark" ? "#020617" : "#ffffff",
                              border: `1px solid ${theme === "dark" ? "#1e293b" : "#e5e7eb"}`,
                              borderRadius: "6px",
                              color: theme === "dark" ? "#e5e7eb" : "#1f2937"
                            }}
                            formatter={(value) => value?.toFixed(2)}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="close"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={false}
                            name="Close Price"
                          />
                          <Line
                            type="monotone"
                            dataKey="bb_upper"
                            stroke="#f97316"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            name="Upper Band"
                          />
                          <Line
                            type="monotone"
                            dataKey="bb_middle"
                            stroke="#a78bfa"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            name="SMA 20"
                          />
                          <Line
                            type="monotone"
                            dataKey="bb_lower"
                            stroke="#f97316"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            name="Lower Band"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <span className="muted">No indicator data</span>
                  )}
                </div>

                {/* VOLUME CHART */}
                <div className="card chart">
                  <div className="chart-header">
                    <h3>📊 Trading Volume</h3>
                    <Tooltip text="Daily trading volume in number of shares">
                      <span className="info-icon">ⓘ</span>
                    </Tooltip>
                  </div>
                  {indicators.length ? (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={indicators}>
                          <CartesianGrid
                            stroke={theme === "dark" ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.3)"}
                            strokeDasharray="3 3"
                          />
                          <XAxis dataKey="date" hide />
                          <YAxis
                            stroke={theme === "dark" ? "#94a3b8" : "#6b7280"}
                          />
                          <Tooltip
                            contentStyle={{
                              background: theme === "dark" ? "#020617" : "#ffffff",
                              border: `1px solid ${theme === "dark" ? "#1e293b" : "#e5e7eb"}`,
                              borderRadius: "6px",
                              color: theme === "dark" ? "#e5e7eb" : "#1f2937"
                            }}
                            formatter={(value) => [
                              (value / 1000000).toFixed(2) + "M",
                              "Volume"
                            ]}
                          />
                          <Bar
                            dataKey="volume"
                            fill="#3b82f6"
                            opacity={0.7}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <span className="muted">No volume data</span>
                  )}
                </div>

                {/* RSI INDICATOR */}
                <div className="card chart">
                  <div className="chart-header">
                    <h3>🎯 RSI (Relative Strength Index)</h3>
                    <Tooltip text="RSI > 70 = Overbought, RSI < 30 = Oversold">
                      <span className="info-icon">ⓘ</span>
                    </Tooltip>
                  </div>
                  {indicators.length ? (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={indicators}>
                          <CartesianGrid
                            stroke={theme === "dark" ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.3)"}
                            strokeDasharray="3 3"
                          />
                          <XAxis dataKey="date" hide />
                          <YAxis
                            domain={[0, 100]}
                            stroke={theme === "dark" ? "#94a3b8" : "#6b7280"}
                          />
                          <Tooltip
                            contentStyle={{
                              background: theme === "dark" ? "#020617" : "#ffffff",
                              border: `1px solid ${theme === "dark" ? "#1e293b" : "#e5e7eb"}`,
                              borderRadius: "6px",
                              color: theme === "dark" ? "#e5e7eb" : "#1f2937"
                            }}
                            formatter={(value) => value?.toFixed(2)}
                          />
                          <Line
                            type="monotone"
                            dataKey="rsi"
                            stroke="#ec4899"
                            strokeWidth={2}
                            dot={false}
                            name="RSI"
                          />
                          {/* Overbought/Oversold lines */}
                          <Line
                            type="linear"
                            dataKey={() => 70}
                            stroke="#9ca3af"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            isAnimationActive={false}
                            name="Overbought"
                          />
                          <Line
                            type="linear"
                            dataKey={() => 30}
                            stroke="#9ca3af"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            isAnimationActive={false}
                            name="Oversold"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <span className="muted">No RSI data</span>
                  )}
                </div>

                {/* MACD INDICATOR */}
                <div className="card chart">
                  <div className="chart-header">
                    <h3>⚡ MACD (Moving Average Convergence Divergence)</h3>
                    <Tooltip text="Trend indicator showing momentum and direction change">
                      <span className="info-icon">ⓘ</span>
                    </Tooltip>
                  </div>
                  {indicators.length ? (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={indicators}>
                          <CartesianGrid
                            stroke={theme === "dark" ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.3)"}
                            strokeDasharray="3 3"
                          />
                          <XAxis dataKey="date" hide />
                          <YAxis
                            stroke={theme === "dark" ? "#94a3b8" : "#6b7280"}
                          />
                          <Tooltip
                            contentStyle={{
                              background: theme === "dark" ? "#020617" : "#ffffff",
                              border: `1px solid ${theme === "dark" ? "#1e293b" : "#e5e7eb"}`,
                              borderRadius: "6px",
                              color: theme === "dark" ? "#e5e7eb" : "#1f2937"
                            }}
                            formatter={(value) => value?.toFixed(4)}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="macd"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                            name="MACD Line"
                          />
                          <Line
                            type="monotone"
                            dataKey="macd_signal"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={false}
                            name="Signal Line"
                          />
                          <Line
                            type="monotone"
                            dataKey="macd_histogram"
                            stroke="#ef4444"
                            strokeWidth={1}
                            dot={false}
                            name="Histogram"
                            opacity={0.6}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <span className="muted">No MACD data</span>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* STYLES */}
      <style>{`
        /* ========== ANIMATIONS ========== */
        @keyframes buttonPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
          }
          50% {
            transform: scale(0.95);
            box-shadow: 0 0 0 8px rgba(37, 99, 235, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
          }
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* ========== BASE STYLES ========== */
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .page {
          min-height: 100vh;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .page.theme-dark {
          background: #0b0f14;
          color: #e5e7eb;
        }

        .page.theme-light {
          background: #f5f5f5;
          color: #1f2937;
        }

        .container {
          max-width: 1300px;
          margin: auto;
        }

        /* ========== HEADER ========== */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 20px;
          animation: slideInDown 0.5s ease;
        }

        .header-left h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .header-left .subtitle {
          margin: 6px 0 0 0;
          font-size: 14px;
          opacity: 0.7;
        }

        /* ========== LIVE TICKER ========== */
        .live-ticker {
          flex: 1;
          min-width: 280px;
          padding: 16px;
          border-radius: 10px;
          border: 2px solid;
        }

        .theme-dark .live-ticker {
          background: rgba(2, 6, 23, 0.8);
          border-color: #334155;
        }

        .theme-light .live-ticker {
          background: rgba(255, 255, 255, 0.9);
          border-color: #e5e7eb;
        }

        .ticker-content {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .ticker-label {
          font-size: 18px;
          font-weight: 700;
          min-width: 60px;
        }

        .ticker-price {
          font-size: 22px;
          font-weight: 700;
          color: #22c55e;
        }

        .ticker-change {
          font-size: 14px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.1);
        }

        .ticker-change.positive {
          color: #22c55e;
        }

        .ticker-change.negative {
          color: #ef4444;
        }

        .ticker-updated {
          font-size: 12px;
          opacity: 0.65;
          margin-left: auto;
        }

        .header-right {
          display: flex;
          gap: 8px;
        }

        .auto-refresh-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          animation: spin 2s linear infinite paused;
        }

        .auto-refresh-btn.active {
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .theme-dark .auto-refresh-btn {
          background: #1e293b;
          border-color: #334155;
        }

        .theme-light .auto-refresh-btn {
          background: #f0f0f0;
          border-color: #d1d5db;
        }

        .auto-refresh-btn:hover {
          transform: scale(1.05);
        }

        .settings-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: transparent;
        }

        .theme-dark .settings-btn {
          border-color: #334155;
        }

        .theme-light .settings-btn {
          border-color: #d1d5db;
        }

        .settings-btn:hover {
          transform: rotate(90deg);
        }

        .theme-toggle {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .theme-dark .theme-toggle {
          background: #1e293b;
          border-color: #334155;
          color: #fbbf24;
        }

        .theme-light .theme-toggle {
          background: #f0f0f0;
          border-color: #d1d5db;
          color: #1f2937;
        }

        .theme-toggle:hover {
          transform: scale(1.05);
        }

        /* ========== SETTINGS PANEL ========== */
        .settings-panel {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        .settings-content {
          background: inherit;
          padding: 24px;
          border-radius: 12px;
          max-width: 400px;
          width: 90%;
          border: 1px solid;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
        }

        .theme-dark .settings-content {
          background: #020617;
          border-color: #1e293b;
        }

        .theme-light .settings-content {
          background: #ffffff;
          border-color: #e5e7eb;
        }

        .settings-content h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .setting-group {
          margin-bottom: 20px;
        }

        .setting-group label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .setting-group input[type="checkbox"] {
          cursor: pointer;
          width: 18px;
          height: 18px;
        }

        .interval-controls {
          display: flex;
          gap: 12px;
          align-items: center;
          margin: 12px 0;
        }

        .slider-wrapper {
          flex: 1;
        }

        .refresh-slider {
          width: 100%;
          cursor: pointer;
        }

        .interval-display {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .interval-display span {
          min-width: 35px;
          text-align: center;
          font-weight: 600;
          font-size: 14px;
        }

        .interval-btn {
          width: 32px;
          height: 32px;
          border: 1px solid;
          border-radius: 4px;
          background: transparent;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .theme-dark .interval-btn {
          border-color: #334155;
        }

        .theme-light .interval-btn {
          border-color: #d1d5db;
        }

        .interval-btn:hover {
          background: rgba(37, 99, 235, 0.1);
          border-color: #2563eb;
        }

        .setting-group small {
          display: block;
          font-size: 12px;
          opacity: 0.6;
          margin-top: 6px;
        }

        /* ========== CONTROLS SECTION ========== */
        .controls-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          flex: 1;
          min-width: 300px;
        }

        .symbol-input {
          padding: 10px 14px;
          border-radius: 6px;
          border: 1px solid;
          font-size: 14px;
          font-weight: 500;
          width: 100px;
          transition: all 0.2s ease;
        }

        .theme-dark .symbol-input {
          background: #020617;
          border-color: #334155;
          color: #e5e7eb;
        }

        .theme-light .symbol-input {
          background: #ffffff;
          border-color: #d1d5db;
          color: #1f2937;
        }

        .symbol-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        /* ========== BUTTONS ========== */
        .btn {
          padding: 10px 16px;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .btn-primary {
          background: #2563eb;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-secondary {
          background: transparent;
          color: #2563eb;
          border: 1px solid #2563eb;
        }

        .theme-light .btn-secondary {
          color: #1d4ed8;
          border-color: #1d4ed8;
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(37, 99, 235, 0.1);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn.btn-active {
          animation: buttonPulse 0.6s ease-out;
        }

        .export-section {
          display: flex;
          gap: 10px;
        }

        /* ========== ERROR ========== */
        .error {
          background: #7f1d1d;
          color: #fecaca;
          padding: 14px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #dc2626;
          animation: slideInDown 0.3s ease;
        }

        /* ========== GRID ========== */
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }

        /* ========== CARDS ========== */
        .card {
          border-radius: 10px;
          padding: 20px;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .theme-dark .card {
          background: rgba(2, 6, 23, 0.8);
          border: 1px solid #1e293b;
        }

        .theme-light .card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #e5e7eb;
        }

        .card:hover {
          transform: translateY(-2px);
        }

        .theme-dark .card:hover {
          border-color: #334155;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .theme-light .card:hover {
          border-color: #d1d5db;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .card h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .card-header h3 {
          margin: 0;
        }

        .info-icon {
          font-size: 14px;
          opacity: 0.6;
          cursor: help;
        }

        /* ========== METRICS ========== */
        .metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid;
          margin-bottom: 10px;
        }

        .theme-dark .metric {
          border-color: #1e293b;
        }

        .theme-light .metric {
          border-color: #e5e7eb;
        }

        .metric .label {
          font-size: 13px;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric .value {
          font-size: 16px;
          font-weight: 600;
        }

        .highlight-metric .value {
          color: #22c55e;
          font-size: 20px;
        }

        .confidence-note {
          font-size: 12px;
          opacity: 0.65;
          margin-top: 8px;
          display: block;
        }

        /* ========== SIGNALS ========== */
        .signal {
          font-size: 24px;
          font-weight: 700;
          padding: 12px;
          border-radius: 6px;
          text-align: center;
          margin: 8px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .signal.buy {
          color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
        }

        .signal.sell {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .signal.hold {
          color: #9ca3af;
          background: rgba(156, 163, 175, 0.1);
        }

        /* ========== CHARTS ========== */
        .chart {
          margin-bottom: 24px;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 16px;
        }

        .chart-header h3 {
          margin: 0;
        }

        .chart-container {
          margin: 0 -20px -20px -20px;
          padding: 20px;
        }

        .theme-dark .chart-container {
          background: rgba(0, 0, 0, 0.2);
        }

        .theme-light .chart-container {
          background: rgba(0, 0, 0, 0.02);
        }

        /* ========== TIME RANGE SELECTOR ========== */
        .time-range-selector {
          display: flex;
          gap: 6px;
          background: rgba(0, 0, 0, 0.1);
          padding: 4px;
          border-radius: 6px;
        }

        .time-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          color: inherit;
          opacity: 0.7;
        }

        .time-btn:hover {
          opacity: 0.9;
        }

        .time-btn.active {
          background: #2563eb;
          color: white;
          opacity: 1;
        }

        /* ========== TOOLTIPS ========== */
        .tooltip-wrapper {
          position: relative;
          display: inline-block;
          cursor: help;
        }

        .tooltip-text {
          visibility: hidden;
          background: #1e293b;
          color: #e5e7eb;
          text-align: center;
          padding: 8px 12px;
          border-radius: 6px;
          position: absolute;
          z-index: 1000;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          font-size: 12px;
          opacity: 0;
          transition: opacity 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .tooltip-text::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: #1e293b transparent transparent transparent;
        }

        .tooltip-wrapper:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
        }

        /* ========== TEXT UTILITIES ========== */
        .highlight {
          color: #22c55e;
          font-size: 18px;
          font-weight: 600;
        }

        .muted {
          font-size: 13px;
          opacity: 0.65;
        }

        /* ========== RESPONSIVE DESIGN ========== */
        @media (max-width: 1024px) {
          .header {
            flex-direction: column;
            align-items: flex-start;
          }

          .live-ticker {
            width: 100%;
          }

          .controls-section {
            flex-direction: column;
            align-items: stretch;
          }

          .controls {
            flex: 1;
          }

          .chart-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 640px) {
          .page {
            padding: 16px;
          }

          .header-left h1 {
            font-size: 22px;
          }

          .live-ticker {
            width: 100%;
            padding: 12px;
          }

          .ticker-content {
            flex-direction: column;
            gap: 8px;
          }

          .ticker-updated {
            width: 100%;
            margin-left: 0;
            text-align: center;
          }

          .header-right {
            width: 100%;
            justify-content: space-evenly;
          }

          .controls {
            flex-direction: column;
            width: 100%;
          }

          .symbol-input,
          .btn {
            width: 100%;
            justify-content: center;
          }

          .time-range-selector {
            width: 100%;
            justify-content: space-around;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .card {
            padding: 16px;
          }

          .settings-content {
            width: 95%;
          }

          .tooltip-text {
            white-space: normal;
            max-width: 150px;
            bottom: 130%;
          }
        }

        /* ========== SCROLL BAR ========== */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .theme-dark ::-webkit-scrollbar-track {
          background: #0b0f14;
        }

        .theme-dark ::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 4px;
        }

        .theme-dark ::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }

        .theme-light ::-webkit-scrollbar-track {
          background: #f5f5f5;
        }

        .theme-light ::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }

        .theme-light ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        /* ========== ADVANCED CHARTS ========== */
        .advanced-toggle {
          display: flex;
          justify-content: center;
          margin: 24px 0;
          animation: slideInDown 0.5s ease;
        }

        .toggle-btn {
          padding: 12px 24px;
          border-radius: 8px;
          border: 2px solid;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: transparent;
          color: inherit;
        }

        .theme-dark .toggle-btn {
          border-color: #334155;
          color: #e5e7eb;
        }

        .theme-light .toggle-btn {
          border-color: #d1d5db;
          color: #1f2937;
        }

        .toggle-btn:hover {
          transform: translateY(-2px);
        }

        .theme-dark .toggle-btn:hover {
          border-color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .theme-light .toggle-btn:hover {
          border-color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        }

        .toggle-btn.active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }

        /* Indicator-specific styles */
        .recharts-wrapper {
          animation: fadeIn 0.3s ease;
        }

        .recharts-legend-wrapper {
          padding-top: 12px !important;
        }
      `}</style>
    </div>
  );
}
