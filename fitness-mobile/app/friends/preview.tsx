import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { subscribeProfile, type Profile } from "@/services/profile";
import { friendTrendLabel, getFriendVisibility, isFriendSharingAnything } from "@/services/friends/visibility";
import { withAlpha } from "@/lib/color";

export default function FriendPreviewPage() {
  const { colors } = useTheme() as any;
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeProfile(user.uid, setProfile);
  }, [user?.uid]);
  const visibility = useMemo(() => getFriendVisibility(profile), [profile]);
  const trend = friendTrendLabel(profile);
  const sharing = isFriendSharingAnything(profile);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 24, gap: 14 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="chevron-back" size={18} color={colors.muted} />
          <Text style={{ color: colors.muted, fontWeight: "800" }}>Back</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 28 }}>Friend Preview</Text>
        <View style={{ borderRadius: 22, borderWidth: 1, borderColor: withAlpha(colors.text, 0.08), backgroundColor: colors.surface1, padding: 16, gap: 8 }}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}>
            {(profile?.displayName || user?.displayName || "You") as string}
          </Text>
          {!visibility.enabled || !sharing ? (
            <Text style={{ color: colors.muted }}>Friends see nothing while sharing is off.</Text>
          ) : (
            <>
              {visibility.nutrition?.mealsLoggedToday ? <Text style={{ color: colors.text }}>Recent meals visible</Text> : null}
              {visibility.nutrition?.dailyCaloriesTotal ? <Text style={{ color: colors.text }}>Daily calories visible</Text> : null}
              {visibility.nutrition?.macroBreakdown ? <Text style={{ color: colors.text }}>Macro breakdown visible</Text> : null}
              {visibility.workouts?.workoutsLogged ? <Text style={{ color: colors.text }}>Workouts logged visible</Text> : null}
              {visibility.workouts?.workoutDetails ? <Text style={{ color: colors.text }}>Workout names and details visible</Text> : null}
              {visibility.progress?.consistencyStreak ? <Text style={{ color: colors.text }}>Consistency streak visible</Text> : null}
              {visibility.progress?.badgeCollection ? <Text style={{ color: colors.text }}>Badge collection visible</Text> : null}
              {visibility.progress?.weightTrend ? <Text style={{ color: colors.text }}>{trend || "On track"}</Text> : null}
              {visibility.activity?.stepCount ? <Text style={{ color: colors.text }}>Step count visible</Text> : null}
              {visibility.activity?.cardioSessions ? <Text style={{ color: colors.text }}>Cardio sessions visible</Text> : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
