// components/profile/ui/Glass.tsx
import React from "react";
import { View, ViewProps } from "react-native";

let BlurViewImpl: any = View;
try {
  // Safe dynamic require so your app still compiles if expo-blur isn't installed yet.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BlurViewImpl = require("expo-blur").BlurView;
} catch {}

type GlassProps = ViewProps & {
  intensity?: number; // 0..100
  tint?: "light" | "dark"; // map to theme automatically
  radius?: number;
  border?: boolean;
};

/** Universal “glass” container with optional blur + border */
export default function Glass({
  style,
  children,
  intensity = 30,
  tint = "light",
  radius = 18,
  border = true,
  ...rest
}: React.PropsWithChildren<GlassProps>) {
  return (
    <BlurViewImpl
      intensity={intensity}
      tint={tint}
      style={[
        {
          borderRadius: radius,
          overflow: "hidden",
          backgroundColor:
            tint === "light" ? "rgba(255,255,255,0.22)" : "rgba(24,24,24,0.28)",
          ...(border && {
            borderWidth: 1,
            borderColor:
              tint === "light"
                ? "rgba(255,255,255,0.35)"
                : "rgba(255,255,255,0.12)",
          }),
        },
        style,
      ]}
      {...(BlurViewImpl === View
        ? {}
        : { experimentalBlurMethod: "dimezisBlurView" })}
      {...rest}
    >
      {children}
    </BlurViewImpl>
  );
}
