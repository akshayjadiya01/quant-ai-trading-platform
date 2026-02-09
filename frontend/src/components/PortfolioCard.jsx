export default function PortfolioCard({ data }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mt-6">
      <h2 className="text-xl font-bold mb-4">
        📊 Optimal Portfolio Allocation
      </h2>

      <div className="space-y-2 text-gray-300">
        {Object.entries(data.weights).map(([sym, w]) => (
          <p key={sym}>
            <span className="text-gray-400">{sym}:</span>{" "}
            {(w * 100).toFixed(1)}%
          </p>
        ))}

        <hr className="border-gray-700 my-3" />

        <p>
          <span className="text-gray-400">
            Expected Return:
          </span>{" "}
          {(data.expected_return * 100).toFixed(2)}%
        </p>

        <p>
          <span className="text-gray-400">
            Expected Risk:
          </span>{" "}
          {(data.expected_risk * 100).toFixed(2)}%
        </p>
      </div>
    </div>
  );
}
