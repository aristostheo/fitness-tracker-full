// services/longTermProgress.ts
// Drop-in ✅
// Utilities + demo data for Long-term Progress

export type SeriesPoint = { date: number; value: number };

export type RangeKey = "1m" | "3m" | "6m" | "1y" | "all";

export const RANGE_OPTIONS: {
  key: RangeKey;
  label: string;
  days: number | null;
}[] = [
  { key: "1m", label: "1M", days: 30 },
  { key: "3m", label: "3M", days: 90 },
  { key: "6m", label: "6M", days: 180 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
];

// --- Formatting -------------------------------------------------------------

export function formatValue(v: number): string {
  // keep it clean; caller adds units
  const abs = Math.abs(v);
  if (abs >= 100) return v.toFixed(1);
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(1);
}

export function formatDelta(d: number): string {
  const sign = d > 0 ? "+" : d < 0 ? "−" : "";
  const mag = Math.abs(d);
  return `${sign}${mag.toFixed(1)}`;
}

export function computeSignalLabel(start: number, end: number): string {
  const d = end - start;
  const ad = Math.abs(d);

  // Gentle thresholds
  if (ad < 0.4) return "Holding steady";
  if (d > 0) return ad > 2.5 ? "Moving upward" : "Drifting upward";
  return ad > 2.5 ? "Moving downward" : "Drifting downward";
}

// --- Smoothing + Bars -------------------------------------------------------

/**
 * Exponential moving average smoothing.
 * alpha ~ 0.2-0.35 tends to feel “calm”.
 */
export function emaSmooth(values: number[], alpha = 0.28): number[] {
  if (!values.length) return [];
  const out: number[] = [];
  let prev = values[0];
  out.push(prev);
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    const next = alpha * v + (1 - alpha) * prev;
    out.push(next);
    prev = next;
  }
  return out;
}

/**
 * Normalize a series into [0..1] bar heights.
 * Also resamples to a fixed bar count for consistent UI.
 */
export function normalizeBars(values: number[], barCount: number): number[] {
  if (!values.length) return [];
  const resampled = resample(values, barCount);
  const min = Math.min(...resampled);
  const max = Math.max(...resampled);
  const span = Math.max(0.0001, max - min);

  return resampled.map((v) => (v - min) / span);
}

/** Simple resample to N points via index mapping. */
function resample(values: number[], n: number): number[] {
  if (values.length <= 1)
    return Array.from({ length: n }, () => values[0] ?? 0);
  if (values.length === n) return values.slice();

  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const idx = t * (values.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(values.length - 1, Math.ceil(idx));
    const frac = idx - lo;
    const v = values[lo] * (1 - frac) + values[hi] * frac;
    out.push(v);
  }
  return out;
}

// --- Range filtering --------------------------------------------------------

export function filterByRange(
  series: SeriesPoint[],
  range: RangeKey
): SeriesPoint[] {
  if (!series?.length) return [];
  const days = RANGE_OPTIONS.find((r) => r.key === range)?.days ?? null;
  if (!days) return series;

  const now = Date.now();
  const minTs = now - days * 24 * 60 * 60 * 1000;
  return series.filter((p) => p.date >= minTs);
}

// --- Demo data (replace with Firestore/history) ----------------------------

export function demoLongTermProgressData(): {
  weight: SeriesPoint[];
  bodyFatPct: SeriesPoint[];
  waistCm: SeriesPoint[];
  workoutConsistency: SeriesPoint[];
  nutritionConsistency: SeriesPoint[];
} {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // 13 months of near-daily points
  const count = 390;

  const weightBase = 216.9;
  const bfBase = 19.2;
  const waistBase = 92.0;

  const weight: SeriesPoint[] = [];
  const bodyFatPct: SeriesPoint[] = [];
  const waistCm: SeriesPoint[] = [];
  const workoutConsistency: SeriesPoint[] = [];
  const nutritionConsistency: SeriesPoint[] = [];

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);

    // A “valley then rise” pattern (similar vibe to your screenshot), plus noise
    const wave =
      2.4 * Math.sin(t * Math.PI * 2.2) + 1.2 * Math.sin(t * Math.PI * 4.8);

    const valley = -3.2 * Math.exp(-Math.pow((t - 0.65) / 0.12, 2));
    const drift = 1.4 * (t - 0.55);

    const noise = (Math.random() - 0.5) * 1.1;

    const w = weightBase + wave + valley + drift + noise;
    const bf =
      bfBase + 0.6 * Math.sin(t * Math.PI * 2.1) + (Math.random() - 0.5) * 0.35;
    const wa =
      waistBase +
      1.2 * Math.sin(t * Math.PI * 1.4) +
      (Math.random() - 0.5) * 0.5;

    // Consistency 0..1 (optional)
    const wk = clamp01(
      0.58 + 0.18 * Math.sin(t * Math.PI * 2.0) + (Math.random() - 0.5) * 0.08
    );
    const nu = clamp01(
      0.62 + 0.16 * Math.sin(t * Math.PI * 1.6) + (Math.random() - 0.5) * 0.08
    );

    const ts = now - (count - 1 - i) * day;

    weight.push({ date: ts, value: w });
    bodyFatPct.push({ date: ts, value: bf });
    waistCm.push({ date: ts, value: wa });

    // If you don’t want these shown by default, return [] here.
    workoutConsistency.push({ date: ts, value: wk });
    nutritionConsistency.push({ date: ts, value: nu });
  }

  return {
    weight,
    bodyFatPct,
    waistCm,
    workoutConsistency,
    nutritionConsistency,
  };
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
