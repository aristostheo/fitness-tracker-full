import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "@/content/AuthContext";
import {
  connectedCount,
  formatLastSync,
  INTEGRATIONS,
  markPrimaryIntegration,
  runIntegrationSync,
  setIntegrationConnected,
  subscribeIntegrations,
  updateIntegrationSettings,
  type ConflictPolicy,
  type IntegrationDef,
  type IntegrationSnapshot,
  type SyncFrequency,
} from "@/services/integrations";

const C = {
  bg: "#0D0D0F",
  card: "#1A1A24",
  card2: "#202033",
  text: "#F6F7FF",
  muted: "rgba(246,247,255,0.66)",
  hairline: "rgba(255,255,255,0.10)",
  purple: "#6C63FF",
  blue: "#4DA3FF",
  green: "#4CAF50",
  amber: "#FFC107",
  red: "#F44336",
  gray: "#2A2A35",
};

function alpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${Math.max(0, Math.min(1, a))})`;
}

export default function IntegrationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<IntegrationSnapshot>({
    connections: {},
    settings: {
      frequency: "15min",
      conflictPolicy: "highest",
      backgroundSync: false,
      activeCaloriesAdjustment: false,
      onboardingDone: false,
    },
  });
  const [detail, setDetail] = useState<IntegrationDef | null>(null);

  useEffect(() => subscribeIntegrations(setSnapshot), []);

  const health = INTEGRATIONS.filter((x) => x.group === "health");
  const wearables = INTEGRATIONS.filter((x) => x.group === "wearable");
  const scales = INTEGRATIONS.filter((x) => x.group === "scale");

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 44,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Header onBack={() => router.replace("/(tabs)/profile")} />
        <InfoBanner />

        {!snapshot.settings.onboardingDone ? (
          <OnboardingCard
            onDone={() => updateIntegrationSettings({ onboardingDone: true })}
          />
        ) : null}

        <Section title="Primary Health Platforms">
          {health.map((x) => (
            <IntegrationCard
              key={x.id}
              item={x}
              snapshot={snapshot}
              uid={user?.uid}
              onDetail={() => setDetail(x)}
            />
          ))}
          <Note text="⚠ If both apps log food, disable one to avoid duplicates." />
        </Section>

        <Section title="Wearable Devices">
          {wearables.map((x) => (
            <IntegrationCard
              key={x.id}
              item={x}
              snapshot={snapshot}
              uid={user?.uid}
              onDetail={() => setDetail(x)}
            />
          ))}
        </Section>

        <Section title="Smart Scale Integrations">
          {scales.map((x) => (
            <IntegrationCard
              key={x.id}
              item={x}
              snapshot={snapshot}
              uid={user?.uid}
              onDetail={() => setDetail(x)}
            />
          ))}
          <Note text="New weigh-ins update Profile body metrics and feed Long-term Progress." />
        </Section>

        <SyncSettings snapshot={snapshot} uid={user?.uid} />

        <Text style={{ color: C.muted, fontWeight: "800", lineHeight: 18 }}>
          Connected sources update Home steps and burn, Nutrition calorie adjustments, detected Workouts, Insights trends, and Profile weight fields through the background sync service.
        </Text>
      </ScrollView>

      <DetailSheet item={detail} snapshot={snapshot} onClose={() => setDetail(null)} />
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable onPress={onBack} style={iconButton()} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={20} color={C.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 30 }}>Integrations</Text>
        <Text style={{ color: C.muted, fontWeight: "800", marginTop: 3, lineHeight: 18 }}>
          Connected apps sync automatically in the background. Your data stays private.
        </Text>
      </View>
    </View>
  );
}

function InfoBanner() {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: alpha(C.blue, 0.28),
        backgroundColor: alpha(C.blue, 0.1),
        padding: 12,
        flexDirection: "row",
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 16 }}>ℹ️</Text>
      <Text style={{ color: C.text, fontWeight: "800", flex: 1, lineHeight: 18 }}>
        We only read data you approve. Nothing is shared without your permission.
      </Text>
    </View>
  );
}

function OnboardingCard({ onDone }: { onDone: () => void }) {
  const steps = [
    ["Choose your sources", "Select which apps and devices you use."],
    ["Approve permissions", "We request only what you select."],
    ["Done", "Your data syncs automatically."],
  ];
  return (
    <LinearGradient
      colors={[alpha(C.purple, 0.22), alpha(C.blue, 0.08)]}
      style={{ borderRadius: 24, padding: 1 }}
    >
      <View style={{ borderRadius: 23, backgroundColor: C.card, padding: 14, gap: 12 }}>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 17 }}>Set up health sync</Text>
        {steps.map((s, i) => (
          <View key={s[0]} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: alpha(C.purple, 0.22), alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.text, fontWeight: "900" }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: "900" }}>{s[0]}</Text>
              <Text style={{ color: C.muted, fontWeight: "800", marginTop: 2 }}>{s[1]}</Text>
            </View>
          </View>
        ))}
        <Pressable onPress={onDone} style={primaryButton()}>
          <Text style={{ color: C.text, fontWeight: "900" }}>Start choosing sources</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 300 }}
      style={{ gap: 10 }}
    >
      <Text style={{ color: C.muted, fontWeight: "900", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>
        {title}
      </Text>
      {children}
    </MotiView>
  );
}

function IntegrationCard({
  item,
  snapshot,
  uid,
  onDetail,
}: {
  item: IntegrationDef;
  snapshot: IntegrationSnapshot;
  uid?: string;
  onDetail: () => void;
}) {
  const conn = snapshot.connections[item.id];
  const connected = !!conn?.connected;
  const status = conn?.status || "disconnected";
  const warning = status === "warning";
  const error = status === "error";
  const hiddenByPlatform =
    (item.platform === "ios" && Platform.OS !== "ios") ||
    (item.platform === "android" && Platform.OS !== "android");
  const chipColor = error ? C.red : warning ? C.amber : connected ? C.green : C.muted;
  return (
    <Pressable
      onPress={onDetail}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name} details`}
      style={({ pressed }) => ({
        borderRadius: 22,
        borderWidth: 1,
        borderColor: error ? alpha(C.red, 0.35) : C.hairline,
        backgroundColor: pressed ? C.card2 : C.card,
        padding: 14,
        gap: 10,
        opacity: hiddenByPlatform ? 0.58 : 1,
      })}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <View style={{ width: 46, height: 46, borderRadius: 17, backgroundColor: item.iconBg, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={item.icon as any} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 15 }}>{item.name}</Text>
            {conn?.primary ? <Chip text="Primary source" color={C.purple} /> : null}
          </View>
          <Text style={{ color: C.muted, fontWeight: "800", marginTop: 4 }} numberOfLines={2}>
            {hiddenByPlatform ? `Available on ${item.platform === "ios" ? "iOS" : "Android"}` : item.description}
          </Text>
        </View>
        <Switch
          value={connected}
          disabled={hiddenByPlatform}
          onValueChange={(next) => {
            setIntegrationConnected(item.id, next, uid).catch(() => {});
          }}
          trackColor={{ false: C.gray, true: alpha(C.green, 0.46) }}
          thumbColor={connected ? C.green : "#9CA3AF"}
        />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {connected ? (
          <>
            <Chip text={error ? "Sync error" : warning ? "⚠ Reconnect needed" : status === "syncing" ? "Syncing" : "Connected"} color={chipColor} />
            <Text style={{ color: C.muted, fontWeight: "800" }}>Last synced: {formatLastSync(conn?.lastSyncedAt)}</Text>
            {error || warning ? <Text style={{ color: C.amber, fontWeight: "900" }}>Fix →</Text> : null}
          </>
        ) : (
          <Pressable
            onPress={() => {
              setIntegrationConnected(item.id, true, uid).catch(() => {});
            }}
            disabled={hiddenByPlatform}
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: alpha(C.purple, 0.18), borderWidth: 1, borderColor: alpha(C.purple, 0.34) }}
          >
            <Text style={{ color: C.text, fontWeight: "900" }}>Connect →</Text>
          </Pressable>
        )}
        {!connected && (warning || error) ? (
          <>
            <Chip text={error ? "Sync error" : "Setup needed"} color={chipColor} />
            <Text style={{ color: warning ? C.amber : C.red, fontWeight: "800", flex: 1 }} numberOfLines={2}>
              {conn?.lastError || "Could not connect this source."}
            </Text>
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

function DetailSheet({ item, snapshot, onClose }: { item: IntegrationDef | null; snapshot: IntegrationSnapshot; onClose: () => void }) {
  if (!item) return null;
  const conn = snapshot.connections[item.id];
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.62)", justifyContent: "flex-end" }}>
        <View style={{ borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: C.card, borderWidth: 1, borderColor: C.hairline, padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: item.iconBg, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={item.icon as any} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: "900", fontSize: 20 }}>{item.name}</Text>
              <Text style={{ color: C.muted, fontWeight: "800", marginTop: 2 }}>{item.description}</Text>
            </View>
            <Pressable onPress={onClose} style={iconButton()}>
              <Ionicons name="close" size={20} color={C.text} />
            </Pressable>
          </View>
          <Text style={{ color: C.text, fontWeight: "900" }}>Data fields read</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {item.fields.map((f) => <Chip key={f} text={f} color={C.purple} />)}
          </View>
          <View style={{ borderRadius: 18, backgroundColor: C.card2, borderWidth: 1, borderColor: C.hairline, padding: 12, gap: 8 }}>
            <Text style={{ color: C.text, fontWeight: "900" }}>Data flow</Text>
            <Text style={{ color: C.muted, fontWeight: "800", lineHeight: 18 }}>
              This app reads approved fields from {item.name}. It never writes back without your permission.
            </Text>
          </View>
          {item.primaryEligible && conn?.connected ? (
            <Pressable onPress={() => markPrimaryIntegration(item.id)} style={primaryButton()}>
              <Text style={{ color: C.text, fontWeight: "900" }}>Set as primary source</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function SyncSettings({ snapshot, uid }: { snapshot: IntegrationSnapshot; uid?: string }) {
  const frequencyOptions: SyncFrequency[] = ["live", "15min", "hourly", "manual"];
  const conflictOptions: Array<{ key: ConflictPolicy; label: string }> = [
    { key: "highest", label: "Highest value" },
    { key: "recent", label: "Most recent" },
    { key: "apple", label: "Prefer Apple Health" },
    { key: "ask", label: "Ask me" },
  ];
  return (
    <Section title="Sync Settings">
      <View style={{ borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.hairline, padding: 14, gap: 14 }}>
        <SettingLabel title="Sync frequency" />
        <Segmented
          value={snapshot.settings.frequency}
          options={frequencyOptions.map((x) => ({ key: x, label: x === "15min" ? "Every 15min" : x === "live" ? "Live" : x === "hourly" ? "Hourly" : "Manual" }))}
          onChange={(v) => updateIntegrationSettings({ frequency: v as SyncFrequency })}
        />
        <SettingLabel title="Data conflict resolution" subtitle="If two sources report different step counts, which wins?" />
        <Segmented
          value={snapshot.settings.conflictPolicy}
          options={conflictOptions}
          onChange={(v) => updateIntegrationSettings({ conflictPolicy: v as ConflictPolicy })}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <SettingLabel title="Background sync" subtitle="Allow sync when app is closed. May use extra battery." />
          </View>
          <Switch
            value={snapshot.settings.backgroundSync}
            onValueChange={(v) => updateIntegrationSettings({ backgroundSync: v })}
            trackColor={{ false: C.gray, true: alpha(C.purple, 0.42) }}
            thumbColor={snapshot.settings.backgroundSync ? C.purple : "#9CA3AF"}
          />
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: 12, gap: 8 }}>
          <Text style={{ color: C.text, fontWeight: "900" }}>
            Last full sync
          </Text>
          <Text style={{ color: C.muted, fontWeight: "800" }}>
            All sources last synced: {formatLastSync(snapshot.settings.lastFullSyncAt)}
          </Text>
          <Pressable onPress={() => runIntegrationSync(uid)} style={primaryButton()}>
            <Text style={{ color: C.text, fontWeight: "900" }}>Sync now →</Text>
          </Pressable>
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: 12, gap: 8 }}>
          <Text style={{ color: C.text, fontWeight: "900" }}>Data history import</Text>
          <Text style={{ color: C.muted, fontWeight: "800" }}>Import past data from connected apps.</Text>
          <Pressable style={primaryButton()}>
            <Text style={{ color: C.text, fontWeight: "900" }}>Import up to 90 days</Text>
          </Pressable>
        </View>
      </View>
    </Section>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: Array<{ key: string; label: string }>; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={{ paddingHorizontal: 10, minHeight: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: active ? alpha(C.purple, 0.28) : C.card2, borderWidth: 1, borderColor: active ? alpha(C.purple, 0.42) : C.hairline }}>
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 12 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ color: C.text, fontWeight: "900" }}>{title}</Text>
      {subtitle ? <Text style={{ color: C.muted, fontWeight: "800", lineHeight: 17 }}>{subtitle}</Text> : null}
    </View>
  );
}

function Chip({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: alpha(color, 0.14), borderWidth: 1, borderColor: alpha(color, 0.28) }}>
      <Text style={{ color: color === C.muted ? C.muted : C.text, fontWeight: "900", fontSize: 11 }}>{text}</Text>
    </View>
  );
}

function Note({ text }: { text: string }) {
  return (
    <View style={{ borderRadius: 16, padding: 11, backgroundColor: alpha(C.amber, 0.1), borderWidth: 1, borderColor: alpha(C.amber, 0.24) }}>
      <Text style={{ color: C.text, fontWeight: "800", lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

function iconButton() {
  return { width: 42, height: 42, borderRadius: 15, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 1, borderColor: C.hairline, backgroundColor: C.card2 };
}

function primaryButton() {
  return { minHeight: 44, borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: alpha(C.purple, 0.24), borderWidth: 1, borderColor: alpha(C.purple, 0.38) };
}
