// app/friends/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import Card from "@/components/Card";
import BottomTabSpacer from "@/components/ui/BottomTapSpacer";
import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { withAlpha } from "@/components/workouts/utils/withAlpha";
import { subscribeFoodsByDate, type FoodEntry } from "@/services/nutrition";
import { GradientButton } from "@/components/workouts/ui/GradientButton";
import {
  addComment,
  removeReaction,
  subscribeComments,
  subscribeReactions,
  toggleReaction,
  type Comment,
  type Reaction,
} from "@/services/social";
import { notifyComment, notifyReaction } from "@/services/notifications";

type MealKey = "breakfast" | "lunch" | "dinner" | "snacks";
const MEAL_ORDER: MealKey[] = ["breakfast", "lunch", "dinner", "snacks"];

const softShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

export default function FriendDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const friendUid = (id || "").toString();
  const friendName = (name || "").toString();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const todayISO = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
      t.getDate()
    ).padStart(2, "0")}`;
  }, []);

  const datePills = useMemo(() => {
    const days = [];
    const base = new Date(todayISO + "T00:00:00");
    for (let i = 0; i < 10; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      days.push(iso);
    }
    return days;
  }, [todayISO]);

  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Stream meals for selected day
  useEffect(() => {
    if (!friendUid || !user?.uid) {
      setFoods([]);
      return;
    }
    setLoading(true);
    const unsub = subscribeFoodsByDate(friendUid, selectedDate, (rows) => {
      setFoods(rows || []);
      setLoading(false);
    });
    return () => {
      try {
        unsub && unsub();
      } catch {}
    };
  }, [friendUid, selectedDate, user?.uid]);

  const totals = useMemo(() => {
    return foods.reduce(
      (acc, f) => {
        acc.calories += Number(f.calories || 0);
        acc.protein += Number(f.protein || 0);
        acc.carbs += Number(f.carbs || 0);
        acc.fat += Number(f.fat || 0);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [foods]);

  const grouped = useMemo(() => {
    return MEAL_ORDER.map((meal) => ({
      meal,
      items: foods.filter((f) => (f.meal || "").toLowerCase() === meal),
    }));
  }, [foods]);

  const title = friendName || friendUid || "Friend";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
    >
      <Ribbon side="right" colors={["#5ce1ff", "#ff5ac8"] as const} opacity={isDark ? 0.2 : 0.26} />
      <Ribbon side="left" top={260} colors={["#8cfb9f", "#ffc857"] as const} opacity={isDark ? 0.16 : 0.22} />

      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 420 }}
      >
        <LinearGradient
          colors={[withAlpha(colors.primary, 0.22), colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 22,
            padding: 16,
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.35),
            gap: 12,
            ...softShadow,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>
            {title}
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>
            Browse {title}'s meals by day. Tap a date to explore their nutrition.
          </Text>
          <GradientButton label="Back to alerts" onPress={() => router.push("/notifications")} />
        </LinearGradient>
      </MotiView>

      {/* Date pills */}
      <Card
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 8,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "800", marginBottom: 4 }}>
          Pick a day
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {datePills.map((d) => {
            const isActive = d === selectedDate;
            const dateObj = new Date(d + "T00:00:00");
            const label = dateObj.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            const weekday = dateObj.toLocaleDateString(undefined, { weekday: "short" });
            return (
              <Pressable key={d} onPress={() => setSelectedDate(d)}>
                {({ pressed }) => (
                  <MotiView
                    animate={{
                      scale: pressed ? 0.97 : 1,
                      translateY: pressed ? 1 : 0,
                    }}
                    transition={{ type: "timing", duration: 140 }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: withAlpha(
                        isActive ? colors.primary : colors.card,
                        isActive ? 0.18 : 0.96
                      ),
                      gap: 2,
                      minWidth: 88,
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "900", fontSize: 13 }}>
                      {weekday}
                    </Text>
                    <Text style={{ color: colors.muted, fontWeight: "700" }}>{label}</Text>
                  </MotiView>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </Card>

      {/* Totals */}
      <Card
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 8,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "800" }}>
          {selectedDate} snapshot
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <StatPill label="Calories" value={`${Math.round(totals.calories)} kcal`} color={colors.primary} />
          <StatPill label="Protein" value={`${Math.round(totals.protein)} g`} color={colors.chartPrimary || colors.primary} />
          <StatPill label="Carbs" value={`${Math.round(totals.carbs)} g`} color={colors.chartSecondary || colors.primary} />
          <StatPill label="Fat" value={`${Math.round(totals.fat)} g`} color={colors.chartSecondary || colors.primary} />
        </View>
      </Card>

      {/* Meals */}
      {loading ? (
        <Card
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.muted, marginTop: 8 }}>Loading meals...</Text>
        </Card>
      ) : (
        grouped.map((group) => (
          <Card
            key={group.meal}
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 10,
            }}
          >
            <SectionHeader
              icon={iconForMeal(group.meal)}
              title={titleForMeal(group.meal)}
              subtitle={group.items.length ? `${group.items.length} items` : "No items"}
            />
            {group.items.length === 0 ? (
              <EmptyLine label="No meals logged" />
            ) : (
              <View style={{ gap: 10 }}>
                {group.items.map((item) => (
                  <MealRow
                    key={item.id}
                    item={item}
                    colors={colors}
                    friendUid={friendUid}
                    actorUid={user?.uid}
                    actorName={user?.displayName || user?.email || null}
                  />
                ))}
              </View>
            )}
          </Card>
        ))
      )}

      <BottomTabSpacer extra={20} />
    </ScrollView>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: withAlpha(colors.primary, 0.16),
          borderWidth: 1,
          borderColor: withAlpha(colors.primary, 0.35),
        }}
      >
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.muted, fontSize: 13 }}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

function EmptyLine({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.8),
        backgroundColor: withAlpha(colors.card, 0.9),
      }}
    >
      <Text style={{ color: colors.muted }}>{label}</Text>
    </View>
  );
}

function Ribbon({
  side,
  colors,
  top = -50,
  opacity = 0.2,
}: {
  side: "left" | "right";
  colors: readonly [string, string];
  top?: number;
  opacity?: number;
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        position: "absolute",
        [side]: -70,
        top,
        width: 220,
        height: 220,
        borderRadius: 120,
        opacity,
        transform: [{ rotate: side === "left" ? "-14deg" : "16deg" }],
      }}
    />
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: withAlpha(color, 0.5),
        backgroundColor: withAlpha(color, 0.12),
      }}
    >
      <Text style={{ color: withAlpha(color, 0.8), fontWeight: "700", fontSize: 12 }}>
        {label}
      </Text>
      <Text style={{ color: color, fontWeight: "900", fontSize: 16 }}>{value}</Text>
    </View>
  );
}

function MealRow({
  item,
  colors,
  friendUid,
  actorUid,
  actorName,
}: {
  item: FoodEntry;
  colors: any;
  friendUid: string;
  actorUid?: string | null;
  actorName?: string | null;
}) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  const targetId = item.id ?? (item as any)?.docId ?? item.name;

  useEffect(() => {
    if (!friendUid || !targetId) return;
    const unsub = subscribeReactions(friendUid, String(targetId), setReactions);
    return () => {
      try {
        unsub && unsub();
      } catch {}
    };
  }, [friendUid, targetId]);

  useEffect(() => {
    if (!friendUid || !targetId) return;
    const unsub = subscribeComments(friendUid, String(targetId), setComments);
    return () => {
      try {
        unsub && unsub();
      } catch {}
    };
  }, [friendUid, targetId]);

  const myReaction = reactions.find((r) => r.createdByUid === actorUid);
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    reactions.forEach((r) => {
      map[r.kind] = (map[r.kind] || 0) + 1;
    });
    return map;
  }, [reactions]);

  const handleReact = async (kind: Reaction["kind"]) => {
    if (!actorUid || !friendUid || !targetId) return;
    const wasSame = myReaction && myReaction.kind === kind;
    try {
      if (wasSame) {
        await removeReaction(friendUid, String(targetId), actorUid);
      } else {
        await toggleReaction(friendUid, String(targetId), kind, {
          uid: actorUid,
          displayName: actorName ?? undefined,
        });
        await notifyReaction(friendUid, {
          fromUid: actorUid,
          fromName: actorName ?? undefined,
          targetId: String(targetId),
          targetLabel: item.name || "Meal",
          kind,
        });
      }
    } catch (e: any) {
      Alert.alert("Couldn't react", e?.message || "Unknown error");
    }
  };

  const handleComment = async () => {
    if (!actorUid || !commentText.trim() || !friendUid || !targetId) return;
    try {
      await addComment(friendUid, String(targetId), commentText, {
        uid: actorUid,
        displayName: actorName ?? undefined,
      });
      await notifyComment(friendUid, {
        fromUid: actorUid,
        fromName: actorName ?? undefined,
        targetId: String(targetId),
        targetLabel: item.name || "Meal",
        text: commentText,
      });
      setCommentText("");
    } catch (e: any) {
      Alert.alert("Couldn't comment", e?.message || "Unknown error");
    }
  };

  const macroChip = (label: string, val: number, suffix = "g") => (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: withAlpha(colors.text, 0.06),
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.9),
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "800" }}>
        {label}: {Math.round(val)} {suffix}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.9),
        backgroundColor: withAlpha(colors.card, 0.96),
        borderRadius: 14,
        padding: 12,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(colors.primary, 0.16),
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.35),
          }}
        >
          <Ionicons name="fast-food-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>
            {item.name || "Meal item"}
          </Text>
          <Text style={{ color: colors.muted }}>
            {item.qty} {item.unit || "serving"} • {Math.round(item.calories || 0)} kcal
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {macroChip("P", Number(item.protein || 0))}
        {macroChip("C", Number(item.carbs || 0))}
        {macroChip("F", Number(item.fat || 0))}
      </View>

      {/* Reactions */}
      {targetId ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
          }}
        >
          {[
            { kind: "like" as const, icon: "thumbs-up-outline" },
            { kind: "fire" as const, icon: "flame-outline" },
            { kind: "clap" as const, icon: "hand-left-outline" },
          ].map((btn) => {
            const active = myReaction?.kind === btn.kind;
            return (
              <Pressable key={btn.kind} onPress={() => handleReact(btn.kind)}>
                {({ pressed }) => (
                  <MotiView
                    animate={{ scale: pressed ? 0.95 : 1 }}
                    transition={{ type: "timing", duration: 140 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: withAlpha(colors.primary, active ? 0.8 : 0.35),
                      backgroundColor: withAlpha(
                        colors.primary,
                        active ? 0.18 : 0.1
                      ),
                    }}
                  >
                    <Ionicons
                      name={btn.icon as any}
                      size={16}
                      color={active ? colors.primary : colors.muted}
                    />
                    <Text
                      style={{
                        color: active ? colors.text : colors.muted,
                        fontWeight: "800",
                      }}
                    >
                      {counts[btn.kind] || 0}
                    </Text>
                  </MotiView>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Comments */}
      {targetId ? (
        <View style={{ gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Say something nice..."
              placeholderTextColor={withAlpha(colors.text, 0.6)}
              style={{
                flex: 1,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: withAlpha(colors.card, 0.96),
              }}
            />
            <Pressable onPress={handleComment} disabled={!commentText.trim()}>
              {({ pressed }) => (
                <MotiView
                  animate={{ scale: pressed ? 0.96 : 1 }}
                  transition={{ type: "timing", duration: 120 }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: withAlpha(
                      colors.primary,
                      commentText.trim() ? 0.22 : 0.12
                    ),
                    borderWidth: 1,
                    borderColor: withAlpha(colors.primary, 0.5),
                    opacity: commentText.trim() ? 1 : 0.6,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: "800" }}>
                    Post
                  </Text>
                </MotiView>
              )}
            </Pressable>
          </View>

          {comments.length ? (
            <View style={{ gap: 6 }}>
              {comments.slice(0, 3).map((c) => (
                <View
                  key={c.id}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.border, 0.9),
                    backgroundColor: withAlpha(colors.text, 0.04),
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: "800" }}>
                    {c.createdByName || "Friend"}
                  </Text>
                  <Text style={{ color: colors.muted, marginTop: 2 }}>
                    {c.text}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.muted }}>No comments yet</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function iconForMeal(meal?: string) {
  switch ((meal || "").toLowerCase()) {
    case "breakfast":
      return "sunny-outline";
    case "lunch":
      return "restaurant-outline";
    case "dinner":
      return "moon-outline";
    default:
      return "fast-food-outline";
  }
}

function titleForMeal(meal?: string) {
  const m = (meal || "").toLowerCase();
  if (m === "breakfast") return "Breakfast";
  if (m === "lunch") return "Lunch";
  if (m === "dinner") return "Dinner";
  return "Snacks";
}
