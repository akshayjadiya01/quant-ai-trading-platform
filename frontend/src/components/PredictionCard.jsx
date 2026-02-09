export default function PredictionCard({ data }) {
  return (
    <div className="bg-gray-900 p-5 rounded-xl border shadow-md">
      <h3 className="text-lg font-semibold mb-2">📈 LSTM Prediction</h3>

      <div className="space-y-2 text-gray-300">
        <p>
          <span className="text-gray-400">Last Close:</span>{" "}
          <span className="font-semibold">₹{data.last_close}</span>
        </p>

        <p>
          <span className="text-gray-400">Predicted Price:</span>{" "}
          <span className="font-semibold text-blue-400">
            ₹{data.predicted_price}
          </span>
        </p>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        {data.confidence_note}
      </p>
    </div>
  );
}
