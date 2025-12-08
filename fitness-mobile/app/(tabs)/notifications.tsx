// app/(tabs)/notifications.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { useAuth } from "@/content/AuthContext";
import { useTheme } from "@/content/ThemeProvider";
import {
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/services/notifications";
import Card from "@/components/Card";
import BottomTabSpacer from "@/components/ui/BottomTapSpacer";
import { GradientButton } from "@/components/workouts/ui/GradientButton";
import { withAlpha } from "@/components/workouts/utils/withAlpha";

const ribbons = [
  ["#5ce1ff", "#ff5ac8"],
  ["#8cfb9f", "#ffc857"],
];

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const uid = user?.uid ?? "__demo__";

  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeNotifications(user.uid, setItems, { max: 80 });
    return () => unsub && unsub();
  }, [user?.uid]);

  const unreadCount = items.filter((n) => !n.readAt).length;

  async function handleRead(id: string) {
    if (!user?.uid) return;
    await markNotificationRead(user.uid, id);
  }

  async function handleReadAll() {
    if (!user?.uid) return;
    await markAllNotificationsRead(user.uid);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
    >
      <Ribbon side="right" colors={ribbons[0]} opacity={isDark ? 0.2 : 0.26} />
      <Ribbon side="left" top={280} colors={ribbons[1]} opacity={isDark ? 0.16 : 0.22} />

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
            gap: 10,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>
            Notifications
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>
            Friend pings, meal nudges, requests, and streak reminders in one feed.
          </Text>

          <GradientButton
            label={
              unreadCount
                ? `Mark ${unreadCount} as read`
                : items.length
                ? "All caught up"
                : "Waiting for updates..."
            }
            disabled={!unreadCount}
            onPress={handleReadAll}
          />
        </LinearGradient>
      </MotiView>

      <Card
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
        }}
      >
        {items.length === 0 ? (
          <EmptyLine label="No notifications yet" />
        ) : (
          items.map((n) => (
            <NotificationRow
              key={n.id}
              note={n}
              onRead={() => handleRead(n.id)}
            />
          ))
        )}
      </Card>

      <BottomTabSpacer extra={20} />
    </ScrollView>
  );
}

function NotificationRow({
  note,
  onRead,
}: {
  note: AppNotification;
  onRead: () => void;
}) {
  const { colors } = useTheme();
  const unread = !note.readAt;
  const icon =
    note.type === "friend:request"
      ? "person-add-outline"
      : note.type === "friend:accepted"
      ? "people-outline"
      : note.type === "ping"
      ? "notifications-outline"
      : "information-circle-outline";

  return (
    <View
      style={{
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: withAlpha(colors.border, unread ? 1 : 0.7),
        backgroundColor: withAlpha(
          unread ? colors.primary : colors.card,
          unread ? 0.12 : 0.96
        ),
        gap: 8,
      }}
    >
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
          <Ionicons name={icon as any} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>{note.title}</Text>
          {note.body ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>{note.body}</Text>
          ) : null}
        </View>
        {unread ? (
          <Pressable onPress={onRead}>
            {({ pressed }) => (
              <MotiView
                animate={{ scale: pressed ? 0.95 : 1 }}
                transition={{ type: "timing", duration: 140 }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: withAlpha(colors.primary, 0.5),
                  backgroundColor: withAlpha(colors.primary, 0.14),
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: "800" }}>
                  Mark read
                </Text>
              </MotiView>
            )}
          </Pressable>
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
  colors: string[];
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
