// components/accountCenter/AccountCenterHeader.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

export type AccountCenterHeaderModel = {
  signedIn: boolean;
  displayName: string;
  email: string;
  photoURL?: string | null;
  verified: boolean;
  planLabel: "Free" | "Pro";
  planHint: string;
};

function GlassWrap({
  children,
  pad = 14,
}: React.PropsWithChildren<{ pad?: number }>) {
  const { colors, isDark } = useTheme() as any;
  if (Platform.OS === "ios") {
    return (
      <View style={[styles.glassOuter, { borderColor: colors.border }]}>
        <BlurView
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
          intensity={26}
          style={{ padding: pad }}
        >
          {children}
        </BlurView>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.glassOuter,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: pad,
        },
      ]}
    >
      {children}
    </View>
  );
}

export function AccountCenterHeader({
  model,
  onPressEdit,
  onPressPlan,
  reduceMotion,
}: {
  model: AccountCenterHeaderModel;
  onPressEdit: () => void;
  onPressPlan: () => void;
  reduceMotion?: boolean;
}) {
  const { colors, isDark } = useTheme() as any;

  const planPill = useMemo(() => {
    const pro = model.planLabel === "Pro";
    return {
      bg: pro
        ? "rgba(124,58,237,0.18)"
        : isDark
        ? "rgba(255,255,255,0.07)"
        : "rgba(0,0,0,0.05)",
      border: pro ? "rgba(124,58,237,0.55)" : colors.border,
      text: pro ? colors.primary : colors.text,
      icon: pro ? "sparkles-outline" : "leaf-outline",
      label: model.planLabel,
    };
  }, [model.planLabel, colors, isDark]);

  return (
    <GlassWrap pad={14}>
      <View style={{ gap: 12 }}>
        {/* top row */}
        <View style={styles.topRow}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { borderColor: colors.border }]}>
              {model.photoURL ? (
                <Image
                  source={{ uri: model.photoURL }}
                  style={styles.avatarImg}
                />
              ) : (
                <Ionicons name="person" size={22} color={colors.text} />
              )}
            </View>

            {/* identity */}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.name, { color: colors.text }]}>
                {model.displayName}
              </Text>
              <Text
                style={[styles.email, { color: colors.muted }]}
                numberOfLines={1}
              >
                {model.email}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: model.verified
                        ? "rgba(16,185,129,0.16)"
                        : "rgba(245,158,11,0.16)",
                      borderColor: model.verified
                        ? "rgba(16,185,129,0.50)"
                        : "rgba(245,158,11,0.50)",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      model.verified
                        ? "checkmark-circle-outline"
                        : "alert-circle-outline"
                    }
                    size={14}
                    color={model.verified ? "#10b981" : "#f59e0b"}
                  />
                  <Text
                    style={{
                      color: model.verified ? "#10b981" : "#f59e0b",
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    {model.signedIn
                      ? model.verified
                        ? "Verified"
                        : "Not verified"
                      : "Guest"}
                  </Text>
                </View>

                <Pressable
                  onPress={onPressPlan}
                  style={({ pressed }) => [
                    styles.pill,
                    {
                      backgroundColor: pressed ? planPill.bg : planPill.bg,
                      borderColor: planPill.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Manage membership"
                >
                  <Ionicons
                    name={planPill.icon as any}
                    size={14}
                    color={planPill.text}
                  />
                  <Text
                    style={{
                      color: planPill.text,
                      fontWeight: "900",
                      fontSize: 12,
                    }}
                  >
                    {planPill.label}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* actions */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={onPressEdit}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: pressed
                  ? "rgba(124,58,237,0.80)"
                  : "rgba(124,58,237,0.92)",
                borderColor: "rgba(124,58,237,0.65)",
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={model.signedIn ? "Edit profile" : "Sign in"}
          >
            <Ionicons
              name={model.signedIn ? "create-outline" : "log-in-outline"}
              size={18}
              color={"#0b0f1a"}
            />
            <Text style={styles.primaryBtnText}>
              {model.signedIn ? "Edit Profile" : "Sign In"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onPressPlan}
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                backgroundColor: pressed
                  ? isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)"
                  : isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
                borderColor: colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Manage membership"
          >
            <Ionicons name="sparkles-outline" size={18} color={colors.text} />
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
              {model.planLabel === "Pro" ? "Manage" : "Upgrade"}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.planHint, { color: colors.muted }]}>
          {model.planHint}
        </Text>
      </View>
    </GlassWrap>
  );
}

const styles = StyleSheet.create({
  glassOuter: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  email: {
    fontSize: 12,
    fontWeight: "700",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#0b0f1a",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 120,
  },
  secondaryBtnText: {
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  planHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
