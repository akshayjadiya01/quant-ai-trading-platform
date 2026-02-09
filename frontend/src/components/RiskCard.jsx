export default function RiskCard({ data }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">⚠️ Risk Metrics</h2>

      <div className="space-y-2 text-gray-300">
        <p>
          <span className="text-gray-400">Volatility:</span>{" "}
          {(data.volatility * 100).toFixed(2)}%
        </p>

        <p>
          <span className="text-gray-400">Max Drawdown:</span>{" "}
          {(data.max_drawdown * 100).toFixed(2)}%
        </p>

        <p>
          <span className="text-gray-400">VaR (95%):</span>{" "}
          {(data.var_95 * 100).toFixed(2)}%
        </p>
      </div>
    </div>
  );
}
