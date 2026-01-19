// app/(tabs)/friends.tsx
// Drop-in ✅ Premium Friends page (Apple-inspired glossy dark UI)
//
// Depends on:
// - expo-router
// - expo-linear-gradient
// - expo-blur
// - expo-haptics
// - react-native-reanimated
//
// Uses your existing backend logic:
// - subscribeFriends, subscribeFriendRequests, sendFriendRequest, respondToFriendRequest,
//   removeFriendship, pingFriend, cancelFriendRequest
// - notifyFriendRequestSafe, notifyFriendAccepted, notifyPingSafe
//
// Adds privacy-first block/report via new service: services/friendsSafety.ts

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  StatusBar,
  Pressable,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";

import BottomTabSpacer from "@/components/ui/BottomTapSpacer";
import { withAlpha } from "@/lib/color";

import {
  subscribeFriends,
  subscribeFriendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriendship,
  pingFriend,
  cancelFriendRequest,
  type FriendEdge,
} from "@/services/friends/friends";

import {
  notifyFriendRequestSafe,
  notifyFriendAccepted,
  notifyPingSafe,
} from "@/services/notifications";

import {
  PremiumSegmented,
  type FriendsTabKey,
} from "@/components/friends/premium/PremiumSegmented";
import { FriendRowPremium } from "@/components/friends/premium/FriendRowPremium";
import { RequestRowPremium } from "@/components/friends/premium/RequestRowPremium";
import { FriendsAddSheet } from "@/components/friends/premium/FriendsAddSheet";
import {
  FriendActionsSheet,
  type FriendAction,
} from "@/components/friends/premium/FriendsActionSheet";
import { upsertBlock, createReport } from "@/services/friends/friendsSafety";

type UIFriend = {
  id: string; // edge doc id
  friendUid: string;
  name: string;
  handle?: string;
  subtitle?: string;
  accentSeed: string;
  raw: FriendEdge;
};

function displayFromEdge(e: FriendEdge): string {
  return e.friendDisplayName || e.friendEmail || e.friendUid;
}

function toMillis(t: any) {
  return t && typeof t.toMillis === "function"
    ? t.toMillis()
    : typeof t === "number"
    ? t
    : 0;
}

function relativeTimeFrom(ts: any): string | null {
  const ms = toMillis(ts);
  if (!ms) return null;
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function safeHandleFromEmail(email?: string | null) {
  if (!email) return undefined;
  const left = (email.split("@")[0] || "user").toLowerCase();
  return `@${left.replace(/[^a-z0-9._-]/g, "")}`;
}

function calmSubtitleForFriend(e: FriendEdge) {
  const ping = relativeTimeFrom(e.lastPingAt);
  const updated = relativeTimeFrom(e.updatedAt);
  if (ping) return `Last ping • ${ping}`;
  if (updated) return `Updated • ${updated}`;
  return "Connected";
}

function calmSubtitleForIncoming(e: FriendEdge) {
  const when = relativeTimeFrom(e.requestedAt);
  return when ? `Requested • ${when}` : "Incoming request";
}

function calmSubtitleForSent(e: FriendEdge) {
  const when = relativeTimeFrom(e.requestedAt);
  return when ? `Pending • ${when}` : "Pending approval";
}

export default function FriendsPage() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<FriendsTabKey>("friends");
  const [friendsEdges, setFriendsEdges] = useState<FriendEdge[]>([]);
  const [incomingEdges, setIncomingEdges] = useState<FriendEdge[]>([]);

  // loading/error states
  const [loadingA, setLoadingA] = useState(true);
  const [loadingB, setLoadingB] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [selected, setSelected] = useState<UIFriend | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const topInset = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

  useEffect(() => {
    if (!user?.uid) return;

    setErrorMsg(null);
    setLoadingA(true);
    setLoadingB(true);

    const unsubA = subscribeFriends(
      user.uid,
      (edges) => {
        setFriendsEdges(edges);
        setLoadingA(false);
      },
      ["accepted", "pending"]
    );

    const unsubB = subscribeFriendRequests(user.uid, (edges) => {
      setIncomingEdges(edges);
      setLoadingB(false);
    });

    // defensive timeout so UI doesn’t “hang” if offline without events
    const t = setTimeout(() => {
      setLoadingA(false);
      setLoadingB(false);
    }, 3500);

    return () => {
      clearTimeout(t);
      unsubA && unsubA();
      unsubB && unsubB();
    };
  }, [user?.uid]);

  const pendingOutgoing = useMemo(
    () =>
      friendsEdges.filter(
        (f) => f.status === "pending" && f.direction === "outgoing"
      ),
    [friendsEdges]
  );

  const accepted = useMemo(
    () => friendsEdges.filter((f) => f.status === "accepted"),
    [friendsEdges]
  );

  const friendsUI: UIFriend[] = useMemo(
    () =>
      accepted.map((e) => ({
        id: e.id,
        friendUid: e.friendUid,
        name: displayFromEdge(e),
        handle: safeHandleFromEmail(e.friendEmail),
        subtitle: calmSubtitleForFriend(e),
        accentSeed: e.friendUid,
        raw: e,
      })),
    [accepted]
  );

  const requestsUI: UIFriend[] = useMemo(
    () =>
      incomingEdges.map((e) => ({
        id: e.id,
        friendUid: e.friendUid,
        name: displayFromEdge(e),
        handle: safeHandleFromEmail(e.friendEmail),
        subtitle: calmSubtitleForIncoming(e),
        accentSeed: e.friendUid,
        raw: e,
      })),
    [incomingEdges]
  );

  const sentUI: UIFriend[] = useMemo(
    () =>
      pendingOutgoing.map((e) => ({
        id: e.id,
        friendUid: e.friendUid,
        name: displayFromEdge(e),
        handle: safeHandleFromEmail(e.friendEmail),
        subtitle: calmSubtitleForSent(e),
        accentSeed: e.friendUid,
        raw: e,
      })),
    [pendingOutgoing]
  );

  const data =
    tab === "friends" ? friendsUI : tab === "requests" ? requestsUI : sentUI;

  const isLoading = loadingA || loadingB;

  const headerGlow = useMemo(() => {
    return isDark
      ? ([
          "rgba(255,255,255,0.08)",
          "rgba(255,255,255,0.02)",
          "rgba(0,0,0,0)",
        ] as const)
      : ([
          "rgba(0,0,0,0.06)",
          "rgba(255,255,255,0.00)",
          "rgba(255,255,255,0)",
        ] as const);
  }, [isDark]);

  async function handleSend(targetRaw: string, displayNameRaw: string) {
    const target = targetRaw.trim();
    const displayName = displayNameRaw.trim();
    if (!target || !user?.uid) return;

    setSending(true);
    setErrorMsg(null);

    try {
      await sendFriendRequest(
        user.uid,
        {
          friendUid: target,
          friendEmail: target.includes("@") ? target : null,
          friendDisplayName: displayName || null,
        },
        { email: user.email ?? null, displayName: user.displayName ?? null }
      );

      await notifyFriendRequestSafe(target, {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddOpen(false);
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not send request.");
      Alert.alert("Could not send request", e?.message || "Unknown error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
    }
  }

  async function handleRespond(friendUid: string, accept: boolean) {
    if (!user?.uid) return;
    try {
      await respondToFriendRequest(user.uid, friendUid, accept);
      if (accept) {
        await notifyFriendAccepted(friendUid, {
          uid: user.uid,
          displayName: user.displayName ?? user.email ?? "Friend",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e: any) {
      Alert.alert("Couldn't update request", e?.message || "Unknown error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function handleRemove(friendUid: string) {
    if (!user?.uid) return;
    Alert.alert(
      "Remove friend?",
      "This removes the connection for both sides. They won’t be notified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeFriendship(user.uid!, friendUid);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              setSheetOpen(false);
            } catch (e: any) {
              Alert.alert("Couldn't remove", e?.message || "Unknown error");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  }

  async function handlePing(friendUid: string) {
    if (!user?.uid) return;
    try {
      await pingFriend(user.uid, friendUid);
      try {
        await notifyPingSafe(friendUid, {
          uid: user.uid,
          displayName: user.displayName ?? user.email ?? "Friend",
        });
      } catch {}
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Couldn't ping", e?.message || "Unknown error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function handleCancelOutgoing(toUid: string) {
    if (!user?.uid) return;
    Alert.alert("Cancel request?", "This will remove the pending request.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelFriendRequest(user.uid!, toUid);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e: any) {
            Alert.alert("Couldn't cancel", e?.message || "Unknown error");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        },
      },
    ]);
  }

  async function handleBlock(friendUid: string) {
    if (!user?.uid) return;
    Alert.alert(
      "Block this person?",
      "Blocking hides you from each other here. You can unblock later in Privacy settings (future).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await upsertBlock(user.uid!, friendUid, true);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              // Optional: remove friendship if connected
              // (privacy-first default)
              try {
                await removeFriendship(user.uid!, friendUid);
              } catch {}
              setSheetOpen(false);
            } catch (e: any) {
              Alert.alert("Couldn't block", e?.message || "Unknown error");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  }

  async function handleReport(friendUid: string) {
    if (!user?.uid) return;
    Alert.alert(
      "Report",
      "Reports are private. Share the reason on the next screen (simple prompt).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            // Minimal privacy-first prompt (no heavy UI)
            Alert.prompt?.(
              "Report reason",
              "Briefly describe what happened (stored securely).",
              async (text) => {
                try {
                  await createReport(user.uid!, friendUid, text || "No reason");
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  setSheetOpen(false);
                } catch (e: any) {
                  Alert.alert("Couldn't report", e?.message || "Unknown error");
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Error
                  );
                }
              }
            );

            // Android fallback (no Alert.prompt)
            if (Platform.OS === "android") {
              try {
                await createReport(user.uid!, friendUid, "Reported");
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                setSheetOpen(false);
              } catch (e: any) {
                Alert.alert("Couldn't report", e?.message || "Unknown error");
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error
                );
              }
            }
          },
        },
      ]
    );
  }

  const actions: FriendAction[] = useMemo(() => {
    if (!selected) return [];
    const name = selected.name;
    const uid = selected.friendUid;

    const goMeals = () => {
      router.push(
        `/friends/${encodeURIComponent(uid)}?name=${encodeURIComponent(
          selected.raw.friendDisplayName || name
        )}`
      );
    };
    const goWorkouts = () => {
      router.push(
        `/friends/${encodeURIComponent(uid)}/workouts?name=${encodeURIComponent(
          selected.raw.friendDisplayName || name
        )}`
      );
    };
    const goProfile = () => {
      router.push(
        `/friends/${encodeURIComponent(uid)}/profile?name=${encodeURIComponent(
          selected.raw.friendDisplayName || name
        )}`
      );
    };

    return [
      {
        key: "ping",
        title: "Ping",
        subtitle: "A gentle nudge — no pressure",
        icon: "notifications-outline",
        onPress: () => handlePing(uid),
      },
      {
        key: "profile",
        title: "View Profile",
        subtitle: "Minimal public info",
        icon: "person-outline",
        onPress: goProfile,
      },
      {
        key: "meals",
        title: "View Meals",
        subtitle: "Read-only history",
        icon: "restaurant-outline",
        onPress: goMeals,
      },
      {
        key: "workouts",
        title: "View Workouts",
        subtitle: "Read-only history",
        icon: "barbell-outline",
        onPress: goWorkouts,
      },
      {
        key: "remove",
        title: "Remove Friend",
        subtitle: "Quietly disconnect",
        icon: "trash-outline",
        destructive: true,
        onPress: () => handleRemove(uid),
      },
      {
        key: "block",
        title: "Block",
        subtitle: "Privacy-first: hide each other",
        icon: "ban-outline",
        destructive: true,
        onPress: () => handleBlock(uid),
      },
      {
        key: "report",
        title: "Report",
        subtitle: "Private and secure",
        icon: "flag-outline",
        onPress: () => handleReport(uid),
      },
    ];
  }, [router, selected]);

  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withTiming(isLoading ? 1 : 0, { duration: 280 });
  }, [isLoading, shimmer]);

  const loadingStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
    transform: [{ translateY: (1 - shimmer.value) * 6 }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={headerGlow}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={{ paddingTop: topInset + 14, paddingHorizontal: 16 }}>
        <Animated.View entering={FadeInDown.duration(420)}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.back();
              }}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: withAlpha(colors.card, pressed ? 0.6 : 0.42),
                  borderColor: withAlpha(colors.border, 0.5),
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                Friends
              </Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                Calm connection. Private by default.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setAddOpen(true);
                }}
                style={({ pressed }) => [
                  styles.headerPill,
                  {
                    backgroundColor: withAlpha(colors.text, pressed ? 0.1 : 0.08),
                    borderColor: withAlpha(colors.text, 0.12),
                  },
                ]}
              >
                <BlurView
                  intensity={22}
                  tint={isDark ? "dark" : "light"}
                  style={StyleSheet.absoluteFillObject}
                />
                <Ionicons
                  name="person-add-outline"
                  size={18}
                  color={colors.text}
                />
                <Text style={[styles.headerPillText, { color: colors.text }]}>
                  Add
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: 12 }} />
          <PremiumSegmented value={tab} onChange={setTab} />
        </Animated.View>

        {errorMsg ? (
          <Animated.View
            entering={FadeIn.duration(240)}
            style={{ marginTop: 10 }}
          >
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: withAlpha(colors.danger, 0.12),
                  borderColor: withAlpha(colors.danger, 0.28),
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.danger}
              />
              <Text style={[styles.bannerText, { color: colors.text }]}>
                {errorMsg}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </View>

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 28,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              Haptics.selectionAsync();
              // Firestore onSnapshot refreshes automatically; this is a calm affordance.
            }}
            tintColor={colors.muted}
          />
        }
        ListHeaderComponent={
          isLoading ? (
            <Animated.View style={[styles.loadingWrap, loadingStyle]}>
              <View
                style={[
                  styles.skeletonCard,
                  {
                    backgroundColor: withAlpha(colors.text, 0.06),
                  },
                ]}
              />
              <View
                style={[
                  styles.skeletonCard,
                  {
                    backgroundColor: withAlpha(colors.text, 0.05),
                  },
                ]}
              />
              <View
                style={[
                  styles.skeletonCard,
                  {
                    backgroundColor: withAlpha(colors.text, 0.04),
                  },
                ]}
              />
              <View style={{ height: 6 }} />
            </Animated.View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 34, alignItems: "center" }}>
            <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: withAlpha(colors.text, 0.06),
                    borderColor: withAlpha(colors.text, 0.12),
                  },
                ]}
              >
              <Ionicons
                name={
                  tab === "friends"
                    ? "people-outline"
                    : tab === "requests"
                    ? "mail-unread-outline"
                    : "time-outline"
                }
                size={18}
                color={colors.muted}
              />
            </View>

            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {tab === "friends"
                ? "Your circle starts small"
                : tab === "requests"
                ? "No incoming requests"
                : "No sent requests"}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>
              {tab === "friends"
                ? "Add a friend by email or UID. You control what you share."
                : tab === "requests"
                ? "When someone requests you, it shows up here."
                : "Requests you’ve sent will appear here until accepted."}
            </Text>

            {tab === "friends" ? (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setAddOpen(true);
                }}
                style={({ pressed }) => [
                  styles.primaryCta,
                  {
                    backgroundColor: withAlpha(
                      colors.primary || "#6ee7ff",
                      pressed ? 0.22 : 0.18
                    ),
                    borderColor: withAlpha(colors.primary || "#6ee7ff", 0.28),
                  },
                ]}
              >
                <BlurView
                  intensity={18}
                  tint="dark"
                  style={StyleSheet.absoluteFillObject}
                />
                <Ionicons
                  name="person-add-outline"
                  size={16}
                  color={colors.text}
                />
                <Text style={[styles.primaryCtaText, { color: colors.text }]}>
                  Add friend
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => {
          if (tab === "friends") {
            return (
              <Animated.View
                entering={FadeInDown.duration(360).delay(20 + index * 22)}
              >
                <FriendRowPremium
                  name={item.name}
                  handle={item.handle}
                  subtitle={item.subtitle}
                  accentSeed={item.accentSeed}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelected(item);
                    setSheetOpen(true);
                  }}
                  onPing={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handlePing(item.friendUid);
                  }}
                />
              </Animated.View>
            );
          }

          if (tab === "requests") {
            return (
              <Animated.View
                entering={FadeInDown.duration(360).delay(20 + index * 22)}
              >
                <RequestRowPremium
                  name={item.name}
                  handle={item.handle}
                  subtitle={item.subtitle}
                  accentSeed={item.accentSeed}
                  mode="incoming"
                  onAccept={() => handleRespond(item.friendUid, true)}
                  onDecline={() => handleRespond(item.friendUid, false)}
                  onOpenActions={() => {
                    Haptics.selectionAsync();
                    setSelected(item);
                    setSheetOpen(true);
                  }}
                />
              </Animated.View>
            );
          }

          return (
            <Animated.View
              entering={FadeInDown.duration(360).delay(20 + index * 22)}
            >
              <RequestRowPremium
                name={item.name}
                handle={item.handle}
                subtitle={item.subtitle}
                accentSeed={item.accentSeed}
                mode="sent"
                onCancel={() => handleCancelOutgoing(item.friendUid)}
                onOpenActions={() => {
                  Haptics.selectionAsync();
                  setSelected(item);
                  setSheetOpen(true);
                }}
              />
            </Animated.View>
          );
        }}
      />

      <BottomTabSpacer />

      {/* Sheets */}
      <FriendsAddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        sending={sending}
        disabled={!user?.uid}
        onSend={handleSend}
        privacyNote="Requests are private. No public search directory."
      />

      <FriendActionsSheet
        open={sheetOpen}
        title={selected?.name ?? ""}
        subtitle={selected?.handle ?? ""}
        onClose={() => setSheetOpen(false)}
        actions={actions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  headerPillText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
  },
  loadingWrap: {
    marginBottom: 8,
    gap: 10,
  },
  skeletonCard: {
    height: 72,
    borderRadius: 18,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 18,
  },
  primaryCta: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  primaryCtaText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});
