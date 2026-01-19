// // app/(tabs)/account.tsx
// import React, { useMemo, useState, useLayoutEffect } from "react";
// import {
//   ScrollView,
//   View,
//   Text,
//   Pressable,
//   Platform,
//   Alert,
//   Linking,
//   Animated,
//   Easing,
// } from "react-native";
// import { useRouter, useNavigation } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
// import { BlurView } from "expo-blur";

// import { useTheme } from "@/content/ThemeProvider";
// import { useAuth } from "@/content/AuthContext";
// import { useEntitlements } from "@/content/useEntitlements";

// import { useBadges } from "@/hooks/useBadges";
// import { BadgeGrid } from "@/components/badges/BadgeGrid";
// import BadgeCelebrate from "@/components/badges/BadgeCelebrate";
// import { BADGES } from "@/services/badges";

// import { getAuth, sendEmailVerification } from "firebase/auth";

// /* ────────────────────────── small UI helpers ────────────────────────── */

// function Chevron({ open, color = "#999" }: { open: boolean; color?: string }) {
//   const a = React.useRef(new Animated.Value(open ? 1 : 0)).current;
//   React.useEffect(() => {
//     Animated.timing(a, {
//       toValue: open ? 1 : 0,
//       duration: 160,
//       easing: Easing.out(Easing.quad),
//       useNativeDriver: true,
//     }).start();
//   }, [open]);
//   const rotate = a.interpolate({
//     inputRange: [0, 1],
//     outputRange: ["-90deg", "0deg"],
//   });
//   return (
//     <Animated.View style={{ transform: [{ rotate }], marginLeft: 6 }}>
//       <Ionicons name="chevron-forward" size={16} color={color} />
//     </Animated.View>
//   );
// }

// function SectionHeader({
//   icon,
//   title,
//   right,
//   onPress,
//   collapsible = false,
//   open = true,
// }: {
//   icon?: keyof typeof Ionicons.glyphMap;
//   title: string;
//   right?: React.ReactNode;
//   onPress?: () => void;
//   collapsible?: boolean;
//   open?: boolean;
// }) {
//   const { colors } = useTheme() as any;
//   const content = (
//     <View
//       style={{
//         flexDirection: "row",
//         alignItems: "center",
//         gap: 8,
//       }}
//     >
//       {!!icon && <Ionicons name={icon} size={14} color={colors.text + "99"} />}
//       <Text
//         style={{
//           fontSize: 12,
//           fontWeight: "700",
//           letterSpacing: 0.6,
//           textTransform: "uppercase",
//           color: colors.text + "99",
//           flex: 1,
//         }}
//       >
//         {title}
//       </Text>
//       {right}
//       {collapsible && <Chevron open={!!open} color={colors.muted} />}
//     </View>
//   );

//   if (!collapsible) return <View style={{ marginBottom: 8 }}>{content}</View>;

//   return (
//     <Pressable
//       onPress={onPress}
//       style={({ pressed }) => ({
//         marginBottom: 8,
//         opacity: pressed ? 0.7 : 1,
//       })}
//       accessibilityRole="button"
//       accessibilityLabel={`${title} section`}
//     >
//       {content}
//     </Pressable>
//   );
// }

// function GlassPanel({
//   children,
//   pad = 12,
// }: React.PropsWithChildren<{ pad?: number }>) {
//   const { colors, isDark } = useTheme() as any;
//   if (Platform.OS === "ios") {
//     return (
//       <View
//         style={{
//           borderRadius: 18,
//           overflow: "hidden",
//           borderWidth: 1,
//           borderColor: colors.border,
//         }}
//       >
//         <BlurView
//           tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
//           intensity={24}
//           style={{ padding: pad }}
//         >
//           {children}
//         </BlurView>
//       </View>
//     );
//   }
//   return (
//     <View
//       style={{
//         borderRadius: 18,
//         borderWidth: 1,
//         borderColor: colors.border,
//         backgroundColor: colors.card,
//         padding: pad,
//       }}
//     >
//       {children}
//     </View>
//   );
// }

// function RowButton({
//   label,
//   subtitle,
//   icon,
//   onPress,
// }: {
//   label: string;
//   subtitle?: string;
//   icon: keyof typeof Ionicons.glyphMap;
//   onPress: () => void;
// }) {
//   const { colors } = useTheme() as any;
//   return (
//     <Pressable
//       onPress={onPress}
//       style={({ pressed }) => ({
//         borderRadius: 14,
//         borderWidth: 1,
//         borderColor: colors.border,
//         padding: 12,
//         backgroundColor: pressed ? colors.card : "transparent",
//         flexDirection: "row",
//         alignItems: "center",
//         gap: 12,
//       })}
//     >
//       <View
//         style={{
//           width: 36,
//           height: 36,
//           borderRadius: 12,
//           alignItems: "center",
//           justifyContent: "center",
//           backgroundColor: colors.card,
//           borderWidth: 1,
//           borderColor: colors.border,
//         }}
//       >
//         <Ionicons name={icon} size={18} color={colors.text} />
//       </View>
//       <View style={{ flex: 1 }}>
//         <Text style={{ color: colors.text, fontWeight: "800" }}>{label}</Text>
//         {!!subtitle && (
//           <Text style={{ color: colors.muted, fontSize: 12 }}>{subtitle}</Text>
//         )}
//       </View>
//       <Ionicons name="chevron-forward" size={18} color={colors.muted} />
//     </Pressable>
//   );
// }

// /* ───────────────────────────── screen ───────────────────────────── */

// export default function AccountScreen() {
//   const { colors, isDark } = useTheme() as any;
//   const { user } = useAuth();
//   const router = useRouter();
//   const navigation = useNavigation();
//   const { isPro, isAdmin, isTester } = useEntitlements();

//   // Show native header with Done button (doesn't cover content)
//   useLayoutEffect(() => {
//     navigation.setOptions?.({
//       headerShown: true,
//       headerTitle: "Account",
//       headerLargeTitle: false,
//       headerRight: () => (
//         <Pressable
//           onPress={() => {
//             // If there's a back stack, go back; otherwise no-op
//             // @ts-ignore
//             if (navigation.canGoBack?.()) navigation.goBack();
//           }}
//           hitSlop={8}
//           style={{
//             paddingHorizontal: 10,
//             paddingVertical: 6,
//             borderRadius: 10,
//             backgroundColor: colors.buttonBg,
//           }}
//         >
//           <Text style={{ color: colors.buttonText, fontWeight: "900" }}>
//             Done
//           </Text>
//         </Pressable>
//       ),
//     });
//   }, [navigation, colors]);

//   // Earned badges live stream
//   const earned = useBadges(user?.uid);

//   // Celebration overlay (trigger by setting IDs)
//   const [celebrateIds, setCelebrateIds] = useState<string[]>([]);

//   const email = user?.email || "Signed-in user";
//   const verified = !!user?.emailVerified;

//   const name = useMemo(() => {
//     const at = email.indexOf("@");
//     return at > 0 ? email.slice(0, at) : email;
//   }, [email]);

//   async function onVerifyEmail() {
//     try {
//       const auth = getAuth();
//       const u = auth.currentUser;
//       if (!u) return;
//       await sendEmailVerification(u);
//       Alert.alert(
//         "Verification sent",
//         "Check your inbox for the verification email."
//       );
//     } catch (e: any) {
//       Alert.alert("Error", e?.message || "Could not send verification email.");
//     }
//   }

//   function onOpenPrivacy() {
//     Linking.openURL("https://example.com/privacy").catch(() => {});
//   }
//   function onOpenTerms() {
//     Linking.openURL("https://example.com/terms").catch(() => {});
//   }

//   // Collapsible sections
//   const [showEarned, setShowEarned] = useState(true);
//   const [showGlossary, setShowGlossary] = useState(true);

//   return (
//     <View style={{ flex: 1, backgroundColor: colors.background }}>
//       {/* soft background */}
//       <LinearGradient
//         colors={[
//           isDark ? "rgba(139,92,246,0.10)" : "rgba(59,130,246,0.10)",
//           "transparent",
//         ]}
//         style={{
//           position: "absolute",
//           top: -80,
//           left: -60,
//           right: -60,
//           height: 280,
//           transform: [{ rotate: "-6deg" }],
//         }}
//         pointerEvents="none"
//       />

//       <ScrollView
//         style={{ flex: 1 }}
//         contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 28 }}
//       >
//         {/* Profile header */}
//         <GlassPanel pad={14}>
//           <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
//             <View
//               style={{
//                 width: 48,
//                 height: 48,
//                 borderRadius: 16,
//                 alignItems: "center",
//                 justifyContent: "center",
//                 backgroundColor: isDark
//                   ? "rgba(255,255,255,0.08)"
//                   : "rgba(0,0,0,0.05)",
//                 borderWidth: 1,
//                 borderColor: colors.border,
//               }}
//             >
//               <Ionicons
//                 name="person-circle-outline"
//                 size={28}
//                 color={colors.text}
//               />
//             </View>

//             <View style={{ flex: 1 }}>
//               <Text
//                 style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}
//               >
//                 {name}
//               </Text>
//               <Text style={{ color: colors.muted, fontSize: 12 }}>{email}</Text>

//               <View
//                 style={{
//                   marginTop: 6,
//                   alignSelf: "flex-start",
//                   paddingHorizontal: 10,
//                   paddingVertical: 4,
//                   borderRadius: 999,
//                   borderWidth: 1,
//                   borderColor: verified ? "#10b98155" : "#f59e0b55",
//                   backgroundColor: verified ? "#10b98122" : "#f59e0b22",
//                 }}
//               >
//                 <Text
//                   style={{
//                     color: verified ? "#10b981" : "#f59e0b",
//                     fontWeight: "900",
//                     fontSize: 12,
//                   }}
//                 >
//                   {verified ? "Verified" : "Not verified"}
//                 </Text>
//               </View>
//             </View>

//             {!verified && (
//               <Pressable
//                 onPress={onVerifyEmail}
//                 style={{
//                   borderRadius: 12,
//                   paddingVertical: 8,
//                   paddingHorizontal: 12,
//                   backgroundColor: colors.buttonBg,
//                 }}
//               >
//                 <Text style={{ color: colors.buttonText, fontWeight: "900" }}>
//                   Verify
//                 </Text>
//               </Pressable>
//             )}
//           </View>
//         </GlassPanel>

//         {!isPro && (
//           <GlassPanel pad={14}>
//             <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
//               <View
//                 style={{
//                   width: 48,
//                   height: 48,
//                   borderRadius: 16,
//                   alignItems: "center",
//                   justifyContent: "center",
//                   backgroundColor: "rgba(124,58,237,0.12)",
//                   borderWidth: 1,
//                   borderColor: "rgba(124,58,237,0.45)",
//                 }}
//               >
//                 <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
//               </View>
//               <View style={{ flex: 1, gap: 4 }}>
//                 <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>
//                   Go Pro
//                 </Text>
//                 <Text style={{ color: colors.muted, fontWeight: "600" }}>
//                   Unlock AI features, templates, and generators. Admin/tester roles always
//                   unlock everything.
//                 </Text>
//               </View>
//               <Pressable
//                 onPress={() => router.push("/paywall")}
//                 style={({ pressed }) => ({
//                   paddingVertical: 10,
//                   paddingHorizontal: 14,
//                   borderRadius: 12,
//                   backgroundColor: pressed
//                     ? colors.primary
//                     : colors.primary,
//                 })}
//               >
//                 <Text style={{ color: colors.background, fontWeight: "900" }}>Upgrade</Text>
//               </Pressable>
//             </View>
//             {(isAdmin || isTester) && (
//               <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
//                 You’re flagged as {isAdmin ? "admin" : "tester"} — all features stay unlocked.
//               </Text>
//             )}
//           </GlassPanel>
//         )}

//         {/* Earned badges (collapsible) */}
//         <GlassPanel>
//           <SectionHeader
//             icon="trophy-outline"
//             title="Earned badges"
//             collapsible
//             open={showEarned}
//             onPress={() => setShowEarned((v) => !v)}
//           />
//           {showEarned && (
//             <>
//               {earned.length === 0 ? (
//                 <Text style={{ color: colors.muted }}>
//                   You haven’t earned any badges yet. Log meals or workouts to
//                   start.
//                 </Text>
//               ) : (
//                 <BadgeGrid earned={earned} />
//               )}
//             </>
//           )}
//         </GlassPanel>

//         {/* Glossary (collapsible) */}
//         <GlassPanel>
//           <SectionHeader
//             icon="information-circle-outline"
//             title="All badges"
//             collapsible
//             open={showGlossary}
//             onPress={() => setShowGlossary((v) => !v)}
//           />
//           {showGlossary && (
//             <View style={{ gap: 10 }}>
//               {Object.values(BADGES).map((b) => (
//                 <View
//                   key={b.id}
//                   style={{
//                     flexDirection: "row",
//                     alignItems: "center",
//                     gap: 10,
//                     borderWidth: 1,
//                     borderColor: colors.border,
//                     borderRadius: 12,
//                     padding: 10,
//                   }}
//                 >
//                   <View
//                     style={{
//                       width: 36,
//                       height: 36,
//                       borderRadius: 12,
//                       backgroundColor: `${b.color}22`,
//                       borderWidth: 1,
//                       borderColor: `${b.color}55`,
//                       alignItems: "center",
//                       justifyContent: "center",
//                     }}
//                   >
//                     <Ionicons name={b.icon} size={18} color={b.color} />
//                   </View>
//                   <View style={{ flex: 1 }}>
//                     <Text style={{ color: colors.text, fontWeight: "800" }}>
//                       {b.name}
//                     </Text>
//                     <Text style={{ color: colors.muted, fontSize: 12 }}>
//                       {b.desc}
//                     </Text>
//                   </View>
//                 </View>
//               ))}
//             </View>
//           )}
//         </GlassPanel>

//         {/* Actions */}
//         <GlassPanel>
//           <SectionHeader icon="settings-outline" title="Account Info" />
//           <View style={{ gap: 10 }}>
//             <RowButton
//               icon="color-palette-outline"
//               label="Theme & Settings"
//               subtitle="Choose light/dark and accents"
//               onPress={() => router.push("/settings")}
//             />
//             <RowButton
//               icon="lock-closed-outline"
//               label="Privacy Policy"
//               onPress={onOpenPrivacy}
//             />
//             <RowButton
//               icon="document-text-outline"
//               label="Terms of Use"
//               onPress={onOpenTerms}
//             />
//             <RowButton
//               icon="log-out-outline"
//               label="Sign out"
//               onPress={() => {
//                 Alert.alert("Sign out", "Are you sure you want to sign out?", [
//                   { text: "Cancel", style: "cancel" },
//                   {
//                     text: "Sign out",
//                     style: "destructive",
//                     onPress: async () => {
//                       try {
//                         await getAuth().signOut();
//                       } catch (e) {
//                         Alert.alert("Error", "Could not sign out. Try again.");
//                       }
//                     },
//                   },
//                 ]);
//               }}
//             />
//           </View>
//         </GlassPanel>
//       </ScrollView>

//       {/* Celebration modal */}
//       <BadgeCelebrate
//         ids={celebrateIds as any}
//         open={celebrateIds.length > 0}
//         onClose={() => setCelebrateIds([])}
//       />
//     </View>
//   );
// }

// app/(tabs)/account.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { getAuth, sendEmailVerification } from "firebase/auth";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";

import { AccountHeader } from "@/components/account(old)/AccountHeader";
import { AccountSection } from "@/components/account(old)/AccountSection";
import { AccountRow } from "@/components/account(old)/AccountRow";
import { ThemePickerSheet } from "@/components/account(old)/ThemePickerSheet";

import {
  getReduceMotion,
  setReduceMotion,
  getHapticsEnabled,
  setHapticsEnabled,
} from "@/services/account/preferences";
import { useEntitlements } from "@/content/useEntitlements";

export default function AccountScreen() {
  const router = useRouter();
  const { colors, isDark, modeSetting, setModeSetting } = useTheme();
  const { user } = useAuth() as any;

  const [reduceMotion, setReduceMotionState] = useState(false);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);

  const themeLabel = useMemo(() => {
    if (modeSetting === "system") return "System";
    if (modeSetting === "light") return "Light";
    return "Dark";
  }, [modeSetting]);
  const email = user?.email ?? "Signed-in user";
  const verified = !!user?.emailVerified;

  const { isPro, isAdmin, isTester } = useEntitlements();
  const hasPro = isPro || isAdmin || isTester;

  const doHaptic = useCallback(async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }, [hapticsEnabled]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [rm, h] = await Promise.all([
          getReduceMotion(),
          getHapticsEnabled(),
        ]);
        setReduceMotionState(rm);
        setHapticsEnabledState(h);
      })();
    }, [])
  );

  const onToggleReduceMotion = useCallback(
    async (v: boolean) => {
      await setReduceMotion(v);
      setReduceMotionState(v);
      doHaptic();
    },
    [doHaptic]
  );

  const onToggleHaptics = useCallback(async (v: boolean) => {
    await setHapticsEnabled(v);
    setHapticsEnabledState(v);
    if (v) {
      try {
        await Haptics.selectionAsync();
      } catch {}
    }
  }, []);
  const onVerifyEmail = useCallback(async () => {
    try {
      const auth = getAuth();
      const u = auth.currentUser;
      if (!u) return;

      await sendEmailVerification(u);

      Alert.alert(
        "Verification sent",
        "Check your inbox for the verification email."
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not send verification email.");
    }
  }, []);

  const onSignOut = useCallback(() => {
    Alert.alert("Sign out?", "You can sign back in anytime.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          doHaptic();
          try {
            await getAuth().signOut();
          } catch {
            Alert.alert("Error", "Could not sign out. Try again.");
          }
        },
      },
    ]);
  }, [doHaptic]);

  const onDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete account?",
      "This permanently removes your account and data. This can’t be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            doHaptic();
            Alert.alert(
              "Not wired yet",
              "Recommended: re-auth -> call Cloud Function -> delete user + data -> confirm."
            );
          },
        },
      ]
    );
  }, [doHaptic]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* calm premium background */}
      <LinearGradient
        colors={[colors.background, isDark ? "#07090d" : "#eef1f6"]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Account</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Manage your identity, preferences, and privacy.
        </Text>

        <AccountHeader
          displayName={user?.displayName}
          email={user?.email}
          photoURL={user?.photoURL}
          onPressEdit={() => {
            doHaptic();
            router.push("/account/edit-profile");
          }}
        />
        {/* Identity */}
        <AccountSection
          title="Identity"
          footer="Verification helps protect your account and enables trusted sharing."
        >
          <AccountRow
            icon="mail-outline"
            label="Email"
            value={email}
            right="none"
            hint={verified ? "Verified" : "Not verified"}
          />

          {!verified ? (
            <AccountRow
              icon="checkmark-circle-outline"
              label="Verify Email"
              hint="Send a verification email"
              onPress={() => {
                doHaptic();
                onVerifyEmail();
              }}
            />
          ) : null}
        </AccountSection>

        {/* Personal */}
        <AccountSection
          title="Personal"
          footer="Your personal details are used for account access and personalization."
        >
          <AccountRow
            icon="person-outline"
            label="Edit Profile"
            hint="Name, photo, and basics"
            onPress={() => {
              doHaptic();
              router.push("/account/edit-profile");
            }}
          />
          <AccountRow
            icon="card-outline"
            label="Subscription"
            value={hasPro ? "Premium" : "Free"}
            hint={
              hasPro
                ? "Manage billing, plan, and renewal"
                : "Upgrade to unlock premium features"
            }
            onPress={() => {
              doHaptic();
              router.push(hasPro ? "/account/subscription" : "/paywall");
            }}
          />
        </AccountSection>

        {/* Appearance */}
        <AccountSection
          title="Appearance"
          footer="Calm visuals, consistent contrast, and respectful motion."
        >
          <AccountRow
            icon="color-palette-outline"
            label="Theme"
            value={themeLabel}
            hint="System, Light, or Dark"
            onPress={() => {
              doHaptic();
              setThemeSheetOpen(true);
            }}
          />
          <AccountRow
            icon="walk-outline"
            label="Reduce Motion"
            hint="Minimize animations and transitions"
            toggle
            right="none"
            toggleValue={reduceMotion}
            onToggleChange={onToggleReduceMotion}
          />
          <AccountRow
            icon="finger-print-outline"
            label="Haptics"
            hint="Subtle feedback for important actions"
            toggle
            right="none"
            toggleValue={hapticsEnabled}
            onToggleChange={onToggleHaptics}
          />
        </AccountSection>

        {/* Badges */}
        <AccountSection
          title="Badges & Achievements"
          footer="Celebrate consistency. Badges are earned automatically from your activity."
        >
          <AccountRow
            icon="trophy-outline"
            label="View Badges"
            hint="Streaks, milestones, and challenges"
            onPress={() => {
              doHaptic();
              router.push("/(modals)/badges");
            }}
          />
        </AccountSection>

        {/* Privacy & Legal */}
        <AccountSection
          title="Privacy & Legal"
          footer="We keep things transparent and easy to understand."
        >
          <AccountRow
            icon="shield-checkmark-outline"
            label="Privacy"
            hint="Controls, visibility, and data handling"
            onPress={() => {
              doHaptic();
              router.push("/account/privacy");
            }}
          />
          <AccountRow
            icon="document-text-outline"
            label="Terms & Legal"
            hint="Terms of service and notices"
            onPress={() => {
              doHaptic();
              router.push("/account/legal");
            }}
          />
          <AccountRow
            icon="download-outline"
            label="Export Your Data"
            hint="Request a copy of your data"
            onPress={() => {
              doHaptic();
              Alert.alert(
                "Data export",
                "Wire this to a backend export flow (email link is ideal)."
              );
            }}
          />
        </AccountSection>

        {/* Account management */}
        <AccountSection
          title="Account"
          footer="Sensitive actions are protected and require confirmation."
        >
          <AccountRow
            icon="log-out-outline"
            label="Sign Out"
            hint="Sign out on this device"
            danger
            onPress={onSignOut}
          />
          <AccountRow
            icon="trash-outline"
            label="Delete Account"
            hint="Permanently delete your account and data"
            danger
            onPress={onDeleteAccount}
          />
        </AccountSection>

        <Text style={[styles.disclaimer, { color: colors.muted }]}>
          Tip: For the safest experience, use device screen lock and a strong
          password.
        </Text>

        <View style={{ height: 26 }} />
      </ScrollView>

      <ThemePickerSheet
        visible={themeSheetOpen}
        value={modeSetting}
        onClose={() => setThemeSheetOpen(false)}
        onChange={(m) => {
          setModeSetting(m); // ✅ uses your ThemeProvider persistence
          doHaptic();
          setThemeSheetOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: 6,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  disclaimer: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 6,
    fontWeight: "600",
  },
});
