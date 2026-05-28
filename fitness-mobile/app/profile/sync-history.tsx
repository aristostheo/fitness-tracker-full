import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/content/ThemeProvider";

import {
  clearSyncHistory,
  formatLastSync,
  getIntegrationSnapshot,
  INTEGRATIONS,
  subscribeIntegrations,
  type IntegrationSnapshot,
} from "@/services/integrations";

function useC() {
  const { colors } = (useTheme as any)();
  return {
    bg: colors.background as string,
    card: colors.surface1 as string,
    card2: colors.surface2 as string,
    text: colors.textPrimary as string,
    muted: colors.textTertiary as string,
    hairline: colors.border as string,
    purple: colors.accent as string,
    green: colors.success as string,
    amber: colors.warning as string,
    red: colors.danger as string,
  };
}

function alpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(
    h.slice(4, 6),
    16
  )},${a})`;
}

export default function SyncHistoryScreen() {
  const C = useC();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [snapshot, setSnapshot] = useState<IntegrationSnapshot | null>(null);

  useEffect(() => subscribeIntegrations(setSnapshot), []);

  const history = snapshot?.settings.history || [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 15,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: C.hairline,
              backgroundColor: C.card2,
            }}
          >
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 28 }}>
              Sync history
            </Text>
            <Text style={{ color: C.muted, fontWeight: "800", marginTop: 3 }}>
              Recent sync events across all integrations
            </Text>
          </View>
        </View>

        {history.length ? (
          <>
            {history.map((event) => {
              const failed = event.failed.length > 0;
              return (
                <View
                  key={event.id}
                  style={{
                    borderRadius: 20,
                    backgroundColor: C.card,
                    borderWidth: 1,
                    borderColor: failed ? alpha(C.red, 0.26) : C.hairline,
                    padding: 14,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: failed ? C.red : C.green,
                      }}
                    />
                    <Text style={{ color: C.text, fontWeight: "900", flex: 1 }}>
                      {event.reason.replace("_", " ")}
                    </Text>
                    <Text style={{ color: C.muted, fontWeight: "800" }}>
                      {formatLastSync(event.finishedAt)}
                    </Text>
                  </View>
                  <Text style={{ color: C.muted, fontWeight: "800" }}>
                    {event.integrations
                      .map((id) => INTEGRATIONS.find((x) => x.id === id)?.name || id)
                      .join(" · ")}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <Pill text={`${event.dataPointsReceived} data points`} tone="neutral" />
                    <Pill text={`${Math.max(1, Math.round(event.durationMs / 1000))}s`} tone="neutral" />
                    <Pill text={failed ? `${event.failed.length} failed` : "Successful"} tone={failed ? "error" : "success"} />
                  </View>
                  {failed ? (
                    <Text style={{ color: C.red, fontWeight: "800" }}>
                      Failed:{" "}
                      {event.failed
                        .map((id) => INTEGRATIONS.find((x) => x.id === id)?.name || id)
                        .join(", ")}
                    </Text>
                  ) : null}
                </View>
              );
            })}

            <Pressable
              onPress={() => clearSyncHistory()}
              style={{
                minHeight: 44,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: alpha(C.red, 0.28),
                backgroundColor: alpha(C.red, 0.08),
              }}
            >
              <Text style={{ color: C.red, fontWeight: "900" }}>Clear history</Text>
            </Pressable>
          </>
        ) : (
          <View
            style={{
              borderRadius: 22,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.hairline,
              padding: 18,
              gap: 10,
              alignItems: "center",
            }}
          >
            <Ionicons name="sync-outline" size={28} color={C.muted} />
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 18 }}>
              No sync history yet
            </Text>
            <Text style={{ color: C.muted, fontWeight: "800", textAlign: "center" }}>
              Connect a source and run a sync to start logging integration
              history here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Pill({
  text,
  tone,
}: {
  text: string;
  tone: "neutral" | "success" | "error";
}) {
  const C = useC();
  const color = tone === "success" ? C.green : tone === "error" ? C.red : C.amber;
  return (
    <View
      style={{
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: alpha(color, 0.12),
        borderWidth: 1,
        borderColor: alpha(color, 0.26),
      }}
    >
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 11 }}>{text}</Text>
    </View>
  );
}
