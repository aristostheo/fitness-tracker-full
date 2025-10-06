// Meal-aware randomized mock suggestions for Nutrition.jsx
// Usage: getMockCandidates({ meal, hint, count })
// meal: "breakfast" | "lunch" | "dinner" | "snacks"
// hint: optional text from the Food name input
// count: how many to return (default 3)
const DEFAULT_COUNT_BY_MEAL = {
  breakfast: 3,
  lunch: 4,
  dinner: 4,
  snacks: 2,
};
const POOLS = {
  breakfast: [
    {
      name: "Oatmeal (rolled, cooked)",
      qty: 150,
      unit: "g",
      calories: 96,
      protein: 3,
      carbs: 17,
      fat: 2,
    },
    {
      name: "Greek yogurt (plain, 2%)",
      qty: 170,
      unit: "g",
      calories: 130,
      protein: 17,
      carbs: 6,
      fat: 4,
    },
    {
      name: "Eggs, scrambled",
      qty: 2,
      unit: "eggs",
      calories: 180,
      protein: 12,
      carbs: 2,
      fat: 13,
    },
    {
      name: "Whole wheat toast",
      qty: 2,
      unit: "slices",
      calories: 160,
      protein: 6,
      carbs: 28,
      fat: 2,
    },
    {
      name: "Banana",
      qty: 118,
      unit: "g",
      calories: 105,
      protein: 1,
      carbs: 27,
      fat: 0,
    },
    {
      name: "Protein smoothie",
      qty: 350,
      unit: "ml",
      calories: 220,
      protein: 25,
      carbs: 22,
      fat: 4,
    },
    {
      name: "Avocado toast",
      qty: 1,
      unit: "serving",
      calories: 260,
      protein: 6,
      carbs: 24,
      fat: 16,
    },
  ],
  lunch: [
    {
      name: "Grilled chicken breast",
      qty: 150,
      unit: "g",
      calories: 250,
      protein: 45,
      carbs: 0,
      fat: 5,
    },
    {
      name: "Brown rice (cooked)",
      qty: 150,
      unit: "g",
      calories: 165,
      protein: 4,
      carbs: 34,
      fat: 1,
    },
    {
      name: "Quinoa salad",
      qty: 200,
      unit: "g",
      calories: 280,
      protein: 9,
      carbs: 40,
      fat: 8,
    },
    {
      name: "Mixed greens salad",
      qty: 120,
      unit: "g",
      calories: 60,
      protein: 3,
      carbs: 10,
      fat: 2,
    },
    {
      name: "Salmon (baked)",
      qty: 140,
      unit: "g",
      calories: 275,
      protein: 30,
      carbs: 0,
      fat: 17,
    },
    {
      name: "Turkey wrap",
      qty: 1,
      unit: "wrap",
      calories: 320,
      protein: 25,
      carbs: 28,
      fat: 10,
    },
    {
      name: "Tofu stir-fry",
      qty: 220,
      unit: "g",
      calories: 300,
      protein: 18,
      carbs: 20,
      fat: 16,
    },
  ],
  dinner: [
    {
      name: "Lean beef (sirloin, grilled)",
      qty: 150,
      unit: "g",
      calories: 330,
      protein: 40,
      carbs: 0,
      fat: 18,
    },
    {
      name: "Sweet potato (baked)",
      qty: 200,
      unit: "g",
      calories: 180,
      protein: 4,
      carbs: 41,
      fat: 0,
    },
    {
      name: "Steamed broccoli",
      qty: 120,
      unit: "g",
      calories: 40,
      protein: 3,
      carbs: 8,
      fat: 0,
    },
    {
      name: "Pasta (whole wheat, cooked)",
      qty: 180,
      unit: "g",
      calories: 255,
      protein: 10,
      carbs: 53,
      fat: 2,
    },
    {
      name: "Shrimp (sautéed)",
      qty: 120,
      unit: "g",
      calories: 120,
      protein: 23,
      carbs: 1,
      fat: 2,
    },
    {
      name: "Chickpea curry",
      qty: 220,
      unit: "g",
      calories: 340,
      protein: 14,
      carbs: 42,
      fat: 12,
    },
    {
      name: "Sushi (salmon maki)",
      qty: 8,
      unit: "pieces",
      calories: 300,
      protein: 14,
      carbs: 42,
      fat: 7,
    },
  ],
  snacks: [
    {
      name: "Almonds",
      qty: 28,
      unit: "g",
      calories: 170,
      protein: 6,
      carbs: 6,
      fat: 15,
    },
    {
      name: "Apple",
      qty: 182,
      unit: "g",
      calories: 95,
      protein: 0,
      carbs: 25,
      fat: 0,
    },
    {
      name: "Protein bar",
      qty: 1,
      unit: "bar",
      calories: 210,
      protein: 20,
      carbs: 22,
      fat: 7,
    },
    {
      name: "Cottage cheese",
      qty: 150,
      unit: "g",
      calories: 140,
      protein: 20,
      carbs: 6,
      fat: 5,
    },
    {
      name: "Hummus & carrots",
      qty: 120,
      unit: "g",
      calories: 180,
      protein: 5,
      carbs: 20,
      fat: 9,
    },
    {
      name: "Dark chocolate",
      qty: 30,
      unit: "g",
      calories: 170,
      protein: 2,
      carbs: 13,
      fat: 12,
    },
    {
      name: "Rice cakes",
      qty: 2,
      unit: "cakes",
      calories: 70,
      protein: 1,
      carbs: 14,
      fat: 0,
    },
  ],
};

// Simple fuzzy check to nudge choices if the user typed a hint (e.g., "chicken")
function matchesHint(item, hint) {
  if (!hint) return 0;
  const h = hint.toLowerCase();
  return item.name.toLowerCase().includes(h) ? 1 : 0;
}

// Fisher–Yates shuffle (in-place copy)
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getMockCandidates({
  meal = "lunch",
  hint = "",
  count,
} = {}) {
  const pool = POOLS[meal] || POOLS.lunch;
  const desired = Math.max(1, count ?? (DEFAULT_COUNT_BY_MEAL[meal] || 3));

  // Score by hint (light boost if the name includes the hint)
  const scored = pool
    .map((it) => ({ ...it, __score: matchesHint(it, hint) }))
    .sort((a, b) => b.__score - a.__score);

  // Group by score to avoid the loop/closure warning, then shuffle within each group
  const grouped = {};
  for (const item of scored) {
    (grouped[item.__score] ||= []).push(item);
  }

  const sortedScores = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);
  let top = [];
  for (const score of sortedScores) {
    const shuffled = shuffle(grouped[score]);
    top = top.concat(shuffled);
  }

  // Slice to meal-specific count
  top = top.slice(0, desired);

  // Normalize + add fun confidence
  return top.map((x) => ({
    ...x,
    carbs: x.carbs ?? 0,
    protein: x.protein ?? 0,
    fat: x.fat ?? 0,
    sugar: x.sugar ?? 0,
    fiber: x.fiber ?? 0,
    confidence: 0.6 + Math.random() * 0.35,
  }));
}
