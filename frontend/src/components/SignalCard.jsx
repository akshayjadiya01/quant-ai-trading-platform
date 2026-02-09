import { normalizeConfidence } from "../utils/confidence";

export default function SignalCard({ data }) {
  const { score, label } = normalizeConfidence(data.confidence);

  const color =
    label === "High"
      ? "text-green-400"
      : label === "Medium"
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">🤖 Trade Signal</h2>

      <p className="text-lg mb-2">
        Signal: <span className="font-semibold">{data.signal}</span>
      </p>

      <p className={`text-lg font-semibold ${color}`}>
        Confidence: {label} ({score.toFixed(2)})
      </p>

      <p className="text-sm text-gray-400 mt-2">
        {data.context}
      </p>
    </div>
  );
}
