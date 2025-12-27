// app/friends.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/content/AuthContext";
import { useTheme } from "@/content/ThemeProvider";
import { Field } from "@/components/workouts/ui/Field";
import Card from "@/components/Card";
import BottomTabSpacer from "@/components/ui/BottomTapSpacer";
import { GradientButton } from "@/components/workouts/ui/GradientButton";
import { useRouter } from "expo-router";
import {
  subscribeFriends,
  subscribeFriendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriendship,
  pingFriend,
  type FriendEdge,
} from "@/services/friends";
import {
  notifyFriendRequest,
  notifyFriendAccepted,
  notifyPing,
} from "@/services/notifications";
import { withAlpha } from "@/components/workouts/utils/withAlpha";

const ribbonColors = ["#5ce1ff", "#ff5ac8", "#8cfb9f", "#ffc857"];

export default function FriendsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const uid = user?.uid ?? "__demo__";

  const [friends, setFriends] = useState<FriendEdge[]>([]);
  const [requests, setRequests] = useState<FriendEdge[]>([]);
  const [input, setInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubA = subscribeFriends(user.uid, setFriends, ["accepted", "pending"]);
    const unsubB = subscribeFriendRequests(user.uid, setRequests);
    return () => {
      unsubA && unsubA();
      unsubB && unsubB();
    };
  }, [user?.uid]);

  const pendingOutgoing = useMemo(
    () => friends.filter((f) => f.status === "pending" && f.direction === "outgoing"),
    [friends]
  );
  const accepted = useMemo(
    () => friends.filter((f) => f.status === "accepted"),
    [friends]
  );

  const totalRequests = requests.length;

  async function handleSend() {
    const target = input.trim();
    if (!target || !user?.uid) return;
    setSending(true);
    try {
      await sendFriendRequest(
        user.uid,
        {
          friendUid: target,
          friendEmail: target.includes("@") ? target : null,
          friendDisplayName: displayName.trim() || null,
        },
        { email: user.email ?? null, displayName: user.displayName ?? null }
      );
      await notifyFriendRequest(target, {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
      });
      setInput("");
      setDisplayName("");
    } catch (e: any) {
      Alert.alert("Could not send request", e?.message || "Unknown error");
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
      }
    } catch (e: any) {
      Alert.alert("Couldn't update request", e?.message || "Unknown error");
    }
  }

  async function handleRemove(friendUid: string) {
    if (!user?.uid) return;
    Alert.alert("Remove friend?", "This will remove both sides of the friendship.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeFriendship(user.uid!, friendUid);
          } catch (e: any) {
            Alert.alert("Couldn't remove", e?.message || "Unknown error");
          }
        },
      },
    ]);
  }

  async function handlePing(friendUid: string, friendName?: string | null) {
    if (!user?.uid) return;
    try {
      await pingFriend(user.uid, friendUid);
      await notifyPing(friendUid, {
        uid: user.uid,
        displayName: user.displayName ?? user.email ?? "Friend",
      });
    } catch (e: any) {
      Alert.alert("Couldn't ping", e?.message || "Unknown error");
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
    >
      {/* floating ribbons */}
      <GradientRibbon
        side="right"
        colors={[ribbonColors[1], ribbonColors[0]] as const}
        opacity={isDark ? 0.18 : 0.24}
      />
      <GradientRibbon
        side="left"
        colors={[ribbonColors[2], ribbonColors[3]] as const}
        top={320}
        opacity={isDark ? 0.14 : 0.2}
      />

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
        }}
      >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>
                Friends & Meals
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4, fontWeight: "600" }}>
                Add buddies, watch their meals, and nudge them to log today.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/notifications")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: withAlpha(colors.primary, 0.35),
                backgroundColor: withAlpha(colors.primary, pressed ? 0.18 : 0.12),
              })}
            >
              <Ionicons name="arrow-back" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "800" }}>Back</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 12, gap: 10 }}>
            <Field
              icon="person-add-outline"
              placeholder="Friend UID or email"
              value={input}
              onChangeText={setInput}
            />
            <Field
              icon="pricetag-outline"
              placeholder="Display name (optional)"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <GradientButton
              label={sending ? "Sending..." : "Send friend request"}
              onPress={handleSend}
              disabled={!input.trim() || sending || !user?.uid}
            />
          </View>
        </LinearGradient>
      </MotiView>

      {/* Requests */}
      <Card
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
        }}
      >
        <SectionHeader
          icon="mail-unread-outline"
          title="Requests"
          subtitle={
            totalRequests
              ? `${totalRequests} awaiting response`
              : "No pending requests"
          }
        />
        {requests.length === 0 ? (
          <EmptyLine label="No incoming requests" />
        ) : (
          requests.map((r) => (
            <FriendRow
              key={r.id}
              colors={colors}
              title={r.friendDisplayName || r.friendEmail || r.friendUid}
              subtitle="Incoming request"
              actions={[
                { label: "Accept", onPress: () => handleRespond(r.friendUid, true) },
                { label: "Decline", onPress: () => handleRespond(r.friendUid, false) },
              ]}
            />
          ))
        )}
      </Card>

      {/* Outgoing */}
      <Card
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
        }}
      >
        <SectionHeader
          icon="send-outline"
          title="Sent requests"
          subtitle={
            pendingOutgoing.length
              ? `${pendingOutgoing.length} pending`
              : "None pending"
          }
        />
        {pendingOutgoing.length === 0 ? (
          <EmptyLine label="No outgoing requests" />
        ) : (
          pendingOutgoing.map((r) => (
            <FriendRow
              key={r.id}
              colors={colors}
              title={r.friendDisplayName || r.friendEmail || r.friendUid}
              subtitle="Waiting for approval"
            />
          ))
        )}
      </Card>

      {/* Friends */}
      <Card
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 10,
        }}
      >
        <SectionHeader
          icon="people-outline"
          title="Friends"
          subtitle={
            accepted.length
              ? `${accepted.length} connected`
              : "Add friends to share progress"
          }
        />
        {accepted.length === 0 ? (
          <EmptyLine label="No friends yet" />
        ) : (
          accepted.map((f) => (
            <FriendRow
              key={f.id}
              colors={colors}
              title={f.friendDisplayName || f.friendEmail || f.friendUid}
              subtitle="Can view meals & streaks"
              actions={[
                { label: "Ping", onPress: () => handlePing(f.friendUid, f.friendDisplayName) },
                { label: "Remove", onPress: () => handleRemove(f.friendUid) },
                {
                  label: "View meals",
                  onPress: () =>
                    router.push(
                      `/friends/${encodeURIComponent(
                        f.friendUid
                      )}?name=${encodeURIComponent(f.friendDisplayName || "")}`
                    ),
                },
                {
                  label: "View workouts",
                  onPress: () =>
                    router.push(
                      `/friends/${encodeURIComponent(
                        f.friendUid
                      )}/workouts?name=${encodeURIComponent(f.friendDisplayName || "")}`
                    ),
                },
              ]}
            />
          ))
        )}
      </Card>

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

function FriendRow({
  colors,
  title,
  subtitle,
  actions = [],
}: {
  colors: any;
  title: string;
  subtitle?: string;
  actions?: { label: string; onPress: () => void }[];
}) {
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.9),
        backgroundColor: withAlpha(colors.card, 0.96),
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(colors.primary, 0.12),
            borderWidth: 1,
            borderColor: withAlpha(colors.primary, 0.3),
          }}
        >
          <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>{title}</Text>
          {subtitle ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      {actions.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {actions.map((a) => (
            <Pressable key={a.label} onPress={a.onPress}>
              {({ pressed }) => (
                <MotiView
                  animate={{ scale: pressed ? 0.97 : 1 }}
                  transition={{ type: "timing", duration: 120 }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.primary, 0.4),
                    backgroundColor: withAlpha(colors.primary, 0.12),
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: "800" }}>
                    {a.label}
                  </Text>
                </MotiView>
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
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

function GradientRibbon({
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
