// // app/(tabs)/notifications.tsx
// import React, { useEffect, useState } from "react";
// import { View, Text, Pressable, ScrollView } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
// import { MotiView } from "moti";
// import { useAuth } from "@/content/AuthContext";
// import { useTheme } from "@/content/ThemeProvider";
// import { Link } from "expo-router";
// import {
//   subscribeNotifications,
//   markNotificationRead,
//   markAllNotificationsRead,
//   type AppNotification,
// } from "@/services/notifications";
// import Card from "@/components/Card";
// import BottomTabSpacer from "@/components/ui/BottomTapSpacer";
// import { GradientButton } from "@/components/workouts/ui/GradientButton";
// import { withAlpha } from "@/components/workouts/utils/withAlpha";

// const ribbons = [
//   ["#5ce1ff", "#ff5ac8"],
//   ["#8cfb9f", "#ffc857"],
// ];

// export default function NotificationsScreen() {
//   const { user } = useAuth();
//   const { colors, isDark } = useTheme();
//   const uid = user?.uid ?? "__demo__";

//   const [items, setItems] = useState<AppNotification[]>([]);

//   useEffect(() => {
//     if (!user?.uid) return;
//     const unsub = subscribeNotifications(user.uid, setItems, { max: 80 });
//     return () => unsub && unsub();
//   }, [user?.uid]);

//   const unreadCount = items.filter((n) => !n.readAt).length;

//   async function handleRead(id: string) {
//     if (!user?.uid) return;
//     await markNotificationRead(user.uid, id);
//   }

//   async function handleReadAll() {
//     if (!user?.uid) return;
//     await markAllNotificationsRead(user.uid);
//   }

//   return (
//     <ScrollView
//       style={{ flex: 1, backgroundColor: colors.background }}
//       contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
//     >
//       <Ribbon side="right" colors={ribbons[0]} opacity={isDark ? 0.2 : 0.26} />
//       <Ribbon side="left" top={280} colors={ribbons[1]} opacity={isDark ? 0.16 : 0.22} />

//       <MotiView
//         from={{ opacity: 0, translateY: 10 }}
//         animate={{ opacity: 1, translateY: 0 }}
//         transition={{ type: "timing", duration: 420 }}
//       >
//         <LinearGradient
//           colors={[withAlpha(colors.primary, 0.22), colors.card]}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 1 }}
//           style={{
//             borderRadius: 22,
//             padding: 16,
//             borderWidth: 1,
//             borderColor: withAlpha(colors.primary, 0.35),
//             gap: 10,
//           }}
//         >
//           <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
//             <View style={{ flex: 1, minWidth: 0 }}>
//               <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>
//                 Alerts
//               </Text>
//               <Text style={{ color: colors.muted, fontWeight: "600" }}>
//                 Friend pings, requests, meal nudges, and streak reminders.
//               </Text>
//             </View>
//             <Link href="/friends" asChild>
//               <Pressable>
//                 {({ pressed }) => (
//                   <MotiView
//                     animate={{ scale: pressed ? 0.95 : 1 }}
//                     transition={{ type: "timing", duration: 140 }}
//                     style={{
//                       paddingHorizontal: 12,
//                       paddingVertical: 10,
//                       borderRadius: 12,
//                       borderWidth: 1,
//                       borderColor: withAlpha(colors.primary, 0.35),
//                       backgroundColor: withAlpha(colors.primary, 0.12),
//                       flexDirection: "row",
//                       alignItems: "center",
//                       gap: 6,
//                     }}
//                   >
//                     <Ionicons name="people-outline" size={16} color={colors.primary} />
//                     <Text style={{ color: colors.primary, fontWeight: "800" }}>
//                       Friends
//                     </Text>
//                   </MotiView>
//                 )}
//               </Pressable>
//             </Link>
//           </View>

//           <GradientButton
//             label={
//               unreadCount
//                 ? `Mark ${unreadCount} as read`
//                 : items.length
//                 ? "All caught up"
//                 : "Waiting for updates..."
//             }
//             disabled={!unreadCount}
//             onPress={handleReadAll}
//           />
//         </LinearGradient>
//       </MotiView>

//       <Card
//         style={{
//           padding: 12,
//           borderWidth: 1,
//           borderColor: colors.border,
//           gap: 10,
//         }}
//       >
//         {items.length === 0 ? (
//           <EmptyLine label="No notifications yet" />
//         ) : (
//           items.map((n) => (
//             <NotificationRow
//               key={n.id}
//               note={n}
//               onRead={() => handleRead(n.id)}
//             />
//           ))
//         )}
//       </Card>

//       <BottomTabSpacer extra={20} />
//     </ScrollView>
//   );
// }

// function NotificationRow({
//   note,
//   onRead,
// }: {
//   note: AppNotification;
//   onRead: () => void;
// }) {
//   const { colors } = useTheme();
//   const unread = !note.readAt;
//   const icon =
//     note.type === "friend:request"
//       ? "person-add-outline"
//       : note.type === "friend:accepted"
//       ? "people-outline"
//       : note.type === "ping"
//       ? "notifications-outline"
//       : "information-circle-outline";

//   return (
//     <View
//       style={{
//         padding: 12,
//         borderRadius: 14,
//         borderWidth: 1,
//         borderColor: withAlpha(colors.border, unread ? 1 : 0.7),
//         backgroundColor: withAlpha(
//           unread ? colors.primary : colors.card,
//           unread ? 0.12 : 0.96
//         ),
//         gap: 8,
//       }}
//     >
//       <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
//         <View
//           style={{
//             width: 32,
//             height: 32,
//             borderRadius: 10,
//             alignItems: "center",
//             justifyContent: "center",
//             backgroundColor: withAlpha(colors.primary, 0.16),
//             borderWidth: 1,
//             borderColor: withAlpha(colors.primary, 0.35),
//           }}
//         >
//           <Ionicons name={icon as any} size={18} color={colors.primary} />
//         </View>
//         <View style={{ flex: 1 }}>
//           <Text style={{ color: colors.text, fontWeight: "800" }}>{note.title}</Text>
//           {note.body ? (
//             <Text style={{ color: colors.muted, fontSize: 13 }}>{note.body}</Text>
//           ) : null}
//         </View>
//         {unread ? (
//           <Pressable onPress={onRead}>
//             {({ pressed }) => (
//               <MotiView
//                 animate={{ scale: pressed ? 0.95 : 1 }}
//                 transition={{ type: "timing", duration: 140 }}
//                 style={{
//                   paddingHorizontal: 10,
//                   paddingVertical: 8,
//                   borderRadius: 10,
//                   borderWidth: 1,
//                   borderColor: withAlpha(colors.primary, 0.5),
//                   backgroundColor: withAlpha(colors.primary, 0.14),
//                 }}
//               >
//                 <Text style={{ color: colors.primary, fontWeight: "800" }}>
//                   Mark read
//                 </Text>
//               </MotiView>
//             )}
//           </Pressable>
//         ) : null}
//       </View>
//     </View>
//   );
// }

// function EmptyLine({ label }: { label: string }) {
//   const { colors } = useTheme();
//   return (
//     <View
//       style={{
//         padding: 12,
//         borderRadius: 12,
//         borderWidth: 1,
//         borderColor: withAlpha(colors.border, 0.8),
//         backgroundColor: withAlpha(colors.card, 0.9),
//       }}
//     >
//       <Text style={{ color: colors.muted }}>{label}</Text>
//     </View>
//   );
// }

// function Ribbon({
//   side,
//   colors,
//   top = -50,
//   opacity = 0.2,
// }: {
//   side: "left" | "right";
//   colors: string[];
//   top?: number;
//   opacity?: number;
// }) {
//   return (
//     <LinearGradient
//       colors={colors}
//       start={{ x: 0, y: 0 }}
//       end={{ x: 1, y: 1 }}
//       style={{
//         position: "absolute",
//         [side]: -70,
//         top,
//         width: 220,
//         height: 220,
//         borderRadius: 120,
//         opacity,
//         transform: [{ rotate: side === "left" ? "-14deg" : "16deg" }],
//       }}
//     />
//   );
// }

// app/(tabs)/alerts.tsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  RefreshControl,
  AccessibilityInfo,
  Alert as RNAlert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { withAlpha } from "@/lib/color";

import {
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/services/notifications";

import { AlertItem } from "@/components/alerts/types";
import { buildSectionsFromAlerts } from "@/components/alerts/logic";
import { AlertsSectionHeader } from "@/components/alerts/AlertsSectionHeader";
import { AlertRow } from "@/components/alerts/AlertRow";
import { AlertsEmptyState } from "@/components/alerts/AlertsEmptyState";
import {
  adaptNotificationsToAlertItems,
  defaultPressRouteForAlert,
} from "@/components/alerts/adapter";

export default function AlertsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme() as any;

  const [reduceMotion, setReduceMotion] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [raw, setRaw] = useState<AppNotification[]>([]);

  // ✅ Subscribe to backend notifications (same as old page)
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeNotifications(user.uid, setRaw, { max: 80 });
    return () => unsub && unsub();
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      AccessibilityInfo.isReduceMotionEnabled()
        .then((v) => mounted && setReduceMotion(!!v))
        .catch(() => {});
      return () => {
        mounted = false;
      };
    }, [])
  );

  // ✅ Convert backend data → new UI model
  const alerts: AlertItem[] = useMemo(
    () => adaptNotificationsToAlertItems(raw),
    [raw]
  );

  const softShadow = useMemo(
    () => ({
      shadowColor: colors.shadow ?? "#000",
      shadowOpacity: isDark ? 0.35 : 0.12,
      shadowRadius: isDark ? 22 : 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: isDark ? 10 : 6,
    }),
    [isDark, colors.shadow]
  );

  const sections = useMemo(() => buildSectionsFromAlerts(alerts), [alerts]);

  const unreadCount = useMemo(
    () => raw.reduce((n, a) => n + (a.readAt ? 0 : 1), 0),
    [raw]
  );

  const onRefresh = useCallback(async () => {
    // You already have realtime subscription; refresh is mostly a calm affordance.
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 450));
    setRefreshing(false);
  }, []);

  // ✅ Backend mark all read (same as old page)
  const markAllRead = useCallback(async () => {
    if (!user?.uid) return;
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    try {
      await markAllNotificationsRead(user.uid);
    } catch (e) {
      RNAlert.alert("Couldn’t mark all as read", "Please try again.");
    }
  }, [user?.uid]);

  const openFriends = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push("/friends");
  }, [router]);

  // ✅ On press: mark read in backend + route
  const onPressAlert = useCallback(
    async (item: AlertItem) => {
      if (!user?.uid) return;

      // mark read first (quiet + consistent)
      try {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        await markNotificationRead(user.uid, item.id);
      } catch {
        // still allow navigation; do not punish the user
      }

      // route based on alert context
      const route = defaultPressRouteForAlert(item);
      if (route === "friends") router.push("/friends");
      else if (route === "workouts") router.push("/workouts");
      else if (route === "nutrition") router.push("/nutrition");
      else if (route === "goals") router.push("/goals");
      else router.push("/profile");
    },
    [router, user?.uid]
  );

  const onLongPressAlert = useCallback(
    (item: AlertItem) => {
      if (!user?.uid) return;

      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      const rawItem = raw.find((r) => r.id === item.id);
      const isRead = !!rawItem?.readAt;

      RNAlert.alert(
        "Alert options",
        undefined,
        [
          {
            text: isRead ? "Mark as unread" : "Mark as read",
            onPress: async () => {
              try {
                if (isRead) {
                  // If you don’t have a backend “mark unread”, we can only support “mark read”.
                  RNAlert.alert(
                    "Not available",
                    "Marking unread isn’t wired yet. Add a `markNotificationUnread` service if you want this."
                  );
                } else {
                  await markNotificationRead(user.uid, item.id);
                }
              } catch {
                RNAlert.alert("Couldn’t update", "Please try again.");
              }
            },
          },
          {
            text: "Mute this type",
            onPress: () =>
              RNAlert.alert(
                "Muted",
                "You’ll see fewer alerts like this. (Wire to prefs later.)"
              ),
          },
          { text: "Cancel", style: "cancel" },
        ],
        { cancelable: true }
      );
    },
    [raw, user?.uid]
  );

  const header = useMemo(() => {
    const border = colors.glassBorder ?? colors.border;
    const hair = StyleSheet.hairlineWidth;

    return (
      <View
        style={{ paddingHorizontal: 16, paddingTop: 30, paddingBottom: 20 }}
      >
        <View style={styles.topRow}>
          <View style={{ gap: 2 }}>
            <Text style={[styles.title, { color: colors.text }]}>Alerts</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              onPress={openFriends}
              accessibilityRole="button"
              accessibilityLabel="Open friends"
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  borderColor: border,
                  backgroundColor: pressed
                    ? withAlpha(colors.surface2, isDark ? 0.8 : 0.95)
                    : colors.glass,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
                softShadow,
              ]}
            >
              <Ionicons name="people-outline" size={18} color={colors.text} />
            </Pressable>

            <Pressable
              onPress={markAllRead}
              disabled={unreadCount === 0}
              accessibilityRole="button"
              accessibilityLabel="Mark all alerts as read"
              style={({ pressed }) => [
                styles.pillBtn,
                {
                  opacity: unreadCount === 0 ? 0.55 : 1,
                  borderColor: border,
                  backgroundColor: pressed
                    ? withAlpha(colors.surface2, isDark ? 0.8 : 0.95)
                    : colors.glass,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                },
                softShadow,
              ]}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={16}
                color={colors.text}
              />
              <Text style={[styles.pillText, { color: colors.text }]}>
                Mark all
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <LinearGradient
            colors={[
              withAlpha(colors.primary, isDark ? 0.22 : 0.14),
              withAlpha(colors.card, isDark ? 0.38 : 0.78),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.hintCard,
              { borderColor: withAlpha(colors.primary, isDark ? 0.32 : 0.18) },
              softShadow,
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={[
                  styles.hintIcon,
                  {
                    backgroundColor: withAlpha(
                      colors.primary,
                      isDark ? 0.22 : 0.14
                    ),
                    borderColor: withAlpha(
                      colors.primary,
                      isDark ? 0.32 : 0.18
                    ),
                  },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={16}
                  color={withAlpha(colors.text, isDark ? 0.95 : 0.9)}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.hintTitle, { color: colors.text }]}>
                  Calm by design
                </Text>
                <Text style={[styles.hintBody, { color: colors.muted }]}>
                  Friend updates feel personal; app alerts stay quiet and
                  actionable.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View
          style={{
            marginTop: 14,
            height: hair,
            backgroundColor: withAlpha(colors.text, isDark ? 0.12 : 0.08),
          }}
        />
      </View>
    );
  }, [colors, isDark, unreadCount, openFriends, markAllRead, softShadow]);

  // flatten sections for FlatList
  const rows = useMemo(() => {
    const out: Array<
      | { type: "section"; key: string; title: string; subtitle?: string }
      | { type: "alert"; key: string; item: AlertItem }
    > = [];

    sections.forEach((s) => {
      out.push({
        type: "section",
        key: `section:${s.id}`,
        title: s.title,
        subtitle: s.subtitle,
      });
      s.items.forEach((a) => out.push({ type: "alert", key: a.id, item: a }));
    });

    return out;
  }, [sections]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <BlurView
        intensity={isDark ? 28 : 18}
        tint={isDark ? "dark" : "light"}
        style={styles.topBlur}
      />

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.muted}
          />
        }
        renderItem={({ item }) => {
          if (item.type === "section") {
            return (
              <AlertsSectionHeader
                title={item.title}
                subtitle={item.subtitle}
              />
            );
          }
          return (
            <AlertRow
              item={item.item}
              colors={colors}
              isDark={isDark}
              reduceMotion={reduceMotion}
              onPress={() => onPressAlert(item.item)}
              onLongPress={() => onLongPressAlert(item.item)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 30 }}>
            <AlertsEmptyState colors={colors} isDark={isDark} />
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBlur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    zIndex: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pillBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  hintCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  hintIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  hintBody: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
});
