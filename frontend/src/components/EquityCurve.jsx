import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function EquityCurve({ trades }) {
  let equity = 100000;
  const data = trades.map((t, i) => {
    if (t.action === "BUY") {
      equity -= t.price * t.quantity;
    } else {
      equity += t.price * t.quantity;
    }
    return {
      step: i + 1,
      equity: Math.round(equity),
    };
  });

  return (
    <div style={{ height: 300 }}>
      <h3>📊 Equity Curve</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="step" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="equity" stroke="#4caf50" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
