import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  FadeInDown,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";

const withAlpha = (hex: string, a: number) => {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${r},${g},${b},${alpha})`;
};

function monogram(name: string) {
  const s = (name || "").trim().replace(/\s+/g, " ");
  if (!s) return "WT";
  const parts = s.split(" ");
  const a = parts[0]?.[0] || "W";
  const b = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return (a + (b || "")).toUpperCase();
}

function daysAgoLabel(ms?: number) {
  if (!ms) return "";
  const d = Math.max(0, Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24)));
  if (d === 0) return "Last used today";
  if (d === 1) return "Last used 1d ago";
  return `Last used ${d}d ago`;
}

function toMs(value: any): number | undefined {
  if (!value) return undefined;
  if (typeof value === "number") return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  return undefined;
}

export type TemplateCardVM = {
  id: string;
  name: string;
  items?: Array<{ exercise?: string; name?: string; sets?: number }>;
  exercisesCount?: number;
  sets?: number;
  savedFrom?: string; // "Saved from workout" etc
  lastUsedAtMs?: number;
  lastUsedAt?: any;
  createdAt?: any;
  updatedAt?: any;
  tags?: string[];
  pinned?: boolean;
};

type Props = {
  title?: string; // default "Templates"
  templates: TemplateCardVM[];
  loading?: boolean;

  onViewAll?: () => void;

  onStartFromTemplate: (id: string) => void;

  // overflow actions
  onEdit?: (id: string) => void;
  onPinToggle?: (id: string, nextPinned: boolean) => void;
  onDelete?: (id: string) => void;

  // empty state CTA
  onCreateTemplate?: () => void;

  // how many shown in this row
  maxPreview?: number;
};

export function TemplatesSectionPremium({
  title = "Templates",
  templates,
  loading,
  onViewAll,
  onStartFromTemplate,
  onEdit,
  onPinToggle,
  onDelete,
  onCreateTemplate,
  maxPreview = 6,
}: Props) {
  const { colors, isDark } = useTheme();
  const accent = colors.primary ?? "#68D7FF";
  const accent2 = "#8B7CFF";

  const t1 = isDark ? withAlpha("#FFFFFF", 0.94) : withAlpha(colors.text, 0.94);
  const t2 = isDark ? withAlpha("#FFFFFF", 0.66) : withAlpha(colors.text, 0.64);
  const hair = isDark
    ? withAlpha("#FFFFFF", 0.12)
    : withAlpha(colors.text, 0.12);

  const viewAllColor = isDark
    ? withAlpha("#FFFFFF", 0.78)
    : withAlpha(colors.text, 0.74);

  const preview = useMemo(() => {
    const arr = (templates || []).slice(0, maxPreview);
    // pinned first (optional)
    return arr.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [templates, maxPreview]);

  return (
    <View style={{ marginTop: 8 }}>
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: t1 }]}>{title}</Text>

        {!!onViewAll && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web")
                Haptics.selectionAsync().catch(() => {});
              onViewAll();
            }}
            style={({ pressed }) => [
              styles.viewAll,
              pressed && { opacity: 0.75 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="View all templates"
          >
            <Text style={[styles.viewAllText, { color: viewAllColor }]}>
              View all
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={withAlpha(viewAllColor, 0.55)}
            />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 10, paddingRight: 8 }}
      >
        {loading ? (
          <>
            <TemplateCardSkeleton />
            <TemplateCardSkeleton />
            <TemplateCardSkeleton />
          </>
        ) : preview.length === 0 ? (
          <EmptyTemplateCard
            accent={accent}
            accent2={accent2}
            isDark={isDark}
            t1={t1}
            t2={t2}
            hair={hair}
            onCreateTemplate={onCreateTemplate}
          />
        ) : (
          preview.map((t) => (
            <TemplateCardPremium
              key={t.id}
              t={t}
              accent={accent}
              accent2={accent2}
              isDark={isDark}
              t1={t1}
              t2={t2}
              hair={hair}
              onStart={() => onStartFromTemplate(t.id)}
              onEdit={onEdit ? () => onEdit(t.id) : undefined}
              onPinToggle={
                onPinToggle ? () => onPinToggle(t.id, !t.pinned) : undefined
              }
              onDelete={onDelete ? () => onDelete(t.id) : undefined}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function TemplateCardPremium({
  t,
  accent,
  accent2,
  isDark,
  t1,
  t2,
  hair,
  onStart,
  onEdit,
  onPinToggle,
  onDelete,
}: {
  t: TemplateCardVM;
  accent: string;
  accent2: string;
  isDark: boolean;
  t1: string;
  t2: string;
  hair: string;
  onStart: () => void;
  onEdit?: () => void;
  onPinToggle?: () => void;
  onDelete?: () => void;
}) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const shimmer = useSharedValue(0);
  React.useEffect(() => {
    shimmer.value = 0;
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: isDark ? 0.55 : 0.38,
    transform: [{ translateX: -18 + shimmer.value * 36 }],
  }));

  const cardBg = isDark
    ? withAlpha("#FFFFFF", 0.06)
    : withAlpha("#FFFFFF", 0.86);
  const cardBorder = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha("#000000", 0.08);

  const thumbBg = isDark
    ? withAlpha("#000000", 0.24)
    : withAlpha("#FFFFFF", 0.6);

  const meta1 = useMemo(() => {
    const items = t.items || [];
    const derivedExercises = new Set(
      items
        .map((it) => String(it.exercise || it.name || "").trim().toLowerCase())
        .filter(Boolean)
    ).size;
    const derivedSets = items.reduce(
      (sum, it) => sum + Math.max(0, Number(it.sets || 0)),
      0
    );
    const ex = Math.max(
      0,
      Number(t.exercisesCount || derivedExercises || 0)
    );
    const sets = Math.max(0, Number(t.sets || derivedSets || 0));
    if (ex && sets) return `${ex} exercises • ${sets} sets`;
    if (ex) return `${ex} exercises`;
    if (sets) return `${sets} sets`;
    const tagLine = (t.tags || []).find((tag) => !!String(tag).trim());
    return t.savedFrom ? t.savedFrom : tagLine || "Saved template";
  }, [t.exercisesCount, t.items, t.savedFrom, t.sets, t.tags]);

  const meta2 = useMemo(() => {
    const stamp =
      t.lastUsedAtMs ??
      toMs(t.lastUsedAt) ??
      toMs(t.updatedAt) ??
      toMs(t.createdAt) ??
      undefined;
    const s = daysAgoLabel(stamp);
    return s || (t.pinned ? "Pinned" : "");
  }, [t.createdAt, t.lastUsedAt, t.lastUsedAtMs, t.pinned, t.updatedAt]);

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Animated.View entering={FadeInDown.duration(220)} style={{ marginRight: 12 }}>
      <Animated.View style={pressStyle}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web")
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                () => {}
              );
            onStart();
          }}
          onPressIn={() => {
            scale.value = withSpring(0.985, { damping: 18, stiffness: 260 });
            if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 18, stiffness: 260 });
          }}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: cardBg, borderColor: cardBorder },
            pressed && { opacity: 0.94 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Template ${t.name}. Tap to start.`}
        >
          <BlurView
            intensity={isDark ? 26 : 16}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />

          <LinearGradient
            colors={
              isDark
                ? [
                    withAlpha("#FFFFFF", 0.1),
                    withAlpha("#FFFFFF", 0.04),
                    withAlpha("#000000", 0.12),
                  ]
                : [
                    withAlpha(accent, 0.14),
                    withAlpha("#FFFFFF", 0.92),
                    withAlpha("#FFFFFF", 0.86),
                  ]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* overflow */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              setMenuOpen(true);
            }}
            hitSlop={10}
            style={({ pressed }) => [
              styles.more,
              {
                backgroundColor: withAlpha("#FFFFFF", isDark ? 0.06 : 0.55),
                borderColor: hair,
              },
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Template actions"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={16}
              color={withAlpha(t2, 0.95)}
            />
          </Pressable>

          {/* thumbnail */}
          <View style={styles.top}>
            <View
              style={[
                styles.thumb,
                { backgroundColor: thumbBg, borderColor: hair },
              ]}
            >
              <LinearGradient
                colors={[
                  withAlpha(accent, isDark ? 0.4 : 0.28),
                  withAlpha(accent2, isDark ? 0.26 : 0.18),
                  withAlpha("#FFFFFF", isDark ? 0.06 : 0.55),
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              {/* shimmer */}
              <Animated.View
                style={[styles.shimmer, shimmerStyle]}
                pointerEvents="none"
              />

              {/* watermark icon */}
              <Ionicons
                name="barbell-outline"
                size={22}
                color={withAlpha("#FFFFFF", isDark ? 0.18 : 0.14)}
                style={styles.watermark}
              />

              {/* monogram */}
              <Text style={[styles.mono, { color: withAlpha(t1, 0.92) }]}>
                {monogram(t.name)}
              </Text>

              {!!t.pinned && (
                <View
                  style={[
                    styles.pinBadge,
                    {
                      backgroundColor: withAlpha(accent2, 0.16),
                      borderColor: withAlpha(accent2, 0.26),
                    },
                  ]}
                >
                  <Ionicons
                    name="pin"
                    size={12}
                    color={withAlpha(accent2, 0.95)}
                  />
                </View>
              )}
            </View>

            {/* Play hint */}
            <View
              style={[
                styles.playHint,
                {
                  borderColor: hair,
                  backgroundColor: withAlpha("#000000", isDark ? 0.2 : 0.08),
                },
              ]}
            >
              <Ionicons name="play" size={12} color={withAlpha(t1, 0.85)} />
            </View>
          </View>

          <Text style={[styles.name, { color: t1 }]} numberOfLines={1}>
            {t.name}
          </Text>

          <Text style={[styles.meta, { color: t2 }]} numberOfLines={1}>
            {meta1}
          </Text>

          {!!meta2 && (
            <Text
              style={[styles.meta2, { color: withAlpha(t2, 0.85) }]}
              numberOfLines={1}
            >
              {meta2}
            </Text>
          )}

          <ActionMenu
            visible={menuOpen}
            onClose={() => setMenuOpen(false)}
            isDark={isDark}
            t1={t1}
            t2={t2}
            accent={accent}
            accent2={accent2}
            onEdit={onEdit}
            onPinToggle={onPinToggle}
            onDelete={onDelete}
          />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function EmptyTemplateCard({
  accent,
  accent2,
  isDark,
  t1,
  t2,
  hair,
  onCreateTemplate,
}: {
  accent: string;
  accent2: string;
  isDark: boolean;
  t1: string;
  t2: string;
  hair: string;
  onCreateTemplate?: () => void;
}) {
  const bg = isDark ? withAlpha("#FFFFFF", 0.05) : withAlpha("#FFFFFF", 0.82);
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        onCreateTemplate?.();
      }}
      style={({ pressed }) => [
        styles.card,
        { width: 240, backgroundColor: bg, borderColor: hair, marginRight: 12 },
        pressed && { opacity: 0.92 },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Create a template"
    >
      <BlurView
        intensity={isDark ? 22 : 14}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[
          withAlpha(accent2, isDark ? 0.18 : 0.12),
          withAlpha(accent, isDark ? 0.12 : 0.08),
          withAlpha("#FFFFFF", isDark ? 0.05 : 0.65),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: withAlpha("#000000", isDark ? 0.18 : 0.06),
            borderColor: hair,
          },
        ]}
      >
        <Ionicons name="add" size={18} color={withAlpha(t1, 0.92)} />
      </View>
      <Text style={[styles.name, { color: t1 }]}>No templates yet</Text>
      <Text style={[styles.meta, { color: t2 }]} numberOfLines={2}>
        Save a workout as a template to start faster.
      </Text>
      <View
        style={[
          styles.emptyCta,
          {
            borderColor: hair,
            backgroundColor: withAlpha("#FFFFFF", isDark ? 0.06 : 0.55),
          },
        ]}
      >
        <Text style={[styles.emptyCtaText, { color: withAlpha(t1, 0.9) }]}>
          Create template
        </Text>
        <Ionicons name="chevron-forward" size={14} color={withAlpha(t2, 0.8)} />
      </View>
    </Pressable>
  );
}

function TemplateCardSkeleton() {
  const { colors, isDark } = useTheme();
  const base = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const shine = isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.7)";

  const x = useSharedValue(0);
  React.useEffect(() => {
    x.value = 0;
    x.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [x]);

  const s = useAnimatedStyle(() => ({
    transform: [{ translateX: -30 + x.value * 60 }],
    opacity: isDark ? 0.55 : 0.35,
  }));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: base,
          borderColor: withAlpha(colors.text, 0.08),
          marginRight: 12,
        },
      ]}
    >
      <View style={[styles.skelThumb, { backgroundColor: base }]} />
      <View style={[styles.skelLine, { width: 140, backgroundColor: base }]} />
      <View
        style={[
          styles.skelLine,
          { width: 110, backgroundColor: base, marginTop: 8 },
        ]}
      />
      <Animated.View
        style={[styles.skelShine, { backgroundColor: shine }, s]}
      />
    </View>
  );
}

function ActionMenu({
  visible,
  onClose,
  isDark,
  t1,
  t2,
  accent,
  accent2,
  onEdit,
  onPinToggle,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  t1: string;
  t2: string;
  accent: string;
  accent2: string;
  onEdit?: () => void;
  onPinToggle?: () => void;
  onDelete?: () => void;
}) {
  if (!visible) return null;

  const bg = isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.18)";
  const cardBg = isDark
    ? withAlpha("#FFFFFF", 0.08)
    : withAlpha("#FFFFFF", 0.88);
  const border = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha("#000000", 0.1);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={[styles.menuBackdrop, { backgroundColor: bg }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          entering={FadeInDown.duration(180)}
          exiting={FadeOut.duration(140)}
          style={styles.menuWrap}
        >
          <BlurView
            intensity={isDark ? 34 : 24}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.menuCard,
              { backgroundColor: cardBg, borderColor: border },
            ]}
          >
            <Text style={[styles.menuTitle, { color: t1 }]}>Template</Text>
            <Text style={[styles.menuSub, { color: t2 }]}>Quick actions</Text>

            {!!onEdit && (
              <MenuRow
                icon="create-outline"
                label="Edit"
                tone={accent}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onClose();
                  onEdit();
                }}
              />
            )}
            {!!onPinToggle && (
              <MenuRow
                icon="pin-outline"
                label="Pin / Unpin"
                tone={accent2}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onClose();
                  onPinToggle();
                }}
              />
            )}
            {!!onDelete && (
              <MenuRow
                icon="trash-outline"
                label="Delete"
                tone="#FF5A5F"
                destructive
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                    () => {}
                  );
                  onClose();
                  onDelete();
                }}
              />
            )}
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MenuRow({
  icon,
  label,
  tone,
  destructive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.9 }]}
    >
      <View
        style={[
          styles.menuIcon,
          {
            backgroundColor: withAlpha(tone, 0.16),
            borderColor: withAlpha(tone, 0.28),
          },
        ]}
      >
        <Ionicons name={icon} size={16} color={withAlpha(tone, 0.95)} />
      </View>
      <Text
        style={[
          styles.menuRowText,
          {
            color: destructive
              ? withAlpha("#FF5A5F", 0.95)
              : withAlpha("#FFFFFF", 0.92),
          },
        ]}
      >
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={withAlpha("#FFFFFF", 0.4)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", letterSpacing: 0.4 },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  viewAllText: { fontSize: 13, fontWeight: "850" as any },

  card: {
    width: 220,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    overflow: "hidden",
  },

  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  more: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  thumb: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  watermark: { position: "absolute", right: -6, bottom: -8 },
  shimmer: {
    position: "absolute",
    width: 26,
    height: 80,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    left: 0,
    top: -10,
  },
  mono: { fontSize: 16, fontWeight: "950" as any, letterSpacing: -0.2 },

  pinBadge: {
    position: "absolute",
    left: 6,
    top: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },

  playHint: {
    position: "absolute",
    left: 12,
    top: 54,
    transform: [{ translateY: -10 }],
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "950" as any,
    letterSpacing: -0.15,
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "750" as any,
    lineHeight: 16,
  },
  meta2: { marginTop: 4, fontSize: 11, fontWeight: "750" as any },

  emptyCta: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptyCtaText: { fontSize: 12, fontWeight: "950" as any },

  skelThumb: { width: 54, height: 54, borderRadius: 16 },
  skelLine: { height: 10, borderRadius: 10, marginTop: 12 },
  skelShine: { position: "absolute", top: 0, bottom: 0, width: 28 },

  // menu
  menuBackdrop: { flex: 1, justifyContent: "flex-end" },
  menuWrap: { padding: 14, paddingBottom: 16 },
  menuCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    overflow: "hidden",
  },
  menuTitle: { fontSize: 16, fontWeight: "950" as any, letterSpacing: -0.2 },
  menuSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700" as any,
    lineHeight: 16,
  },

  menuRow: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  menuRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "950" as any,
    letterSpacing: -0.2,
  },
});
