// components/scanMeal/ScanMealCamera.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { useTheme } from "@/content/ThemeProvider";

type Props = {
  onClose: () => void;
  onCaptured: (uri: string) => void;
};

export default function ScanMealCamera({ onClose, onCaptured }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [torch, setTorch] = useState<"off" | "on">("off");
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission().catch(() => {});
  }, [permission, requestPermission]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert("Settings", "Open your Settings app to enable permissions.");
    });
  }, []);

  const takePhoto = useCallback(async () => {
    if (isCapturing) return;

    const cam = cameraRef.current;
    if (!cam) return;

    if (!permission?.granted) {
      await requestPermission().catch(() => {});
      return;
    }

    setIsCapturing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => {}
      );

      const photo = await (cam as any).takePictureAsync?.({ quality: 0.8 });
      if (photo?.uri) onCaptured(photo.uri);
    } catch {
      // silent; user can retry
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCaptured, permission?.granted, requestPermission]);

  const importFromPhotos = useCallback(async () => {
    await Haptics.selectionAsync().catch(() => {});

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(
      () => null
    );
    if (perm && !perm.granted) {
      Alert.alert(
        "Photos access needed",
        "Enable Photos access in Settings to import a meal photo.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: openSettings },
        ]
      );
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      // ✅ no deprecated MediaTypeOptions
      // This works across SDK versions:
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
    });

    if (!res.canceled && res.assets?.[0]?.uri) {
      onCaptured(res.assets[0].uri);
    }
  }, [onCaptured, openSettings]);

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <Animated.View
          entering={FadeIn.duration(180)}
          style={styles.permissionCard}
        >
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionSub}>
            We use the camera to scan meals. You can also import a photo from
            your library.
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable onPress={requestPermission} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Allow camera</Text>
            </Pressable>
            <Pressable onPress={importFromPhotos} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Import photo</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={openSettings}
            style={{ marginTop: 12, padding: 10, alignSelf: "center" }}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Text style={styles.settingsLink}>Open Settings</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={{ marginTop: 4, padding: 10, alignSelf: "center" }}
          >
            <Text style={styles.closeLink}>Close</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ✅ CameraView has NO children */}
      <CameraView
        ref={(r) => {
          cameraRef.current = r;
        }}
        style={styles.camera}
        facing="back"
        enableTorch={torch === "on"}
      />

      {/* ✅ Overlay UI sits on top via absolute positioning */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Top bar */}
        <View style={styles.topBar} pointerEvents="auto">
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.topBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.topBtnText}>Back</Text>
          </Pressable>

          <Text style={styles.title}>Scan a Meal</Text>

          <Pressable
            onPress={() => setTorch((t) => (t === "on" ? "off" : "on"))}
            hitSlop={12}
            style={styles.topBtn}
            accessibilityRole="button"
            accessibilityLabel={
              torch === "on" ? "Turn torch off" : "Turn torch on"
            }
          >
            <Text style={styles.topBtnText}>
              {torch === "on" ? "Torch On" : "Torch Off"}
            </Text>
          </Pressable>
        </View>

        {/* Framing guides */}
        <View style={styles.frameGuideWrap} pointerEvents="none">
          <View style={styles.frameGuide} />
          <Text style={styles.tipText}>
            Center the plate • Good lighting helps
          </Text>
        </View>

        {/* Bottom controls */}
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={styles.bottomBar}
          pointerEvents="auto"
        >
          <Pressable
            onPress={importFromPhotos}
            style={styles.pillBtn}
            accessibilityRole="button"
            accessibilityLabel="Import from photos"
          >
            <Text style={styles.pillText}>Import</Text>
          </Pressable>

          <Pressable
            onPress={takePhoto}
            disabled={isCapturing}
            style={[styles.captureOuter, isCapturing && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
          >
            <View style={styles.captureInner} />
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert(
                "Scan tips",
                "• Use bright, even lighting\n• Keep the whole plate in frame\n• Avoid motion blur\n• Import a clearer photo if needed"
              )
            }
            style={styles.pillBtn}
            accessibilityRole="button"
            accessibilityLabel="Scan tips"
          >
            <Text style={styles.pillText}>Tips</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  const hair = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#000" },
    camera: { flex: 1 },

    topBar: {
      paddingTop: Platform.OS === "ios" ? 56 : 18,
      paddingHorizontal: 14,
      paddingBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    title: { color: "#fff", fontSize: 16, fontWeight: "800" },
    topBtn: { paddingVertical: 8, paddingHorizontal: 10 },
    topBtnText: { color: "rgba(255,255,255,0.92)", fontWeight: "700" },

    frameGuideWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    frameGuide: {
      width: "78%",
      height: "50%",
      borderRadius: 22,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.35)",
      backgroundColor: "rgba(255,255,255,0.03)",
    },
    tipText: {
      marginTop: 12,
      color: "rgba(255,255,255,0.85)",
      fontWeight: "700",
    },

    bottomBar: {
      paddingBottom: Platform.OS === "ios" ? 26 : 18,
      paddingTop: 16,
      paddingHorizontal: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    pillBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.12)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.18)",
    },
    pillText: { color: "#fff", fontWeight: "800" },

    captureOuter: {
      width: 74,
      height: 74,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.85)",
      backgroundColor: "rgba(255,255,255,0.08)",
    },
    captureInner: {
      width: 56,
      height: 56,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.92)",
    },

    permissionCard: {
      marginTop: 120,
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 22,
      backgroundColor:
        colors.surface ??
        (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hair,
    },
    permissionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
    permissionSub: {
      marginTop: 8,
      color:
        colors.muted ??
        (isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.62)"),
      lineHeight: 18,
    },

    primaryBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: colors.primary ?? (isDark ? "#fff" : "#000"),
    },
    primaryBtnText: {
      color: colors.primaryText ?? (isDark ? "#000" : "#fff"),
      fontWeight: "900",
    },

    secondaryBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hair,
    },
    secondaryBtnText: { color: colors.text, fontWeight: "900" },

    settingsLink: { color: colors.primary ?? colors.text, fontWeight: "900" },
    closeLink: {
      color: colors.muted ?? "rgba(255,255,255,0.7)",
      fontWeight: "800",
    },
  });
}
