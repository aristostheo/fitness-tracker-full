// services/profile/longTermProgressSignal.ts
// Drop-in ✅
// Trend signal + confidence derived from slope + noise.
// Uses your existing helpers from services/profile/longTermProgress.

import {
  emaSmooth,
  type RangeKey,
  filterByRange,
  formatDelta,
  formatValue,
  type SeriesPoint,
} from "@/services/profile/longTermProgress";

export type TrendSignal = {
  latest: number | null;
  first: number | null;
  delta: number | null;

  // slope in "units per week" (lb/week or kg/week depending on series values)
  slopePerWeek: number | null;

  // noise estimate (robust) in series units
  noise: number | null;

  // calm, emotionally-safe label
  label:
    | "Not enough data"
    | "Steady"
    | "Leaning lower"
    | "Leaning higher"
    | "In flux"
    | "Unclear";

  // 0..1 confidence score
  confidence: number | null;

  // optional UI helper
  confidenceLabel: "High" | "Medium" | "Low" | "—";
};

export type TrendStatsOptions = {
  range: RangeKey;
  minPoints?: number; // default 4
};

/**
 * Compute signal from a time series where x = time (days), y = value (lb/kg/etc).
 * - slope via linear regression
 * - noise via median absolute deviation (robust) on residuals
 * - confidence from n + noise + slope-to-noise ratio
 */
export function computeTrendSignal(
  rawSeries: SeriesPoint[],
  opts: TrendStatsOptions
): TrendSignal {
  const minPoints = opts.minPoints ?? 4;

  const series = normalizeSeries(filterByRange(rawSeries, opts.range));
  if (!series.length) {
    return {
      latest: null,
      first: null,
      delta: null,
      slopePerWeek: null,
      noise: null,
      label: "Not enough data",
      confidence: null,
      confidenceLabel: "—",
    };
  }

  const latest = series[series.length - 1]?.value ?? null;
  const first = series[0]?.value ?? null;
  const delta = latest != null && first != null ? Number(latest - first) : null;

  if (series.length < minPoints) {
    return {
      latest,
      first,
      delta,
      slopePerWeek: null,
      noise: null,
      label: "Not enough data",
      confidence: scoreConfidence(series.length, null, null),
      confidenceLabel: labelConfidence(
        scoreConfidence(series.length, null, null)
      ),
    };
  }

  // Smooth to reduce daily swing (still keep underlying direction)
  const y = series.map((p) => p.value);
  const ySmooth = emaSmooth(y, 0.28);

  // Convert timestamps to "days since start" to keep numbers stable
  const t0 = series[0].date;
  const xDays = series.map((p) => (p.date - t0) / (24 * 60 * 60 * 1000));

  // Linear regression on smoothed values
  const { slopePerDay, intercept } = linearRegression(xDays, ySmooth);
  const slopePerWeek = slopePerDay * 7;

  // Residuals on smoothed fit => robust noise estimate
  const residuals = ySmooth.map(
    (yi, i) => yi - (intercept + slopePerDay * xDays[i])
  );
  const noise = robustMad(residuals); // in series units

  // Decide label: slope compared to noise + small deadband
  const label = computeCalmLabel(slopePerWeek, noise);

  // Confidence: more points + less noise + clearer slope
  const confidence = scoreConfidence(series.length, slopePerWeek, noise);
  const confidenceLabel = labelConfidence(confidence);

  return {
    latest,
    first,
    delta,
    slopePerWeek,
    noise,
    label,
    confidence,
    confidenceLabel,
  };
}

/** Formatting helpers for the UI */
export function formatLatest(latest: number | null, unit: string) {
  if (latest == null) return "—";
  return `${formatValue(latest)} ${unit}`.trim();
}

export function formatChange(delta: number | null, unit: string) {
  if (delta == null) return "—";
  return `${formatDelta(delta)} ${unit}`.trim();
}

/* ----------------------- internals ----------------------- */

function normalizeSeries(points: SeriesPoint[]) {
  return points
    .filter((p) => Number.isFinite(p.date) && Number.isFinite(p.value))
    .sort((a, b) => a.date - b.date);
}

function linearRegression(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slopePerDay: 0, intercept: y[0] ?? 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    sumX += xi;
    sumY += yi;
    sumXX += xi * xi;
    sumXY += xi * yi;
  }

  const denom = n * sumXX - sumX * sumX;
  const slopePerDay =
    Math.abs(denom) < 1e-9 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slopePerDay * sumX) / n;

  return { slopePerDay, intercept };
}

// Robust MAD scaled to approximate std dev for normal data.
// If residuals are tiny, return 0.
function robustMad(values: number[]) {
  if (!values.length) return 0;
  const med = median(values);
  const abs = values.map((v) => Math.abs(v - med));
  const mad = median(abs);
  // 1.4826 * MAD ≈ std
  const scaled = 1.4826 * mad;
  return Number.isFinite(scaled) ? scaled : 0;
}

function median(arr: number[]) {
  const a = arr
    .filter((v) => Number.isFinite(v))
    .slice()
    .sort((x, y) => x - y);
  if (!a.length) return 0;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function computeCalmLabel(slopePerWeek: number, noise: number) {
  // deadband: if slope is very small, call it steady
  const absSlope = Math.abs(slopePerWeek);

  // If noise is large, require stronger slope to claim direction
  const noiseGate = Math.max(0.25, noise * 1.2); // units/week threshold proxy

  if (!Number.isFinite(slopePerWeek) || !Number.isFinite(noise))
    return "Unclear";

  if (absSlope < 0.25) return "Steady";

  if (absSlope < noiseGate) return "In flux";

  if (slopePerWeek < 0) return "Leaning lower";
  return "Leaning higher";
}

function scoreConfidence(
  n: number,
  slopePerWeek: number | null,
  noise: number | null
) {
  // Base confidence from sample size
  const nScore = clamp01((n - 3) / 18); // 4pts→~0.05, 22pts→~1

  if (slopePerWeek == null || noise == null) {
    // no slope/noise yet (too few points)
    return clamp01(0.15 + 0.6 * nScore);
  }

  const absSlope = Math.abs(slopePerWeek);

  // Signal-to-noise ratio (direction clarity)
  const snr = noise <= 1e-9 ? 3 : absSlope / Math.max(0.15, noise);

  // Map snr to 0..1 smoothly
  const snrScore = clamp01((snr - 0.6) / 2.0);

  // Noise penalty: high noise reduces confidence
  const noisePenalty = clamp01(1 - noise / 1.8);

  const score = 0.15 + 0.45 * nScore + 0.3 * snrScore + 0.1 * noisePenalty;
  return clamp01(score);
}

function labelConfidence(c: number | null): "High" | "Medium" | "Low" | "—" {
  if (c == null) return "—";
  if (c >= 0.72) return "High";
  if (c >= 0.46) return "Medium";
  return "Low";
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
