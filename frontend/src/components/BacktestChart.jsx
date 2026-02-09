import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis
} from "recharts";

export default function BacktestChart({ data }) {
  const chartData = data.map((v, i) => ({
    step: i,
    equity: v,
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mt-6">
      <h2 className="text-xl font-bold mb-4">📉 Backtest Equity Curve</h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="equity"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
