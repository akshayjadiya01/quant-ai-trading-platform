export function normalizeConfidence(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return { score: 0, label: "Low" };
  }

  // clamp value safely between 0 and 1
  const score = Math.max(0, Math.min(1, Number(value)));

  let label = "Low";
  if (score >= 0.6) label = "High";
  else if (score >= 0.3) label = "Medium";

  return { score, label };
}
