// components/workouts/utils/withAlpha.ts
export function withAlpha(hex: string, a = 0.18) {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  const r = parseInt(m[1], 16),
    g = parseInt(m[2], 16),
    b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
