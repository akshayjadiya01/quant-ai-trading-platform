import { useEffect, useState, useRef } from "react";
import axios from "axios";
import CommandPalette from "../components/CommandPalette.jsx";
import MarketTape from "../components/MarketTape.jsx";
import OrderBook from "../components/OrderBook.jsx";
import "../styles/terminal.css";
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
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const commandRef = useRef(null);
  const [terminalMode, setTerminalMode] = useState(false);

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

  // Keyboard shortcut: Ctrl/Cmd+K opens command palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      } else if (e.key === "Escape") {
        setShowCommandPalette(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ----------- HELPER FUNCTIONS ----------- */

  const executeCommand = (cmd) => {
    if (!cmd) return;
    try {
      if (cmd.startsWith("go:")) {
        const s = cmd.split(":")[1].toUpperCase();
        setSymbol(s);
        // allow state to update then fetch
        setTimeout(() => { fetchHistory(); runPrediction(); }, 120);
      } else if (cmd === "toggleCharts") {
        setShowAdvancedCharts((v) => !v);
      } else if (cmd === "toggleTheme") {
        setTheme((t) => (t === "dark" ? "light" : "dark"));
      } else if (cmd === "refresh") {
        fetchHistory(); fetchIndicators(); runPrediction();
      }
    } finally {
      setShowCommandPalette(false);
    }
  };

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
    <div className={`page theme-${theme} ${terminalMode ? "terminal-mode" : ""}`} style={{
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
            <button
              className={`terminal-toggle ${terminalMode ? 'active' : ''}`}
              onClick={() => setTerminalMode(t => !t)}
              title="Toggle Terminal Mode"
            >
              🖥️
            </button>
          </div>
        </header>

        {/* SETTINGS PANEL */}
        {showCommandPalette && (
          <CommandPalette
            onClose={() => setShowCommandPalette(false)}
            onExecute={(cmd) => executeCommand(cmd)}
            initialQuery={commandQuery}
          />
        )}
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
        <div className={terminalMode ? "terminal-layout" : ""}>
          <div className="terminal-left">
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
          </div>

          {terminalMode && (
            <aside className="terminal-right">
              <OrderBook symbol={symbol} price={getCurrentPrice()} />
            </aside>
          )}
        </div>

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

      {/* MARKET TAPE */}
      {terminalMode && (
        <MarketTape symbol={symbol} price={getCurrentPrice()} />
      )}

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
            box-shadow: 0 0 0 12px rgba(37, 99, 235, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
          }
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-15px);
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

        @keyframes glow {
          0%, 100% { text-shadow: 0 0 8px rgba(34, 197, 94, 0.3); }
          50% { text-shadow: 0 0 16px rgba(34, 197, 94, 0.6); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        /* ========== BASE STYLES ========== */
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          transition: background-color 0.3s ease, color 0.3s ease;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .page {
          min-height: 100vh;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .page.theme-dark {
          background: linear-gradient(135deg, #0b0f14 0%, #0f1419 50%, #0a0e13 100%);
          color: #e5e7eb;
        }

        .page.theme-light {
          background: linear-gradient(135deg, #f8fafc 0%, #f0f4f8 100%);
          color: #1f2937;
        }

        .container {
          max-width: 1500px;
          margin: auto;
        }

        /* ========== HEADER ========== */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 24px;
          animation: slideInDown 0.6s ease;
          position: relative;
          z-index: 10;
        }

        .header-left h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.8px;
          background: linear-gradient(135deg, #22c55e, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-left .subtitle {
          margin: 8px 0 0 0;
          font-size: 14px;
          opacity: 0.7;
          font-weight: 500;
          letter-spacing: 0.3px;
        }

        /* ========== LIVE TICKER ========== */
        .live-ticker {
          flex: 1;
          min-width: 280px;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid;
          background: linear-gradient(135deg, rgba(2, 6, 23, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .theme-dark .live-ticker {
          border-color: rgba(255, 255, 255, 0.08);
        }

        .theme-light .live-ticker {
          background: rgba(255, 255, 255, 0.95);
          border-color: rgba(0, 0, 0, 0.08);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .ticker-content {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }

        .ticker-label {
          font-size: 18px;
          font-weight: 800;
          min-width: 60px;
          letter-spacing: 0.5px;
        }

        .ticker-price {
          font-size: 24px;
          font-weight: 800;
          color: #22c55e;
          animation: glow 3s ease-in-out infinite;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .ticker-change {
          font-size: 14px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.1);
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .ticker-change.positive {
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }

        .ticker-change.negative {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .ticker-updated {
          font-size: 11px;
          opacity: 0.6;
          margin-left: auto;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .header-right {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .auto-refresh-btn, .settings-btn, .theme-toggle, .terminal-toggle {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: transparent;
        }

        .auto-refresh-btn {
          animation: spin 2s linear infinite paused;
        }

        .auto-refresh-btn.active {
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .theme-dark .auto-refresh-btn,
        .theme-dark .settings-btn,
        .theme-dark .theme-toggle {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .theme-light .auto-refresh-btn,
        .theme-light .settings-btn,
        .theme-light .theme-toggle {
          background: rgba(255, 255, 255, 0.8);
          border-color: rgba(0, 0, 0, 0.1);
        }

        .auto-refresh-btn:hover, .settings-btn:hover, .theme-toggle:hover, .terminal-toggle:hover {
          transform: scale(1.1);
          border-color: #2563eb;
        }

        .settings-btn:hover {
          transform: rotate(90deg) scale(1.1);
        }

        .theme-dark .auto-refresh-btn:hover,
        .theme-dark .settings-btn:hover,
        .theme-dark .theme-toggle:hover {
          background: rgba(37, 99, 235, 0.15);
          box-shadow: 0 0 16px rgba(37, 99, 235, 0.2);
        }

        .theme-light .auto-refresh-btn:hover,
        .theme-light .settings-btn:hover,
        .theme-light .theme-toggle:hover {
          background: rgba(37, 99, 235, 0.1);
        }

        /* ========== SETTINGS PANEL ========== */
        .settings-panel {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        .settings-content {
          background: inherit;
          padding: 32px;
          border-radius: 16px;
          max-width: 420px;
          width: 90%;
          border: 1px solid;
          box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5);
          animation: slideInDown 0.4s ease;
        }

        .theme-dark .settings-content {
          background: linear-gradient(135deg, rgba(2, 6, 23, 0.98), rgba(15, 23, 42, 0.95));
          border-color: rgba(255, 255, 255, 0.1);
        }

        .theme-light .settings-content {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95));
          border-color: rgba(0, 0, 0, 0.1);
        }

        .settings-content h3 {
          margin: 0 0 24px 0;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: 0.3px;
        }

        .setting-group {
          margin-bottom: 24px;
        }

        .setting-group label {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          cursor: pointer;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .setting-group input[type="checkbox"] {
          cursor: pointer;
          width: 20px;
          height: 20px;
          accent-color: #2563eb;
        }

        .interval-controls {
          display: flex;
          gap: 14px;
          align-items: center;
          margin: 14px 0;
          background: rgba(0, 0, 0, 0.08);
          padding: 12px;
          border-radius: 8px;
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
          min-width: 38px;
          text-align: center;
          font-weight: 700;
          font-size: 14px;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .interval-btn {
          width: 36px;
          height: 36px;
          border: 1.5px solid;
          border-radius: 6px;
          background: transparent;
          cursor: pointer;
          font-weight: 800;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          font-size: 16px;
        }

        .theme-dark .interval-btn {
          border-color: rgba(255, 255, 255, 0.15);
        }

        .theme-light .interval-btn {
          border-color: rgba(0, 0, 0, 0.15);
        }

        .interval-btn:hover {
          background: rgba(37, 99, 235, 0.15);
          border-color: #2563eb;
          transform: scale(1.1);
        }

        .setting-group small {
          display: block;
          font-size: 12px;
          opacity: 0.65;
          margin-top: 8px;
          font-weight: 500;
        }

        /* ========== CONTROLS SECTION ========== */
        .controls-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-bottom: 28px;
          flex-wrap: wrap;
          animation: slideInDown 0.6s ease;
        }

        .controls {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          flex: 1;
          min-width: 300px;
        }

        .symbol-input {
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 14px;
          font-weight: 600;
          width: 100px;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .theme-dark .symbol-input {
          background: linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.8));
          border-color: rgba(255, 255, 255, 0.1);
          color: #f8fafc;
        }

        .theme-light .symbol-input {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
          border-color: rgba(0, 0, 0, 0.1);
          color: #1f2937;
        }

        .symbol-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
          transform: translateY(-2px);
        }

        .export-section {
          display: flex;
          gap: 12px;
        }

        /* ========== ERROR ========== */
        .error {
          background: linear-gradient(135deg, rgba(127, 29, 29, 0.8), rgba(159, 18, 57, 0.8));
          color: #fecaca;
          padding: 16px 20px;
          border-radius: 10px;
          margin-bottom: 24px;
          border-left: 5px solid #dc2626;
          animation: slideInDown 0.4s ease;
          backdrop-filter: blur(8px);
          box-shadow: 0 8px 24px rgba(220, 38, 38, 0.25);
          font-weight: 500;
        }

        /* ========== BUTTONS ========== */
        .btn {
          padding: 12px 20px;
          border-radius: 8px;
          border: none;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          letter-spacing: 0.3px;
          position: relative;
          overflow: hidden;
        }

        .btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.1);
          transition: left 0.3s ease;
        }

        .btn:hover::before {
          left: 100%;
        }

        .btn-primary {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.5);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: transparent;
          color: #2563eb;
          border: 1.5px solid #2563eb;
        }

        .theme-light .btn-secondary {
          color: #1d4ed8;
          border-color: #1d4ed8;
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(37, 99, 235, 0.1);
          transform: translateY(-2px);
        }

        .btn:disabled {
          opacity: 0.5;
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
          border-radius: 12px;
          padding: 24px;
          backdrop-filter: blur(12px);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        }

        .theme-dark .card {
          background: linear-gradient(135deg, rgba(2, 6, 23, 0.95), rgba(15, 23, 42, 0.9));
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .theme-light .card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .card:hover {
          transform: translateY(-6px);
        }

        .theme-dark .card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        }

        .theme-light .card:hover {
          border-color: rgba(0, 0, 0, 0.12);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.1);
        }

        .card h3 {
          margin: 0 0 18px 0;
          font-size: 17px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          letter-spacing: 0.2px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .card-header h3 {
          margin: 0;
        }

        .info-icon {
          font-size: 15px;
          opacity: 0.65;
          cursor: help;
          transition: all 0.3s ease;
        }

        .info-icon:hover {
          opacity: 1;
        }

        /* ========== METRICS ========== */
        .metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid;
          margin-bottom: 12px;
        }

        .theme-dark .metric {
          border-color: rgba(255, 255, 255, 0.05);
        }

        .theme-light .metric {
          border-color: rgba(0, 0, 0, 0.05);
        }

        .metric .label {
          font-size: 12px;
          opacity: 0.75;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          font-weight: 600;
        }

        .metric .value {
          font-size: 17px;
          font-weight: 700;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .highlight-metric {
          background: rgba(34, 197, 94, 0.05);
          padding: 12px;
          border-radius: 8px;
          border: 1px solid rgba(34, 197, 94, 0.15);
        }

        .highlight-metric .value {
          color: #10b981;
          font-size: 21px;
        }

        .confidence-note {
          font-size: 12px;
          opacity: 0.7;
          margin-top: 10px;
          display: block;
          font-weight: 500;
        }

        /* ========== SIGNALS ========== */
        .signal {
          font-size: 26px;
          font-weight: 800;
          padding: 16px;
          border-radius: 10px;
          text-align: center;
          margin: 12px 0;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          backdrop-filter: blur(8px);
        }

        .signal.buy {
          color: #10b981;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
          border: 1px solid rgba(16, 185, 129, 0.2);
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);
        }

        .signal.sell {
          color: #ef4444;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
          border: 1px solid rgba(239, 68, 68, 0.2);
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.2);
        }

        .signal.hold {
          color: #f59e0b;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05));
          border: 1px solid rgba(245, 158, 11, 0.2);
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.2);
        }

        /* ========== CHARTS ========== */
        .chart {
          margin-bottom: 28px;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
          margin-bottom: 20px;
        }

        .chart-header h3 {
          margin: 0;
          font-size: 17px;
        }

        .chart-container {
          margin: 0 -24px -24px -24px;
          padding: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .theme-dark .chart-container {
          background: rgba(0, 0, 0, 0.3);
        }

        .theme-light .chart-container {
          background: rgba(0, 0, 0, 0.02);
        }

        /* ========== TIME RANGE SELECTOR ========== */
        .time-range-selector {
          display: flex;
          gap: 8px;
          background: rgba(0, 0, 0, 0.15);
          padding: 6px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .time-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          background: transparent;
          color: inherit;
          opacity: 0.75;
          letter-spacing: 0.3px;
        }

        .time-btn:hover {
          opacity: 1;
          transform: translateY(-2px);
        }

        .time-btn.active {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          opacity: 1;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }

        /* ========== TOOLTIPS ========== */
        .tooltip-wrapper {
          position: relative;
          display: inline-block;
          cursor: help;
        }

        .tooltip-text {
          visibility: hidden;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98));
          color: #f0f9ff;
          text-align: center;
          padding: 10px 14px;
          border-radius: 8px;
          position: absolute;
          z-index: 1000;
          bottom: 130%;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          font-size: 12px;
          font-weight: 500;
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .tooltip-text::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: rgba(30, 41, 59, 0.98) transparent transparent transparent;
        }

        .tooltip-wrapper:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
          transform: translateX(-50%) translateY(-4px);
        }

        /* ========== TEXT UTILITIES ========== */
        .highlight {
          color: #10b981;
          font-size: 19px;
          font-weight: 700;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .muted {
          font-size: 12px;
          opacity: 0.7;
          font-weight: 500;
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
          margin: 32px 0;
          animation: slideInDown 0.6s ease;
        }

        .toggle-btn {
          padding: 14px 32px;
          border-radius: 10px;
          border: 2px solid;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          background: transparent;
          color: inherit;
          letter-spacing: 0.3px;
        }

        .theme-dark .toggle-btn {
          border-color: rgba(255, 255, 255, 0.15);
          color: #e5e7eb;
        }

        .theme-light .toggle-btn {
          border-color: rgba(0, 0, 0, 0.15);
          color: #1f2937;
        }

        .toggle-btn:hover {
          transform: translateY(-3px);
        }

        .theme-dark .toggle-btn:hover {
          border-color: #2563eb;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.25);
        }

        .theme-light .toggle-btn:hover {
          border-color: #2563eb;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.15);
        }

        .toggle-btn.active {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          border-color: #2563eb;
          box-shadow: 0 10px 28px rgba(37, 99, 235, 0.5);
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
