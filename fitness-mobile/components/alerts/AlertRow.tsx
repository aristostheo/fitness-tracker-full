import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, TextStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { withAlpha } from "@/lib/color";
import { AlertItem } from "./types";
import { formatTime } from "./logic";

type Props = {
  item: AlertItem;
  colors: any;
  isDark: boolean;
  reduceMotion: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

export function AlertRow({
  item,
  colors,
  isDark,
  reduceMotion,
  onPress,
  onLongPress,
}: Props) {
  const time = useMemo(() => formatTime(item.createdAt), [item.createdAt]);

  const accent = useMemo(() => {
    if (item.source === "friend")
      return withAlpha(colors.primary, isDark ? 0.95 : 0.9);
    return withAlpha(colors.text, isDark ? 0.9 : 0.85);
  }, [item.source, colors, isDark]);

  const icon = useMemo(() => getIcon(item), [item]);

  const unread = !item.read;

  const cardBorder = unread
    ? withAlpha(colors.primary, isDark ? 0.34 : 0.22)
    : colors.glassBorder ?? colors.border;

  const a11y = useMemo(() => {
    const who = item.actor?.name ? `From ${item.actor.name}. ` : "";
    const read = item.read ? "Read. " : "Unread. ";
    const when = `${time}. `;
    const body = item.body ? `${item.body}` : "";
    return `${read}${who}${item.title}. ${when}${body}`;
  }, [item, time]);

  const Wrapper: any = reduceMotion ? View : Animated.View;

  return (
    <Wrapper
      entering={reduceMotion ? undefined : FadeInDown.duration(260).springify()}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={300}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => [
          styles.pressWrap,
          { transform: [{ scale: pressed ? 0.992 : 1 }] },
        ]}
      >
        <LinearGradient
          colors={[
            withAlpha(colors.card, isDark ? 0.56 : 0.92),
            withAlpha(colors.card, isDark ? 0.34 : 0.78),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: cardBorder }]}
        >
          <BlurView
            intensity={isDark ? 22 : 14}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.row}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor: withAlpha(
                    item.source === "friend" ? colors.primary : colors.text,
                    isDark ? 0.14 : 0.08
                  ),
                  borderColor: withAlpha(
                    item.source === "friend" ? colors.primary : colors.text,
                    isDark ? 0.24 : 0.12
                  ),
                },
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Ionicons name={icon} size={18} color={accent} />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.titleRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.title,
                    {
                      color: colors.text,
                      opacity: item.read ? (isDark ? 0.82 : 0.88) : 1,
                    },
                  ]}
                >
                  {item.title}
                </Text>

                {unread ? (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: withAlpha(colors.primary, 0.95) },
                    ]}
                    accessibilityLabel="Unread"
                  />
                ) : null}
              </View>

              {!!item.body && (
                <Text
                  numberOfLines={2}
                  style={[
                    styles.body,
                    { color: colors.muted, opacity: item.read ? 0.85 : 1 },
                  ]}
                >
                  {item.body}
                </Text>
              )}

              <View style={styles.metaRow}>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {item.source === "friend" ? "Friend" : "App"}
                  {item.entity?.title ? ` • ${item.entity.title}` : ""}
                  {" • "}
                  {time}
                </Text>

                {item.actionable ? (
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: withAlpha(
                          colors.primary,
                          isDark ? 0.16 : 0.12
                        ),
                        borderColor: withAlpha(
                          colors.primary,
                          isDark ? 0.26 : 0.2
                        ),
                      },
                    ]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    <Text style={[styles.chipText, { color: colors.text }]}>
                      Open
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={12}
                      color={withAlpha(colors.text, 0.78)}
                    />
                  </View>
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={withAlpha(colors.muted, 0.75)}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                )}
              </View>
            </View>
          </View>

          <View
            style={[
              styles.sheen,
              { backgroundColor: withAlpha(colors.text, isDark ? 0.06 : 0.05) },
            ]}
          />
        </LinearGradient>
      </Pressable>
    </Wrapper>
  );
}

function getIcon(item: AlertItem): any {
  if (item.source === "friend") {
    switch (item.kind) {
      case "friend_cheer":
        return "heart-outline";
      case "friend_comment":
        return "chatbubble-ellipses-outline";
      case "friend_follow":
        return "person-add-outline";
      case "challenge_invite":
        return "trophy-outline";
      default:
        return "people-outline";
    }
  }
  switch (item.kind) {
    case "streak_milestone":
      return "flame-outline";
    case "workout_reminder":
      return "barbell-outline";
    case "nutrition_nudge":
      return "nutrition-outline";
    case "goal_progress":
      return "trending-up-outline";
    case "recovery_tip":
      return "bed-outline";
    default:
      return "notifications-outline";
  }
}

const styles = StyleSheet.create({
  pressWrap: { paddingHorizontal: 16 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    padding: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  body: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 17,
  } as TextStyle,
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  meta: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.15 },
  chip: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipText: { fontSize: 11.5, fontWeight: "900", letterSpacing: 0.2 },
  sheen: {
    position: "absolute",
    left: -30,
    right: -30,
    bottom: -26,
    height: 40,
    transform: [{ rotate: "-6deg" }],
    borderRadius: 999,
  },
});
