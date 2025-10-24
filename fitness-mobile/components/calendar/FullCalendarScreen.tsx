// app/(modals)/full-calendar.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  LayoutAnimation,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { fmt } from "@/utils/date";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import Card from "@/components/Card";
import { withAlpha } from "@/components/workouts/utils/withAlpha";
import { useRouter } from "expo-router";

/* ────────────────────────────────────────────── */
/* Types & constants                              */
/* ────────────────────────────────────────────── */

type DayFlags = {
  workouts: number;
  exercises: number;
  meals: number;
};

type CalendarItem = {
  id: string;
  type: "workout" | "exercise" | "meal";
  title: string;
  date: string;
};

type ViewMode = "month" | "week" | "day";

const db = getFirestore();

/* Colors per category – uses theme tint for workout, plus accent chips */
function categoryColors(colors: ReturnType<typeof useTheme>["colors"]) {
  return {
    workout: colors.primary,
    exercise: "#10b981", // emerald-500
    meal: "#f59e0b", // amber-500
  };
}

/* ────────────────────────────────────────────── */
/* Date helpers (timezone-safe for day stepping)  */
/* ────────────────────────────────────────────── */

// Parse 'YYYY-MM-DD' as a *local* date (not UTC) and pin time to noon
function fromISODateLocal(iso: string) {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0); // noon to dodge DST edges
  return dt;
}

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(12, 0, 0, 0);
  return x;
}
function endOfMonth(d: Date) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1, 0);
  x.setHours(12, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  const dow = x.getDay(); // 0=Sun
  x.setDate(x.getDate() - dow);
  x.setHours(12, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(12, 0, 0, 0);
  return x;
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  x.setHours(12, 0, 0, 0);
  return x;
}
function ymd(d: Date) {
  return fmt(d);
}
function monthMatrix(target: Date) {
  // 6x7 grid
  const first = startOfMonth(target);
  const start = startOfWeek(first);
  const rows: Date[][] = [];
  let cur = new Date(start);
  for (let r = 0; r < 6; r++) {
    const row: Date[] = [];
    for (let c = 0; c < 7; c++) {
      row.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    rows.push(row);
  }
  return rows;
}

/* ────────────────────────────────────────────── */
/* Firestore loading                              */
/* ────────────────────────────────────────────── */

async function fetchCalendarSummary(
  uid: string,
  fromISO: string,
  toISO: string
) {
  const out = new Map<string, DayFlags>();
  const bump = (iso: string, key: keyof DayFlags) => {
    const cur = out.get(iso) || { workouts: 0, exercises: 0, meals: 0 };
    cur[key] += 1;
    out.set(iso, cur);
  };
  const scan = async (subpath: string, key: keyof DayFlags) => {
    try {
      const coll = collection(db, "users", uid, subpath);
      const qy = query(
        coll,
        where("date", ">=", fromISO),
        where("date", "<=", toISO),
        orderBy("date", "asc")
      );
      const snap = await getDocs(qy);
      snap.forEach((doc) => {
        const iso = String((doc.data() as any)?.date || "");
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) bump(iso, key);
      });
    } catch {
      // ignore optional/unknown subcollections
    }
  };

  await scan("workouts", "workouts"); // ✅ your actual path
  await scan("exerciseEntries", "exercises"); // was "workouts" by mistake
  await scan("exerciseBurnEntries", "exercises");
  await scan("activityEntries", "exercises");
  await scan("exercises", "exercises");
  await scan("stepsDaily", "exercises"); // shows in green “Exercise” bucket
  await scan("foodEntries", "meals");
  await scan("nutritionEntries", "meals");
  await scan("meals", "meals");

  return out;
}

async function fetchDayItems(
  uid: string,
  iso: string
): Promise<CalendarItem[]> {
  const items: CalendarItem[] = [];
  const pushItem = (id: string, type: CalendarItem["type"], data: any) => {
    let title = "Entry";
    if (type === "workout") title = data?.exercise || "Workout";
    else if (type === "exercise") title = data?.name || "Exercise";
    else if (type === "meal") title = data?.name || "Meal";
    items.push({ id, type, title, date: iso });
  };

  const scan = async (subpath: string, type: CalendarItem["type"]) => {
    try {
      const coll = collection(db, "users", uid, subpath);
      const qy = query(coll, where("date", "==", iso));
      const snap = await getDocs(qy);
      snap.forEach((doc) => pushItem(doc.id, type, doc.data()));
    } catch {}
  };

  await scan("workouts", "workout"); // ✅ your actual path
  await scan("exerciseEntries", "exercise"); // was "workout" by mistake
  await scan("exerciseBurnEntries", "exercise");
  await scan("activityEntries", "exercise");
  await scan("exercises", "exercise");
  await scan("stepsDaily", "exercise"); // shows in green “Exercise” bucket
  await scan("foodEntries", "meal");
  await scan("nutritionEntries", "meal");
  await scan("meals", "meal");

  return items;
}

/* ────────────────────────────────────────────── */
/* Small UI bits                                  */
/* ────────────────────────────────────────────── */

function Pill({
  active,
  label,
  onPress,
  colors,
}: {
  active: boolean;
  label: string;
  onPress?: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active
          ? withAlpha(colors.primary, 0.16)
          : "transparent",
      }}
    >
      <Text
        style={{
          color: active ? colors.primary : colors.text,
          fontWeight: "800",
          letterSpacing: 0.5,
          textTransform: "capitalize",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Chip({
  color,
  label,
  colors,
}: {
  color: string;
  label: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: withAlpha(color, 0.45),
        backgroundColor: withAlpha(color, 0.12),
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
      <Text style={{ color: colors.text, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

/* tiny stacked bars inside a day cell */
function StackedBars({
  flags,
  palette,
}: {
  flags?: DayFlags;
  palette: { workout: string; exercise: string; meal: string };
}) {
  if (!flags) return <View style={{ height: 6 }} />;
  const total = flags.workouts + flags.exercises + flags.meals;
  const w = total ? Math.max(12, Math.min(40, total * 6)) : 16;

  const parts: Array<{ w: number; c: string }> = [];
  const push = (count: number, c: string) => {
    if (!count) return;
    const frac = count / (total || 1);
    parts.push({ w: Math.max(2, Math.round(frac * w)), c });
  };
  push(flags.workouts, palette.workout);
  push(flags.exercises, palette.exercise);
  push(flags.meals, palette.meal);

  return (
    <View style={{ height: 6, flexDirection: "row", gap: 2, marginTop: 6 }}>
      {parts.map((p, i) => (
        <View
          key={i}
          style={{
            width: p.w,
            height: 6,
            borderRadius: 3,
            backgroundColor: p.c,
          }}
        />
      ))}
    </View>
  );
}

/* ────────────────────────────────────────────── */
/* Main Screen                                    */
/* ────────────────────────────────────────────── */

export default function FullCalendarScreen({
  hideHeader = false,
}: {
  hideHeader?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const uid = user?.uid || "__demo__";

  const palette = categoryColors(colors);

  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(addDays(new Date(), 0)); // pinned to noon by helpers
  const [selected, setSelected] = useState<string>(fmt(new Date()));

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Map<string, DayFlags>>(new Map());
  const [dayItems, setDayItems] = useState<CalendarItem[]>([]);

  // Preload ±2 months for snappy paging
  const { fromISO, toISO } = useMemo(() => {
    const a = startOfMonth(addMonths(cursor, -2));
    const b = endOfMonth(addMonths(cursor, 2));
    return { fromISO: fmt(a), toISO: fmt(b) };
  }, [cursor]);

  useEffect(() => {
    let cancelled = false;
    if (!uid || uid === "__demo__") return; // ✅ avoid useless reads
    (async () => {
      try {
        setLoading(true);
        const map = await fetchCalendarSummary(uid, fromISO, toISO);
        if (!cancelled) setSummary(map);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, fromISO, toISO]);

  useEffect(() => {
    let cancelled = false;
    if (!uid || uid === "__demo__") return; // ✅ avoid useless reads
    (async () => {
      const items = await fetchDayItems(uid, selected);
      if (!cancelled) setDayItems(items);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, selected]);

  const rows = useMemo(() => monthMatrix(cursor), [cursor]);
  const headerTitle = useMemo(() => {
    const m = cursor.toLocaleString(undefined, { month: "long" });
    return `${m} ${cursor.getFullYear()}`;
  }, [cursor]);

  const doHaptic = (type: "light" | "medium" = "light") => {
    try {
      const impact =
        type === "light"
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium;
      Haptics.impactAsync(impact);
    } catch {}
  };

  /** Navigation via arrows:
   * - month: ±1 month
   * - week: ±7 days
   * - day:  ±1 day  (timezone-safe)
   */
  const go = (dir: "prev" | "next") => {
    const step = dir === "prev" ? -1 : +1;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (mode === "month") {
      setCursor(addMonths(cursor, step));
    } else if (mode === "week") {
      setCursor(addDays(cursor, step * 7));
    } else {
      // DAY MODE: parse selected as LOCAL date, step by 1 day, and sync both states
      const currentLocal = fromISODateLocal(selected);
      const nextDate = addDays(currentLocal, step);
      setSelected(fmt(nextDate)); // 'YYYY-MM-DD'
      setCursor(nextDate); // keep grid/week in sync
    }
    doHaptic("light");
  };

  const goToday = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const now = addDays(new Date(), 0); // normalize to noon
    setCursor(now);
    setSelected(fmt(now));
    doHaptic("medium");
  };

  const WeekStrip = () => {
    const s = startOfWeek(cursor);
    const days = Array.from({ length: 7 }, (_, k) => addDays(s, k));
    return (
      <View style={{ flexDirection: "row", gap: 8 }}>
        {days.map((d) => {
          const iso = ymd(d);
          const isToday = iso === fmt(addDays(new Date(), 0));
          const active = iso === selected;
          const flags = summary.get(iso);
          return (
            <Pressable
              key={iso}
              onPress={() => {
                setSelected(iso);
                setMode("day");
                setCursor(d);
                doHaptic("light");
              }}
              style={{
                flex: 1,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active
                  ? withAlpha(colors.primary, 0.16)
                  : withAlpha(colors.text, isDark ? 0.05 : 0.04),
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: isToday ? "900" : "800",
                }}
              >
                {d.getDate()}
              </Text>
              <StackedBars flags={flags} palette={palette} />
            </Pressable>
          );
        })}
      </View>
    );
  };

  /* ───────────── UI ───────────── */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: (colors as any).bg ?? colors.background,
      }}
    >
      {/* Compact sticky header with back/close */}
      {!hideHeader && (
        <View
          style={{
            paddingTop: Platform.OS === "ios" ? 14 : 6,
            paddingHorizontal: 12,
            paddingBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: Platform.OS === "ios" ? 0 : 1,
            borderColor: withAlpha(colors.text, 0.06),
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{
              padding: 8,
              borderRadius: 10,
              backgroundColor: withAlpha(colors.text, 0.06),
            }}
          >
            <Ionicons name="chevron-down" size={18} color={colors.text} />
          </Pressable>

          <Text
            style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}
            numberOfLines={1}
          >
            Calendar
          </Text>

          <Pressable
            onPress={goToday}
            hitSlop={10}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: withAlpha(colors.primary, 0.12),
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "800" }}>
              Today
            </Text>
          </Pressable>
        </View>
      )}

      {/* Top "hero" – month title, nav, mode */}
      <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 6 }}>
        {/* Title + nav */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.muted, fontWeight: "800" }}>
              Your history
            </Text>
            <Text
              style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}
            >
              {mode === "month"
                ? headerTitle
                : mode === "week"
                ? `Week of ${fmt(startOfWeek(cursor))}`
                : selected}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 8,
              backgroundColor: withAlpha(colors.text, isDark ? 0.06 : 0.05),
              borderWidth: 1,
              borderColor: colors.border,
              padding: 6,
              borderRadius: 999,
            }}
          >
            <Pressable onPress={() => go("prev")} style={{ padding: 8 }}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => go("next")} style={{ padding: 8 }}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Mode segment (wraps nicely; never overflows) */}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {(["day", "week", "month"] as ViewMode[]).map((m) => (
            <Pill
              key={m}
              active={mode === m}
              label={m}
              colors={colors}
              onPress={() => {
                setMode(m);
                doHaptic("light");
              }}
            />
          ))}
        </View>

        {/* Legend */}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Chip color={palette.workout} label="Workout" colors={colors} />
          <Chip color={palette.exercise} label="Exercise" colors={colors} />
          <Chip color={palette.meal} label="Meal" colors={colors} />
        </View>
      </View>

      {/* Calendar body */}
      {mode === "month" && (
        <View style={{ padding: 12, paddingTop: 4 }}>
          {/* Weekday labels */}
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 6,
              paddingBottom: 8,
              opacity: 0.7,
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <Text
                key={w}
                style={{
                  flex: 1,
                  textAlign: "center",
                  color: colors.text,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                {w}
              </Text>
            ))}
          </View>

          {/* Month grid */}
          {rows.map((row, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                gap: 8,
                paddingHorizontal: 4,
                marginBottom: 8,
              }}
            >
              {row.map((d, j) => {
                const iso = ymd(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = iso === fmt(addDays(new Date(), 0));
                const active = iso === selected;
                const flags = summary.get(iso);
                // intensity background by total count
                const total =
                  (flags?.workouts || 0) +
                  (flags?.exercises || 0) +
                  (flags?.meals || 0);
                const intensity = Math.min(1, total / 6); // cap at 6 entries
                const bg =
                  total > 0
                    ? withAlpha(colors.primary, 0.08 + intensity * 0.12)
                    : withAlpha(colors.text, isDark ? 0.035 : 0.03);

                return (
                  <Pressable
                    key={`${i}-${j}`}
                    onPress={() => {
                      setSelected(iso);
                      setMode("day");
                      setCursor(d);
                      doHaptic("medium");
                    }}
                    onLongPress={() => {
                      // long-press: select but stay in month
                      setSelected(iso);
                      setCursor(d);
                      doHaptic("light");
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 16,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active
                        ? withAlpha(colors.primary, 0.2)
                        : bg,
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 10,
                        backgroundColor: isToday
                          ? withAlpha(colors.primary, 0.16)
                          : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          color: inMonth ? colors.text : colors.muted,
                          fontWeight: isToday ? "900" : "800",
                        }}
                      >
                        {d.getDate()}
                      </Text>
                    </View>
                    <StackedBars flags={flags} palette={palette} />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {mode === "week" && (
        <View style={{ padding: 16, paddingTop: 4 }}>
          <WeekStrip />
        </View>
      )}

      {/* Day details */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
      >
        {mode === "day" && (
          <>
            <Text
              style={{
                color: colors.text,
                fontWeight: "900",
                fontSize: 18,
                marginBottom: 2,
              }}
            >
              {selected}
            </Text>

            {dayItems.length === 0 ? (
              <Card
                style={{
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: withAlpha(colors.text, isDark ? 0.04 : 0.03),
                }}
              >
                <Text style={{ color: colors.muted }}>
                  Nothing logged on this day.
                </Text>
              </Card>
            ) : (
              dayItems.map((it) => {
                const tint =
                  it.type === "workout"
                    ? palette.workout
                    : it.type === "exercise"
                    ? palette.exercise
                    : palette.meal;
                const iconName =
                  it.type === "workout"
                    ? "barbell-outline"
                    : it.type === "exercise"
                    ? "flame-outline"
                    : "fast-food-outline";
                return (
                  <Card
                    key={it.id}
                    style={{
                      padding: 14,
                      borderWidth: 1,
                      borderColor: withAlpha(tint, 0.35),
                      backgroundColor: withAlpha(tint, 0.1),
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: withAlpha(tint, 0.18),
                        borderWidth: 1,
                        borderColor: withAlpha(tint, 0.45),
                      }}
                    >
                      <Ionicons name={iconName as any} size={18} color={tint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "800" }}>
                        {it.title}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        {it.type.charAt(0).toUpperCase() + it.type.slice(1)}
                      </Text>
                    </View>
                  </Card>
                );
              })
            )}
          </>
        )}

        {/* Helpful hint */}
        {mode !== "day" && (
          <Text
            style={{
              textAlign: "center",
              color: colors.muted,
              marginTop: 2,
              fontSize: 12,
            }}
          >
            Tap a day to open details • Use the arrows to switch {mode}.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
