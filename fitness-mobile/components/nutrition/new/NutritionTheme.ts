import { alpha } from "./utils";

export type NutritionColors = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  subtle: string;
  border: string;

  primary: string;
  protein: string;
  carbs: string;
  fat: string;
  water: string;

  danger: string;
};

export function getNutritionTheme(isDark: boolean): NutritionColors {
  if (isDark) {
    const bg = "#06070A";
    const card = "#0E1116";
    const text = "#F2F4F8";
    const muted = "#A8B0BE";
    const subtle = "#7D8796";
    const border = alpha("#FFFFFF", 0.1);

    return {
      bg,
      card,
      text,
      muted,
      subtle,
      border,
      primary: "#79A7FF",
      protein: "#B8E1FF",
      carbs: "#BFE8D8",
      fat: "#F2D6B8",
      water: "#7FD0FF",
      danger: "#FF6B6B",
    };
  }

  const bg = "#F6F7FA";
  const card = "#FFFFFF";
  const text = "#101318";
  const muted = "#4B5565";
  const subtle = "#6B7280";
  const border = alpha("#000000", 0.1);

  return {
    bg,
    card,
    text,
    muted,
    subtle,
    border,
    primary: "#3B82F6",
    protein: "#2563EB",
    carbs: "#059669",
    fat: "#B45309",
    water: "#0EA5E9",
    danger: "#DC2626",
  };
}
