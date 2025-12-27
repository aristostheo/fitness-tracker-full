// services/badges.ts
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** ───────────────────────── Types ───────────────────────── **/

// Add LOTS of new badges but keep your original IDs for compatibility.
export type BadgeId =
  /* on-boarding & verification */
  | "first-log"
  | "verified"

  /* streaks */
  | "week-streak-3"
  | "week-streak-7"
  | "streak-14"
  | "streak-21"
  | "streak-30"
  | "streak-100"
  | "streak-60"
  | "streak-200"

  /* lifetime workout totals */
  | "workout-10"
  | "workout-25"
  | "workout-50"
  | "workout-100"
  | "workout-250"
  | "workout-500"
  | "workout-1000"

  /* lifetime meal totals */
  | "meal-10"
  | "meal-25"
  | "meal-50"
  | "meal-100"
  | "meal-250"
  | "meal-500"
  | "meal-750"
  | "meal-1000"

  /* PRs */
  | "first-pr"
  | "pr-five"
  | "pr-ten"
  | "pr-fifty"
  | "pr-twenty"
  | "pr-hundred"

  /* nutrition day targets */
  | "protein-pro" // ≥100g
  | "protein-elite" // ≥150g
  | "fiber-fan" // ≥25g
  | "fiber-master" // ≥35g
  | "sugar-sensei" // ≤30g
  | "sugar-ninja" // ≤20g
  | "calorie-zen" // 1-day: 1600–2600 kcal window (tunable)
  | "macro-balance" // protein 20–35% kcal & fat 20–35% kcal (rough balance)

  /* templates & presets */
  | "template-maker"
  | "template-five"
  | "template-twenty"
  | "template-applier"
  | "template-applier-10"
  | "preset-maker"
  | "preset-ten"

  /* routines & scheduling */
  | "routine-builder"
  | "routine-week"

  /* social */
  | "friend-1"
  | "friend-5"
  | "friend-10"
  | "reaction-10"
  | "reaction-100"
  | "comment-10"
  | "comment-50";

export type BadgeDef = {
  id: BadgeId;
  name: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap; // Ionicon name
  color: string; // brand color
  desc: string; // glossary description
  hidden?: boolean; // if true, show as “mystery” until earned
  tiers?: number[]; // optional thresholds for tiered badges
};

/** ───────────────────────── Catalog ───────────────────────── **/

export const BADGES: Record<BadgeId, BadgeDef> = {
  /* onboarding / verification */
  "first-log": {
    id: "first-log",
    name: "First Log",
    icon: "sparkles-outline",
    color: "#22c55e",
    desc: "Log your first workout or meal.",
  },
  verified: {
    id: "verified",
    name: "Verified",
    icon: "checkmark-done-outline",
    color: "#10b981",
    desc: "Verify your email.",
  },

  /* streaks */
  "week-streak-3": {
    id: "week-streak-3",
    name: "3-Day Streak",
    icon: "flame-outline",
    color: "#f59e0b",
    desc: "Log something 3 days in a row.",
  },
  "week-streak-7": {
    id: "week-streak-7",
    name: "7-Day Streak",
    icon: "flame-outline",
    color: "#ef4444",
    desc: "Log something every day for a week.",
  },
  "streak-14": {
    id: "streak-14",
    name: "2-Week Streak",
    icon: "flame-outline",
    color: "#fb7185",
    desc: "Keep the fire burning for 14 days straight.",
  },
  "streak-21": {
    id: "streak-21",
    name: "21-Day Streak",
    icon: "flame-outline",
    color: "#f97316",
    desc: "Habits are forming. Three weeks in a row!",
  },
  "streak-30": {
    id: "streak-30",
    name: "30-Day Streak",
    icon: "flame-outline",
    color: "#34d399",
    desc: "A full month of consistency.",
  },
  "streak-100": {
    id: "streak-100",
    name: "100-Day Streak",
    icon: "flame-outline",
    color: "#60a5fa",
    desc: "100 days of momentum. Legendary.",
    hidden: false,
  },
  "streak-60": {
    id: "streak-60",
    name: "60-Day Streak",
    icon: "flame-outline",
    color: "#34d399",
    desc: "Two straight months of consistency.",
  },
  "streak-200": {
    id: "streak-200",
    name: "200-Day Streak",
    icon: "flame-outline",
    color: "#a855f7",
    desc: "200 days logged. Unstoppable.",
    hidden: false,
  },

  /* workouts lifetime totals */
  "workout-10": {
    id: "workout-10",
    name: "Workout 10",
    icon: "body-outline",
    color: "#06b6d4",
    desc: "Log 10 workouts total.",
  },
  "workout-25": {
    id: "workout-25",
    name: "Workout 25",
    icon: "barbell-outline",
    color: "#0ea5e9",
    desc: "Log 25 workouts total.",
  },
  "workout-50": {
    id: "workout-50",
    name: "Workout 50",
    icon: "fitness-outline",
    color: "#2563eb",
    desc: "Log 50 workouts total.",
  },
  "workout-100": {
    id: "workout-100",
    name: "Workout 100",
    icon: "trophy-outline",
    color: "#8b5cf6",
    desc: "Log 100 workouts total.",
  },
  "workout-250": {
    id: "workout-250",
    name: "Workout 250",
    icon: "medal-outline",
    color: "#a78bfa",
    desc: "Log 250 workouts total.",
    hidden: false,
  },
  "workout-500": {
    id: "workout-500",
    name: "Workout 500",
    icon: "medal-outline",
    color: "#f59e0b",
    desc: "Log 500 workouts total.",
    hidden: false,
  },
  "workout-1000": {
    id: "workout-1000",
    name: "Workout 1000",
    icon: "trophy",
    color: "#22c55e",
    desc: "Log 1000 workouts total.",
    hidden: false,
  },

  /* meals lifetime totals */
  "meal-10": {
    id: "meal-10",
    name: "Meal 10",
    icon: "pizza-outline",
    color: "#f59e0b",
    desc: "Log 10 meals total.",
  },
  "meal-25": {
    id: "meal-25",
    name: "Meal 25",
    icon: "fast-food-outline",
    color: "#f59e0b",
    desc: "Log 25 meals total.",
  },
  "meal-50": {
    id: "meal-50",
    name: "Meal 50",
    icon: "restaurant-outline",
    color: "#f59e0b",
    desc: "Log 50 meals total.",
  },
  "meal-100": {
    id: "meal-100",
    name: "Meal 100",
    icon: "nutrition-outline",
    color: "#fbbf24",
    desc: "Log 100 meals total.",
  },
  "meal-250": {
    id: "meal-250",
    name: "Meal 250",
    icon: "ice-cream-outline",
    color: "#fbbf24",
    desc: "Log 250 meals total.",
  },
  "meal-500": {
    id: "meal-500",
    name: "Meal 500",
    icon: "ribbon-outline",
    color: "#fde047",
    desc: "Log 500 meals total.",
    hidden: false,
  },
  "meal-750": {
    id: "meal-750",
    name: "Meal 750",
    icon: "ribbon-outline",
    color: "#fb7185",
    desc: "Log 750 meals total.",
    hidden: false,
  },
  "meal-1000": {
    id: "meal-1000",
    name: "Meal 1000",
    icon: "ribbon-outline",
    color: "#22c55e",
    desc: "Log 1000 meals total.",
    hidden: false,
  },

  /* PRs */
  "first-pr": {
    id: "first-pr",
    name: "First PR",
    icon: "trophy-outline",
    color: "#a78bfa",
    desc: "Hit your first personal record.",
  },
  "pr-five": {
    id: "pr-five",
    name: "PR Hunter",
    icon: "medal-outline",
    color: "#8b5cf6",
    desc: "Hit 5 personal records all time.",
  },
  "pr-ten": {
    id: "pr-ten",
    name: "PR Streaker",
    icon: "trophy-outline",
    color: "#22c55e",
    desc: "Hit 10 personal records all time.",
  },
  "pr-fifty": {
    id: "pr-fifty",
    name: "PR Legend",
    icon: "diamond-outline",
    color: "#10b981",
    desc: "Hit 50 personal records all time.",
    hidden: false,
  },
  "pr-twenty": {
    id: "pr-twenty",
    name: "PR Collector",
    icon: "trophy-outline",
    color: "#3b82f6",
    desc: "Hit 20 personal records all time.",
  },
  "pr-hundred": {
    id: "pr-hundred",
    name: "PR Centurion",
    icon: "diamond-outline",
    color: "#22c55e",
    desc: "Hit 100 personal records all time.",
    hidden: false,
  },

  /* nutrition day targets */
  "protein-pro": {
    id: "protein-pro",
    name: "Protein Pro",
    icon: "barbell-outline",
    color: "#60a5fa",
    desc: "Hit ≥ 100g protein in a day.",
  },
  "protein-elite": {
    id: "protein-elite",
    name: "Protein Elite",
    icon: "shield-checkmark-outline",
    color: "#3b82f6",
    desc: "Hit ≥ 150g protein in a day.",
  },
  "fiber-fan": {
    id: "fiber-fan",
    name: "Fiber Fan",
    icon: "leaf-outline",
    color: "#22c55e",
    desc: "Reach ≥ 25g fiber in a day.",
  },
  "fiber-master": {
    id: "fiber-master",
    name: "Fiber Master",
    icon: "leaf-outline",
    color: "#16a34a",
    desc: "Reach ≥ 35g fiber in a day.",
  },
  "sugar-sensei": {
    id: "sugar-sensei",
    name: "Sugar Sensei",
    icon: "ice-cream-outline",
    color: "#f97316",
    desc: "Keep added sugar ≤ 30g in a day.",
  },
  "sugar-ninja": {
    id: "sugar-ninja",
    name: "Sugar Ninja",
    icon: "skull-outline",
    color: "#ef4444",
    desc: "Keep added sugar ≤ 20g in a day.",
  },
  "calorie-zen": {
    id: "calorie-zen",
    name: "Calorie Zen",
    icon: "speedometer-outline",
    color: "#14b8a6",
    desc: "Stay in a balanced calorie window today.",
  },
  "macro-balance": {
    id: "macro-balance",
    name: "Macro Balance",
    icon: "bar-chart-outline",
    color: "#22c55e",
    desc: "Protein & fat each within 20–35% of calories today.",
  },

  /* templates & presets */
  "template-maker": {
    id: "template-maker",
    name: "Template Maker",
    icon: "copy-outline",
    color: "#0ea5e9",
    desc: "Create your first workout template.",
  },
  "template-five": {
    id: "template-five",
    name: "Template Library",
    icon: "albums-outline",
    color: "#22c55e",
    desc: "Create 5 workout templates.",
  },
  "template-twenty": {
    id: "template-twenty",
    name: "Template Architect",
    icon: "layers-outline",
    color: "#a855f7",
    desc: "Create 20 workout templates.",
    hidden: false,
  },
  "template-applier": {
    id: "template-applier",
    name: "Template Runner",
    icon: "play-circle-outline",
    color: "#f59e0b",
    desc: "Apply a workout template.",
  },
  "template-applier-10": {
    id: "template-applier-10",
    name: "Template Power User",
    icon: "flash-outline",
    color: "#f97316",
    desc: "Apply templates 10 times.",
    hidden: false,
  },
  "preset-maker": {
    id: "preset-maker",
    name: "Preset Creator",
    icon: "construct-outline",
    color: "#14b8a6",
    desc: "Save your first preset.",
  },
  "preset-ten": {
    id: "preset-ten",
    name: "Preset Toolbox",
    icon: "hammer-outline",
    color: "#0ea5e9",
    desc: "Save 10 presets.",
  },

  /* routines & scheduling */
  "routine-builder": {
    id: "routine-builder",
    name: "Routine Builder",
    icon: "calendar-outline",
    color: "#22c55e",
    desc: "Create your first weekly routine.",
  },
  "routine-week": {
    id: "routine-week",
    name: "Planner",
    icon: "calendar-number-outline",
    color: "#a78bfa",
    desc: "Schedule 7 days in your routine.",
  },

  /* social */
  "friend-1": {
    id: "friend-1",
    name: "New Friend",
    icon: "people-outline",
    color: "#60a5fa",
    desc: "Add your first friend.",
  },
  "friend-5": {
    id: "friend-5",
    name: "Crew Builder",
    icon: "person-add-outline",
    color: "#22c55e",
    desc: "Add 5 friends.",
  },
  "friend-10": {
    id: "friend-10",
    name: "Squad Leader",
    icon: "trophy-outline",
    color: "#a855f7",
    desc: "Add 10 friends.",
    hidden: false,
  },
  "reaction-10": {
    id: "reaction-10",
    name: "Cheer Squad",
    icon: "happy-outline",
    color: "#f59e0b",
    desc: "Give or receive 10 reactions.",
  },
  "reaction-100": {
    id: "reaction-100",
    name: "Hype Train",
    icon: "megaphone-outline",
    color: "#22c55e",
    desc: "Give or receive 100 reactions.",
    hidden: false,
  },
  "comment-10": {
    id: "comment-10",
    name: "Chatter",
    icon: "chatbubbles-outline",
    color: "#0ea5e9",
    desc: "Post 10 comments.",
  },
  "comment-50": {
    id: "comment-50",
    name: "Community Voice",
    icon: "chatbubble-ellipses-outline",
    color: "#a855f7",
    desc: "Post 50 comments.",
    hidden: false,
  },
};

/** ───────────────────────── Helpers ───────────────────────── **/

export async function awardBadge(
  uid: string,
  badgeId: BadgeId,
  meta?: { progress?: number; tier?: number }
) {
  const ref = doc(db, "users", uid, "badges", badgeId);
  const snap = await getDoc(ref);
  if (snap.exists()) return false; // already earned
  await setDoc(ref, {
    id: badgeId,
    earnedAt: Date.now(),
    createdAt: serverTimestamp(),
    ...(meta || {}),
  });
  return true;
}

async function tryAward(
  uid: string,
  badgeId: BadgeId,
  cond: boolean,
  earnedList: BadgeId[]
) {
  if (!cond) return;
  if (await awardBadge(uid, badgeId)) earnedList.push(badgeId);
}

/** ───────────────────────── Evaluators ───────────────────────── **/

// Events the app can throw at this evaluator.
// Keep these cheap & pure; compute totals on the caller if they’re heavy.
export type BadgeEvent =
  | {
      type: "nutrition:add";
      dayTotals: {
        calories: number;
        protein: number;
        fiber?: number;
        sugar?: number;
      };
      counts: {
        mealsAllTime: number;
        daysStreak: number;
      };
    }
  | {
      type: "workout:add";
      counts: {
        workoutsAllTime: number;
        daysStreak: number;
      };
      prGained?: boolean;
      prTotal?: number;
    }
  | { type: "account:verified" }
  | { type: "template:create"; totalTemplates: number }
  | { type: "template:apply"; totalApplied: number }
  | { type: "preset:create"; totalPresets: number }
  | { type: "routine:set"; routinesCount: number; daysCovered?: number }
  | { type: "social:friend"; friendsCount: number }
  | { type: "social:reaction"; reactionsTotal: number }
  | { type: "social:comment"; commentsTotal: number };

export async function evaluateBadges(
  uid: string,
  ev: BadgeEvent
): Promise<BadgeId[]> {
  const earned: BadgeId[] = [];

  /* First actions (any log) */
  if (ev.type === "nutrition:add" || ev.type === "workout:add") {
    await tryAward(uid, "first-log", true, earned);
  }

  /* Streaks */
  if (ev.type === "nutrition:add" || ev.type === "workout:add") {
    const s = ev.counts.daysStreak;
    await tryAward(uid, "week-streak-3", s >= 3, earned);
    await tryAward(uid, "week-streak-7", s >= 7, earned);
    await tryAward(uid, "streak-14", s >= 14, earned);
    await tryAward(uid, "streak-21", s >= 21, earned);
    await tryAward(uid, "streak-30", s >= 30, earned);
    await tryAward(uid, "streak-100", s >= 100, earned);
    await tryAward(uid, "streak-60", s >= 60, earned);
    await tryAward(uid, "streak-200", s >= 200, earned);
  }

  /* Nutrition day targets & lifetime meal totals */
  if (ev.type === "nutrition:add") {
    const { calories, protein, fiber = 0, sugar = 0 } = ev.dayTotals;
    const pct = (n: number) => (calories > 0 ? (n * 4) / calories : 0); // macros kcal share (protein:4, carbs:4, fat:9) – but we only use protein pct here, fat handled separately
    const fatPct =
      calories > 0 ? ((ev.dayTotals as any).fatKcal ?? 0) / calories : 0; // caller can optionally add fatKcal; if not, macro-balance will simply skip fat check below

    // Day targets
    await tryAward(uid, "protein-pro", protein >= 100, earned);
    await tryAward(uid, "protein-elite", protein >= 150, earned);
    await tryAward(uid, "fiber-fan", fiber >= 25, earned);
    await tryAward(uid, "fiber-master", fiber >= 35, earned);
    await tryAward(uid, "sugar-sensei", sugar <= 30, earned);
    await tryAward(uid, "sugar-ninja", sugar <= 20, earned);

    // Calorie window (tune to your product’s targets if you have TDEE)
    await tryAward(
      uid,
      "calorie-zen",
      calories >= 1600 && calories <= 2600,
      earned
    );

    // Macro balance – protein & fat each roughly in the 20–35% window
    const proteinPct = pct(protein); // ~0.2–0.35
    const fatPctOk =
      typeof fatPct === "number" && fatPct > 0
        ? fatPct >= 0.2 && fatPct <= 0.35
        : false;
    await tryAward(
      uid,
      "macro-balance",
      proteinPct >= 0.2 && proteinPct <= 0.35 && fatPctOk,
      earned
    );

    // Lifetime meal totals
    const m = ev.counts.mealsAllTime;
    await tryAward(uid, "meal-10", m >= 10, earned);
    await tryAward(uid, "meal-25", m >= 25, earned);
    await tryAward(uid, "meal-50", m >= 50, earned);
    await tryAward(uid, "meal-100", m >= 100, earned);
    await tryAward(uid, "meal-250", m >= 250, earned);
    await tryAward(uid, "meal-500", m >= 500, earned);
    await tryAward(uid, "meal-750", m >= 750, earned);
    await tryAward(uid, "meal-1000", m >= 1000, earned);
  }

  /* Workouts & PR tiers */
  if (ev.type === "workout:add") {
    const n = ev.counts.workoutsAllTime;
    await tryAward(uid, "workout-10", n >= 10, earned);
    await tryAward(uid, "workout-25", n >= 25, earned);
    await tryAward(uid, "workout-50", n >= 50, earned);
    await tryAward(uid, "workout-100", n >= 100, earned);
    await tryAward(uid, "workout-250", n >= 250, earned);
    await tryAward(uid, "workout-500", n >= 500, earned);
    await tryAward(uid, "workout-1000", n >= 1000, earned);

    if (ev.prGained) await tryAward(uid, "first-pr", true, earned);
    const totalPRs = ev.prTotal ?? 0;
    await tryAward(uid, "pr-five", totalPRs >= 5, earned);
    await tryAward(uid, "pr-ten", totalPRs >= 10, earned);
    await tryAward(uid, "pr-fifty", totalPRs >= 50, earned);
    await tryAward(uid, "pr-twenty", totalPRs >= 20, earned);
    await tryAward(uid, "pr-hundred", totalPRs >= 100, earned);
  }

  /* Verification */
  if (ev.type === "account:verified") {
    await tryAward(uid, "verified", true, earned);
  }

  /* Templates & presets */
  if (ev.type === "template:create") {
    const t = ev.totalTemplates;
    await tryAward(uid, "template-maker", t >= 1, earned);
    await tryAward(uid, "template-five", t >= 5, earned);
    await tryAward(uid, "template-twenty", t >= 20, earned);
  }
  if (ev.type === "template:apply") {
    const a = ev.totalApplied;
    await tryAward(uid, "template-applier", a >= 1, earned);
    await tryAward(uid, "template-applier-10", a >= 10, earned);
  }
  if (ev.type === "preset:create") {
    const p = ev.totalPresets;
    await tryAward(uid, "preset-maker", p >= 1, earned);
    await tryAward(uid, "preset-ten", p >= 10, earned);
  }

  /* Routines */
  if (ev.type === "routine:set") {
    await tryAward(uid, "routine-builder", ev.routinesCount >= 1, earned);
    if (typeof ev.daysCovered === "number") {
      await tryAward(uid, "routine-week", ev.daysCovered >= 7, earned);
    }
  }

  /* Social */
  if (ev.type === "social:friend") {
    const f = ev.friendsCount;
    await tryAward(uid, "friend-1", f >= 1, earned);
    await tryAward(uid, "friend-5", f >= 5, earned);
    await tryAward(uid, "friend-10", f >= 10, earned);
  }
  if (ev.type === "social:reaction") {
    const r = ev.reactionsTotal;
    await tryAward(uid, "reaction-10", r >= 10, earned);
    await tryAward(uid, "reaction-100", r >= 100, earned);
  }
  if (ev.type === "social:comment") {
    const c = ev.commentsTotal;
    await tryAward(uid, "comment-10", c >= 10, earned);
    await tryAward(uid, "comment-50", c >= 50, earned);
  }

  return earned;
}
