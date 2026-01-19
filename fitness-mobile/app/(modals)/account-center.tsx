// app/(modals)/account-center.tsx
// Drop-in ✅ Premium Account Center modal
// Depends on: expo-router, expo-linear-gradient, expo-blur, expo-haptics, firebase/auth
// Uses: useTheme, useAuth, useEntitlements, services/account/preferences (haptics/reduce motion)
// Optional: services/account/accountCenterSettings (included below) for privacy/social persistence

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  unlink,
  EmailAuthProvider,
} from "firebase/auth";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { useEntitlements } from "@/content/useEntitlements";

import {
  getHapticsEnabled,
  getReduceMotion,
} from "@/services/account/preferences";

import {
  AccountCenterHeader,
  type AccountCenterHeaderModel,
} from "@/components/accountCenter/AccountCenterHeader";
import { AccountCenterSection } from "@/components/accountCenter/AccountCenterSection";
import { AccountCenterRow } from "@/components/accountCenter/AccountCenterRow";

import {
  type AccountCenterPrivacySettings,
  getAccountCenterPrivacySettings,
  setAccountCenterPrivacySettings,
  DEFAULT_PRIVACY_SETTINGS,
} from "@/services/account/accountCenterSettings";

function safeOpen(url: string) {
  Linking.openURL(url).catch(() => {});
}

function deriveDisplayName(user: any) {
  const dn = user?.displayName;
  if (dn && dn.trim().length > 0) return dn.trim();
  const email = user?.email || "";
  const at = email.indexOf("@");
  if (at > 0) return email.slice(0, at);
  return "Account";
}

function providerLabel(id?: string) {
  if (!id) return "Unknown";
  if (id.includes("google")) return "Google";
  if (id.includes("apple")) return "Apple";
  if (id.includes("password")) return "Email + Password";
  if (id.includes("facebook")) return "Facebook";
  if (id.includes("github")) return "GitHub";
  return id;
}

export default function AccountCenterModal() {
  const router = useRouter();
  const { colors, isDark, modeSetting, setModeSetting } = useTheme() as any;
  const { user } = useAuth() as any;
  const { isPro, isAdmin, isTester } = useEntitlements();

  const hasPro = isPro || isAdmin || isTester;

  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [reduceMotion, setReduceMotionState] = useState(false);

  const [privacy, setPrivacy] = useState<AccountCenterPrivacySettings>(
    DEFAULT_PRIVACY_SETTINGS
  );
  const [privacyLoaded, setPrivacyLoaded] = useState(false);

  // Load local prefs + privacy settings once (no background promises; done on first render tick)
  useMemo(() => {
    (async () => {
      try {
        const [h, rm] = await Promise.all([
          getHapticsEnabled(),
          getReduceMotion(),
        ]);
        setHapticsEnabledState(h);
        setReduceMotionState(rm);
      } catch {}
      try {
        const next = await getAccountCenterPrivacySettings(user?.uid);
        setPrivacy(next);
      } catch {
        setPrivacy(DEFAULT_PRIVACY_SETTINGS);
      } finally {
        setPrivacyLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const doHaptic = useCallback(
    async (type: "light" | "select" | "warn" = "select") => {
      if (!hapticsEnabled) return;
      try {
        if (type === "light") {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (type === "warn") {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          );
        } else {
          await Haptics.selectionAsync();
        }
      } catch {}
    },
    [hapticsEnabled]
  );

  const headerModel: AccountCenterHeaderModel = useMemo(() => {
    const signedIn = !!user?.uid;
    const email = user?.email || "Sign in to sync across devices";
    const verified = !!user?.emailVerified;

    return {
      signedIn,
      displayName: signedIn ? deriveDisplayName(user) : "Guest",
      email,
      photoURL: user?.photoURL,
      verified,
      planLabel: hasPro ? "Pro" : "Free",
      planHint: hasPro
        ? "Premium features unlocked"
        : "Upgrade to unlock premium features",
    };
  }, [user, hasPro]);

  const themeLabel = useMemo(() => {
    if (modeSetting === "system") return "System";
    if (modeSetting === "light") return "Light";
    return "Dark";
  }, [modeSetting]);

  const providers = useMemo(() => {
    const list = (user?.providerData || [])
      .map((p: any) => p?.providerId)
      .filter(Boolean) as string[];
    // If user is present but providerData empty (rare), infer by email presence
    if (user?.uid && list.length === 0 && user?.email) return ["password"];
    return Array.from(new Set(list));
  }, [user?.providerData, user?.uid, user?.email]);

  const canResetPassword = providers.includes("password") && !!user?.email;

  const onClose = useCallback(() => {
    doHaptic("light");
    router.back();
  }, [doHaptic, router]);

  const onVerifyEmail = useCallback(async () => {
    try {
      const auth = getAuth();
      const u = auth.currentUser;
      if (!u) return;
      await sendEmailVerification(u);
      doHaptic("select");
      Alert.alert(
        "Verification sent",
        "Check your inbox for the verification email."
      );
    } catch (e: any) {
      Alert.alert(
        "Couldn’t send email",
        e?.message || "Try again in a moment."
      );
    }
  }, [doHaptic]);

  const onPasswordReset = useCallback(async () => {
    try {
      const email = user?.email;
      if (!email) return;
      await sendPasswordResetEmail(getAuth(), email);
      doHaptic("select");
      Alert.alert(
        "Reset email sent",
        "Check your inbox for the password reset link."
      );
    } catch (e: any) {
      Alert.alert(
        "Couldn’t send reset email",
        e?.message || "Try again in a moment."
      );
    }
  }, [user?.email, doHaptic]);

  const onTogglePrivacy = useCallback(
    async (patch: Partial<AccountCenterPrivacySettings>) => {
      const next = { ...privacy, ...patch };
      setPrivacy(next);
      doHaptic("select");
      try {
        await setAccountCenterPrivacySettings(user?.uid, next);
      } catch {
        // keep UI optimistic; storage failure isn’t fatal for a preferences screen
      }
    },
    [privacy, user?.uid, doHaptic]
  );

  const onManagePlan = useCallback(() => {
    doHaptic("select");
    router.push(hasPro ? "/account/subscription" : "/paywall");
  }, [doHaptic, router, hasPro]);

  const onEditProfile = useCallback(() => {
    doHaptic("select");
    router.push("/account/edit-profile");
  }, [doHaptic, router]);

  const onSignIn = useCallback(() => {
    doHaptic("select");
    router.push("/(modals)/auth"); // change route if yours differs
  }, [doHaptic, router]);

  const onSignOut = useCallback(() => {
    Alert.alert("Sign out?", "You can sign back in anytime.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          doHaptic("warn");
          try {
            await getAuth().signOut();
          } catch {
            Alert.alert("Error", "Could not sign out. Try again.");
          }
        },
      },
    ]);
  }, [doHaptic]);

  const onExportData = useCallback(() => {
    doHaptic("select");
    Alert.alert(
      "Export your data",
      "Recommended flow: generate an export (JSON/CSV) on the server and email a secure download link."
    );
  }, [doHaptic]);

  const onDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete account?",
      "This permanently removes your account and data. This can’t be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            doHaptic("warn");
            Alert.alert(
              "Not wired yet",
              "Recommended: re-authenticate → call a Cloud Function to delete user + all related data → confirm."
            );
          },
        },
      ]
    );
  }, [doHaptic]);

  const onUnlinkProvider = useCallback(
    async (providerId: string) => {
      Alert.alert(
        "Remove sign-in method?",
        `This will remove ${providerLabel(providerId)} from your account.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                doHaptic("warn");
                const auth = getAuth();
                const u = auth.currentUser;
                if (!u) return;
                // Prevent removing the last sign-in method
                const currentProviders = Array.from(
                  new Set(
                    (u.providerData || [])
                      .map((p: any) => p?.providerId)
                      .filter(Boolean)
                  )
                );
                if (currentProviders.length <= 1) {
                  Alert.alert(
                    "Keep at least one method",
                    "You need at least one sign-in method to access your account."
                  );
                  return;
                }
                await unlink(u, providerId as any);
                Alert.alert("Removed", "Sign-in method removed.");
              } catch (e: any) {
                Alert.alert(
                  "Couldn’t remove",
                  e?.message || "Try again in a moment."
                );
              }
            },
          },
        ]
      );
    },
    [doHaptic]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* calm premium backdrop */}
      <LinearGradient
        colors={[
          isDark ? "#05070c" : "#eef2f8",
          isDark ? "rgba(139,92,246,0.14)" : "rgba(59,130,246,0.12)",
          "transparent",
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* top chrome (glass) */}
      <View style={styles.chrome}>
        <View style={styles.chromeInner}>
          <Text style={[styles.chromeTitle, { color: colors.text }]}>
            Account Center
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.doneBtn,
              {
                backgroundColor: pressed
                  ? isDark
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.06)"
                  : isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.04)",
                borderColor: colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close account center"
          >
            <Text style={{ color: colors.text, fontWeight: "900" }}>Done</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AccountCenterHeader
          model={headerModel}
          onPressEdit={headerModel.signedIn ? onEditProfile : onSignIn}
          onPressPlan={onManagePlan}
          reduceMotion={reduceMotion}
        />

        {/* Identity */}
        <AccountCenterSection
          title="Identity"
          subtitle="Your identity is used for account access and trusted sharing."
        >
          <AccountCenterRow
            icon="person-outline"
            label="Name"
            value={headerModel.displayName}
            onPress={headerModel.signedIn ? onEditProfile : onSignIn}
            hint={
              headerModel.signedIn
                ? "Edit personal details"
                : "Sign in to personalize"
            }
          />
          <AccountCenterRow
            icon="mail-outline"
            label="Email"
            value={headerModel.email}
            hint={
              headerModel.signedIn
                ? headerModel.verified
                  ? "Verified"
                  : "Not verified"
                : "Not signed in"
            }
            right="none"
          />
          {headerModel.signedIn && !headerModel.verified ? (
            <AccountCenterRow
              icon="checkmark-circle-outline"
              label="Verify email"
              hint="Send a verification email"
              onPress={onVerifyEmail}
            />
          ) : null}
        </AccountCenterSection>

        {/* Membership */}
        <AccountCenterSection
          title="Membership"
          subtitle="Plan controls, billing, and premium access."
          footer={
            hasPro
              ? "You’re on Pro. Enjoy AI features, premium templates, and advanced insights."
              : "Free plan. Upgrade anytime to unlock Pro features."
          }
        >
          <AccountCenterRow
            icon="sparkles-outline"
            label="Plan"
            value={hasPro ? "Pro" : "Free"}
            hint={hasPro ? "Manage billing & renewal" : "Upgrade to Pro"}
            onPress={onManagePlan}
          />
          {(isAdmin || isTester) && (
            <View style={styles.inlineNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={colors.muted}
              />
              <Text style={[styles.inlineNoteText, { color: colors.muted }]}>
                You’re flagged as {isAdmin ? "admin" : "tester"} — premium stays
                unlocked.
              </Text>
            </View>
          )}
        </AccountCenterSection>

        {/* Security */}
        <AccountCenterSection
          title="Security"
          subtitle="Sign-in methods, password, and account safety."
          footer="Tip: Use device screen lock and a strong password for the safest experience."
        >
          <AccountCenterRow
            icon="key-outline"
            label="Sign-in methods"
            value={providers.length ? `${providers.length} linked` : "—"}
            hint={
              headerModel.signedIn
                ? "Manage how you sign in"
                : "Sign in to manage methods"
            }
            onPress={() => {
              doHaptic("select");
              if (!headerModel.signedIn) return onSignIn();
              router.push("/account/security");
            }}
          />

          {headerModel.signedIn ? (
            <>
              {canResetPassword ? (
                <AccountCenterRow
                  icon="lock-closed-outline"
                  label="Reset password"
                  hint="Send a reset email"
                  onPress={onPasswordReset}
                />
              ) : (
                <AccountCenterRow
                  icon="lock-closed-outline"
                  label="Password"
                  hint="Not available for this sign-in method"
                  right="none"
                />
              )}

              {/* Inline provider chips */}
              <View
                style={[
                  styles.providerWrap,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                  },
                ]}
              >
                <Text style={[styles.providerTitle, { color: colors.muted }]}>
                  Linked methods
                </Text>
                <View style={styles.providerChips}>
                  {providers.length ? (
                    providers.map((pid) => (
                      <Pressable
                        key={pid}
                        onPress={() => onUnlinkProvider(pid)}
                        style={({ pressed }) => [
                          styles.providerChip,
                          {
                            borderColor: colors.border,
                            backgroundColor: pressed
                              ? isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(0,0,0,0.06)"
                              : isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Manage ${providerLabel(
                          pid
                        )} sign-in`}
                      >
                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "800",
                            fontSize: 12,
                          }}
                        >
                          {providerLabel(pid)}
                        </Text>
                        <Ionicons
                          name="close-circle"
                          size={14}
                          color={colors.muted}
                        />
                      </Pressable>
                    ))
                  ) : (
                    <Text style={{ color: colors.muted, fontWeight: "700" }}>
                      No methods listed.
                    </Text>
                  )}
                </View>

                <Text style={[styles.providerHint, { color: colors.muted }]}>
                  Tap a method to remove it. Keep at least one active.
                </Text>
              </View>
            </>
          ) : null}
        </AccountCenterSection>

        {/* Privacy & Social */}
        <AccountCenterSection
          title="Privacy & Social"
          subtitle="Control what’s visible and how your activity can be shared."
          footer="We aim for calm, non-judgmental defaults. You’re always in control."
        >
          <AccountCenterRow
            icon="eye-outline"
            label="Profile visibility"
            value={
              privacy.profileVisibility === "private"
                ? "Private"
                : privacy.profileVisibility === "friends"
                ? "Friends"
                : "Public"
            }
            hint={!privacyLoaded ? "Loading…" : "Who can see your profile"}
            onPress={() => {
              doHaptic("select");
              if (!headerModel.signedIn) return onSignIn();

              const options: any[] = [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Private",
                  onPress: () =>
                    onTogglePrivacy({ profileVisibility: "private" }),
                },
                {
                  text: "Friends",
                  onPress: () =>
                    onTogglePrivacy({ profileVisibility: "friends" }),
                },
                {
                  text: "Public",
                  onPress: () =>
                    onTogglePrivacy({ profileVisibility: "public" }),
                },
              ];
              Alert.alert(
                "Profile visibility",
                "Choose who can see your profile.",
                options
              );
            }}
          />

          <AccountCenterRow
            icon="barbell-outline"
            label="Share workouts"
            toggle
            toggleValue={privacy.shareWorkouts}
            onToggleChange={(v) => onTogglePrivacy({ shareWorkouts: v })}
            hint="Allow sharing workout summaries"
            disabled={!headerModel.signedIn}
          />
          <AccountCenterRow
            icon="nutrition-outline"
            label="Share nutrition"
            toggle
            toggleValue={privacy.shareNutrition}
            onToggleChange={(v) => onTogglePrivacy({ shareNutrition: v })}
            hint="Allow sharing nutrition summaries"
            disabled={!headerModel.signedIn}
          />
          <AccountCenterRow
            icon="flame-outline"
            label="Share streaks"
            toggle
            toggleValue={privacy.shareStreaks}
            onToggleChange={(v) => onTogglePrivacy({ shareStreaks: v })}
            hint="Allow sharing streak milestones"
            disabled={!headerModel.signedIn}
          />

          {!headerModel.signedIn ? (
            <View style={styles.inlineNote}>
              <Ionicons
                name="lock-closed-outline"
                size={14}
                color={colors.muted}
              />
              <Text style={[styles.inlineNoteText, { color: colors.muted }]}>
                Sign in to sync privacy settings across devices.
              </Text>
            </View>
          ) : null}
        </AccountCenterSection>

        {/* Badges */}
        <AccountCenterSection
          title="Badges & Achievements"
          subtitle="Celebrate consistency. Badges are earned automatically from your activity."
        >
          <AccountCenterRow
            icon="trophy-outline"
            label="View badges"
            hint="Streaks, milestones, challenges"
            onPress={() => {
              doHaptic("select");
              router.push("/(modals)/badges");
            }}
          />
        </AccountCenterSection>

        {/* Appearance */}
        <AccountCenterSection
          title="Appearance"
          subtitle="Calm visuals, consistent contrast, and respectful motion."
        >
          <AccountCenterRow
            icon="color-palette-outline"
            label="Theme"
            value={themeLabel}
            hint="System, Light, or Dark"
            onPress={() => {
              doHaptic("select");
              // If you prefer a sheet, route to your Settings modal instead.
              router.push("/settings");
            }}
          />
          <AccountCenterRow
            icon="walk-outline"
            label="Reduce motion"
            value={reduceMotion ? "On" : "Off"}
            hint="Minimize animations and transitions"
            onPress={() => {
              doHaptic("select");
              router.push("/settings"); // keep motion controls centralized
            }}
          />
          <AccountCenterRow
            icon="finger-print-outline"
            label="Haptics"
            value={hapticsEnabled ? "On" : "Off"}
            hint="Subtle feedback for important actions"
            onPress={() => {
              doHaptic("select");
              router.push("/settings"); // keep haptics centralized
            }}
          />
        </AccountCenterSection>

        {/* Data controls */}
        <AccountCenterSection
          title="Data controls"
          subtitle="Export, portability, and account deletion."
          footer="Sensitive actions are protected and require confirmation."
        >
          <AccountCenterRow
            icon="download-outline"
            label="Export your data"
            hint="Request a copy of your data"
            onPress={onExportData}
            disabled={!headerModel.signedIn}
          />
          <AccountCenterRow
            icon="trash-outline"
            label="Delete account"
            hint="Permanently delete your account and data"
            danger
            onPress={onDeleteAccount}
            disabled={!headerModel.signedIn}
          />
          {!headerModel.signedIn ? (
            <Text style={[styles.smallMuted, { color: colors.muted }]}>
              Sign in to export or delete your account.
            </Text>
          ) : null}
        </AccountCenterSection>

        {/* Legal */}
        <AccountCenterSection
          title="Legal"
          subtitle="Clear policies and transparent handling."
        >
          <AccountCenterRow
            icon="shield-checkmark-outline"
            label="Privacy policy"
            hint="How we handle your data"
            onPress={() => safeOpen("https://example.com/privacy")}
          />
          <AccountCenterRow
            icon="document-text-outline"
            label="Terms of service"
            hint="The legal stuff, kept readable"
            onPress={() => safeOpen("https://example.com/terms")}
          />
        </AccountCenterSection>

        {/* Account actions */}
        <AccountCenterSection title="Account" subtitle="Session and sign-in.">
          {headerModel.signedIn ? (
            <AccountCenterRow
              icon="log-out-outline"
              label="Sign out"
              hint="Sign out on this device"
              danger
              onPress={onSignOut}
            />
          ) : (
            <AccountCenterRow
              icon="log-in-outline"
              label="Sign in"
              hint="Sync your data across devices"
              onPress={onSignIn}
            />
          )}
        </AccountCenterSection>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: {
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingHorizontal: 14,
  },
  chromeInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 6,
  },
  chromeTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  doneBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  content: {
    paddingTop: 8,
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  inlineNote: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineNoteText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    flex: 1,
  },
  providerWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  providerTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  providerChips: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  providerChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  providerHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  smallMuted: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
