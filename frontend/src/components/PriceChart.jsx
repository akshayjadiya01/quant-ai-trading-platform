import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

export default function PriceChart({ data, predicted }) {
  const chartData = [...data];

  if (predicted) {
    chartData.push({
      date: "Prediction",
      price: predicted,
      predicted: predicted
    });
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mt-6">
      <h2 className="text-xl font-bold mb-4">📈 Price Trend</h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="date" hide />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip />

          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={2}
          />

          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#22c55e"
            strokeDasharray="5 5"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
