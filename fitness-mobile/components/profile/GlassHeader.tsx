import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
let BlurView: any = View;
try {
  BlurView = require("expo-blur").BlurView;
} catch {}

export default function GlassHeader() {
  // This element is sized by React Navigation to fill the header.
  return (
    <View style={{ flex: 1 }}>
      {/* Soft gradient to match your pages */}
      <LinearGradient
        colors={["rgba(255,255,255,0.00)", "rgba(255,255,255,0.06)"]}
        style={{ ...StyleSheet.absoluteFillObject }}
      />
      {/* Frosted blur layer */}
      <BlurView
        intensity={24}
        tint="light"
        style={{
          flex: 1,
          borderBottomWidth: 1,
          borderColor: "rgba(255,255,255,0.18)",
        }}
      />
    </View>
  );
}
import { StyleSheet } from "react-native";
