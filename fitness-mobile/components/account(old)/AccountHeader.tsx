// components/account/AccountHeader.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/content/ThemeProvider";

type Props = {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  onPressEdit?: () => void;
};

export function AccountHeader({
  displayName,
  email,
  photoURL,
  onPressEdit,
}: Props) {
  const { colors, isDark } = useTheme();
  const sub =
    colors.muted ?? (isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)");
  const title = colors?.text ?? (isDark ? "#fff" : "#111");

  const initials = (displayName ?? email ?? "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.10)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
          accessibilityRole="image"
          accessibilityLabel="Profile photo"
        >
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImg} />
          ) : (
            <Text style={[styles.initials, { color: title }]}>{initials}</Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: title }]} numberOfLines={1}>
            {displayName?.trim() ? displayName : "Your Account"}
          </Text>
          <Text style={[styles.email, { color: sub }]} numberOfLines={1}>
            {email ?? "Not signed in"}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onPressEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
        style={({ pressed }) => [
          styles.editBtn,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.10)"
              : "rgba(0,0,0,0.06)",
          },
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        ]}
      >
        <Ionicons name="create-outline" size={18} color={title} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 52,
    height: 52,
  },
  initials: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  email: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  editBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
