// lib/themeColor.ts
export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function isHex6(x: string) {
  return /^#([0-9a-fA-F]{6})$/.test(x.trim());
}

export function normalizeHex(x: string) {
  const t = x.trim().toUpperCase();
  if (t.startsWith("#")) return t;
  return `#${t}`;
}

export function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

export function rgbToHex(r: number, g: number, b: number) {
  const to = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${to(r)}${to(g)}${to(b)}`;
}

// HSL conversions (h: 0-360, s/l: 0-100)
export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / d) % 6);
        break;
      case g:
        h = 60 * ((b - r) / d + 2);
        break;
      case b:
        h = 60 * ((r - g) / d + 4);
        break;
    }
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}

function hue2rgb(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function hslToRgb(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;

  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = h / 360;

  const r = hue2rgb(p, q, hk + 1 / 3) * 255;
  const g = hue2rgb(p, q, hk) * 255;
  const b = hue2rgb(p, q, hk - 1 / 3) * 255;

  return { r, g, b };
}

export function hexToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hslToHex(h: number, s: number, l: number) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

// Contrast ratio (WCAG) helpers
function srgbToLinear(v: number) {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(hexA: string, hexB: string) {
  const L1 = relativeLuminance(hexA);
  const L2 = relativeLuminance(hexB);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}
