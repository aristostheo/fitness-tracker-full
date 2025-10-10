// app/+not-found.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function NotFound() {
  const router = useRouter();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "800", marginBottom: 8 }}>
        Not found
      </Text>
      <Text style={{ opacity: 0.7, textAlign: "center", marginBottom: 16 }}>
        The screen you’re looking for doesn’t exist.
      </Text>
      <Pressable
        onPress={() => router.replace("/(tabs)")}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 12,
          backgroundColor: "#4f46e5",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Go Home</Text>
      </Pressable>
    </View>
  );
}
