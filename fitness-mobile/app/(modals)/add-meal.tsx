import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/content/ThemeProvider";
import { useAuth } from "@/content/AuthContext";
import { getAuth } from "firebase/auth";

// Firestore (history)
import {
  collection,
  query,
  orderBy,
  limit as fbLimit,
  onSnapshot,
  getFirestore,
  DocumentData,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
const db = getFirestore(app);

// Types
type Meal = "breakfast" | "lunch" | "dinner" | "snacks";

type AddPayload = {
  date: string;
  meal: Meal;
  name: string;
  unit: string;
  qty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number;
  fiber?: number;
  source: "history" | "fdc" | "manual" | "describe";
  fdcId?: string | null;
};

// FDC search
const FDC_API_KEY = process.env.EXPO_PUBLIC_FDC_API_KEY;
type FdcItem = {
  fdcId: string;
  description: string;
  brandOwner?: string;
  labelNutrients?: {
    calories?: { value: number };
    protein?: { value: number };
    carbohydrates?: { value: number };
    fat?: { value: number };
    fiber?: { value: number };
    sugars?: { value: number };
  };
};

async function searchFDC(queryStr: string): Promise<FdcItem[]> {
  if (!FDC_API_KEY || !queryStr.trim()) return [];
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(
      FDC_API_KEY
    )}&query=${encodeURIComponent(queryStr)}&pageSize=25`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    return (j?.foods || []) as FdcItem[];
  } catch {
    return [];
  }
}

// ─────────────── UI helpers ───────────────

function GlassPanel({
  children,
  pad = 12,
  inset = 0,
  radius = 16,
}: React.PropsWithChildren<{ pad?: number; inset?: number; radius?: number }>) {
  const { colors, isDark } = useTheme() as any;
  const inner = <View style={{ padding: pad, gap: 10 }}>{children}</View>;

  if (Platform.OS === "ios") {
    return (
      <View
        style={{
          borderRadius: radius,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <BlurView
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"}
          intensity={20}
          style={{ padding: inset }}
        >
          <LinearGradient
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            colors={[colors.card + "66", colors.card + "99"]}
            style={{ position: "absolute", inset: 0 }}
          />
          {inner}
        </BlurView>
      </View>
    );
  }

  return (
    <LinearGradient
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      colors={[colors.card, colors.card]}
      style={{
        borderRadius: radius,
        borderWidth: 1,
        borderColor: colors.border,
        padding: inset,
      }}
    >
      {inner}
    </LinearGradient>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
      {children}
    </Text>
  );
}

function Segmented({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (val: string) => void;
  items: Array<{
    key: string;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
  }>;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 6,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        padding: 4,
        backgroundColor: colors.card,
      }}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            hitSlop={8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active ? colors.chipActiveBg : "transparent",
              backgroundColor: active ? colors.chipActiveBg : "transparent",
            }}
          >
            {it.icon && (
              <Ionicons
                name={it.icon}
                size={14}
                color={active ? colors.chipActiveText : colors.muted}
              />
            )}
            <Text
              style={{
                color: active ? colors.chipActiveText : colors.text,
                fontWeight: active ? "800" : "600",
                fontSize: 13,
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  multiline,
  onFocus,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  placeholder?: string;
  multiline?: boolean;
  onFocus?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      {!!label && (
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        multiline={multiline}
        style={{
          minHeight: multiline ? 88 : 48,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 12 : 10,
          backgroundColor: colors.inputBg,
          color: colors.text,
        }}
      />
    </View>
  );
}

function ListRow({
  title,
  subtitle,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.border }}
      style={({ pressed }) => [
        {
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.card : "transparent",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
      ]}
    >
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text
          style={{ color: colors.text, fontWeight: "700" }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={!disabled ? onPress : undefined}
      style={{
        height: 48,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.buttonBg,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Text style={{ color: colors.buttonText, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ContextTile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
      <Text
        style={{
          color: colors.text,
          fontWeight: "800",
          ...(mono ? { fontVariant: ["tabular-nums"] as any } : null),
          textTransform: label === "Meal" ? "capitalize" : "none",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function EmptyHint({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text style={{ color: colors.muted }}>{text}</Text>
    </View>
  );
}

// ─────────────── Main screen ───────────────

export default function AddMealModal() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();

  // Kill default header (prevents white bar)
  useLayoutEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const meal = (params.meal as Meal) || "breakfast";
  const date = params.date || new Date().toISOString().slice(0, 10);

  const [tab, setTab] = useState<"search" | "describe" | "manual">("search");

  // Top-level scroll (for manual centering with onFocus)
  const scrollRef = useRef<ScrollView>(null);

  // SEARCH
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [fdcResults, setFdcResults] = useState<FdcItem[]>([]);
  const [history, setHistory] = useState<
    Array<
      {
        id: string;
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        sugar?: number;
        fiber?: number;
        unit?: string;
        qty?: number;
      } & DocumentData
    >
  >([]);

  useEffect(() => {
    if (!user?.uid) return;
    const ref = collection(db, "users", user.uid, "nutritionEntries");
    const unsub = onSnapshot(
      query(ref, orderBy("createdAt", "desc"), fbLimit(100)),
      (snap) => {
        const arr: any[] = [];
        snap.forEach((doc) => {
          const d = doc.data();
          if (d?.name && typeof d.calories === "number") {
            arr.push({ id: doc.id, ...d });
          }
        });
        setHistory(arr);
      }
    );
    return unsub;
  }, [user?.uid]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!q.trim()) {
      setFdcResults([]);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchFDC(q.trim());
        setFdcResults(res);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  // DESCRIBE
  const [descText, setDescText] = useState("");
  const [calcLoading, setCalcLoading] = useState(false);

  const [dName, setDName] = useState("");
  const [dQty, setDQty] = useState("1");
  const [dUnit, setDUnit] = useState("serving");
  const [dCalories, setDCalories] = useState("");
  const [dProtein, setDProtein] = useState("");
  const [dCarbs, setDCarbs] = useState("");
  const [dFat, setDFat] = useState("");
  const [dSugar, setDSugar] = useState("");
  const [dFiber, setDFiber] = useState("");
  const [calcError, setCalcError] = useState("");

  const AI_URL = process.env.EXPO_PUBLIC_AI_DESCRIBE_URL; // optional

  async function onCalculateMacros() {
    setCalcError("");
    const text = descText.trim();
    if (!text) {
      setCalcError("Please describe your meal first.");
      return;
    }

    setCalcLoading(true);
    try {
      const token = await getAuth().currentUser?.getIdToken(true);
      if (!AI_URL) {
        setCalcError("AI endpoint is not configured.");
        return;
      }

      const payload = {
        mode: "meal:v1",
        query: text,
        rawText: text,
        context: { meal, date },
      };

      const res = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setCalcError("Please sign in to use Describe.");
        return;
      }

      const data = await res.json();

      // Try primary shape: { items: [...] }
      let first =
        Array.isArray(data?.items) && data.items.length > 0
          ? data.items[0]
          : null;

      // Fallbacks: some older handlers return a single object or different key
      if (!first && data?.item) first = data.item;
      if (!first && data?.result) first = data.result;

      if (!first) {
        setCalcError(
          "I couldn’t parse that. Try adding portion details (e.g., 1 cup, 150 g)."
        );
        return;
      }

      const norm = normalizeMealItem(first, text);

      setDName(norm.name);
      setDQty(String(dQty || "1"));
      setDUnit(String(norm.serving || dUnit || "serving"));

      // Set every macro; keep empty string only when truly undefined
      setDCalories(norm.calories !== undefined ? String(norm.calories) : "");
      setDProtein(norm.protein !== undefined ? String(norm.protein) : "");
      setDCarbs(norm.carbs !== undefined ? String(norm.carbs) : "");
      setDFat(norm.fat !== undefined ? String(norm.fat) : "");
      setDSugar(norm.sugar !== undefined ? String(norm.sugar) : "");
      setDFiber(norm.fiber !== undefined ? String(norm.fiber) : "");
    } catch (e) {
      setCalcError("Describe service unavailable. Please try again.");
    } finally {
      setCalcLoading(false);
    }
  }

  // MANUAL
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("serving");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [sugar, setSugar] = useState("");
  const [fiber, setFiber] = useState("");

  // EDIT SHEET (History/FDC)
  const [editOpen, setEditOpen] = useState(false);
  const [editSource, setEditSource] = useState<"history" | "fdc" | null>(null);
  const [eName, setEName] = useState("");
  const [eQty, setEQty] = useState("1");
  const [eUnit, setEUnit] = useState("serving");
  const [eCalories, setECalories] = useState("");
  const [eProtein, setEProtein] = useState("");
  const [eCarbs, setECarbs] = useState("");
  const [eFat, setEFat] = useState("");
  const [eSugar, setESugar] = useState("");
  const [eFiber, setEFiber] = useState("");
  const [eFdcId, setEFdcId] = useState<string | null>(null);

  // Animations
  const sheetProgress = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const H = Dimensions.get("window").height;

  function animateSheet(to: 0 | 1, after?: () => void) {
    Animated.timing(sheetProgress, {
      toValue: to,
      duration: 220,
      easing: to ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && after) after();
    });
  }

  function openEdit() {
    setEditOpen(true);
    requestAnimationFrame(() => animateSheet(1));
    // If you install expo-haptics later, call it here.
  }

  function closeEdit() {
    animateSheet(0, () => setEditOpen(false));
    // If you install expo-haptics later, call it here.
  }

  function startEditFromHistory(h: any) {
    setEditSource("history");
    setEName(h.name || "Food");
    setEQty(String(h.qty ?? 1));
    setEUnit(h.unit || "serving");
    setECalories(String(h.calories ?? 0));
    setEProtein(String(h.protein ?? 0));
    setECarbs(String(h.carbs ?? 0));
    setEFat(String(h.fat ?? 0));
    setESugar(String(h.sugar ?? 0));
    setEFiber(String(h.fiber ?? 0));
    setEFdcId(null);
    openEdit();
    setTab("search");
  }

  function startEditFromFdc(item: FdcItem) {
    const ln = item.labelNutrients || {};
    setEditSource("fdc");
    setEName(item.description || "Food");
    setEQty("1");
    setEUnit("serving");
    setECalories(String(ln.calories?.value ?? 0));
    setEProtein(String(ln.protein?.value ?? 0));
    setECarbs(String(ln.carbohydrates?.value ?? 0));
    setEFat(String(ln.fat?.value ?? 0));
    setESugar(String(ln.sugars?.value ?? 0));
    setEFiber(String(ln.fiber?.value ?? 0));
    setEFdcId(String(item.fdcId));
    openEdit();
    setTab("search");
  }

  // back with payload
  function done(payload: AddPayload) {
    router.replace({
      pathname: "/(tabs)/nutrition",
      params: { addFoodPayload: JSON.stringify(payload) },
    });
  }

  function addFromDescribe() {
    if (!dName.trim()) return;
    done({
      date,
      meal,
      name: dName.trim(),
      unit: dUnit || "serving",
      qty: Number(dQty || 1),
      calories: Number(dCalories || 0),
      protein: Number(dProtein || 0),
      carbs: Number(dCarbs || 0),
      fat: Number(dFat || 0),
      sugar: Number(dSugar || 0),
      fiber: Number(dFiber || 0),
      source: "describe",
      fdcId: null,
    });
  }

  function addFromManual() {
    if (!name.trim()) return;
    done({
      date,
      meal,
      name: name.trim(),
      unit: unit || "serving",
      qty: Number(qty || 1),
      calories: Number(calories || 0),
      protein: Number(protein || 0),
      carbs: Number(carbs || 0),
      fat: Number(fat || 0),
      sugar: Number(sugar || 0),
      fiber: Number(fiber || 0),
      source: "manual",
      fdcId: null,
    });
  }

  function addFromEditDraft() {
    if (!eName.trim()) return;
    done({
      date,
      meal,
      name: eName.trim(),
      unit: eUnit || "serving",
      qty: Number(eQty || 1),
      calories: Number(eCalories || 0),
      protein: Number(eProtein || 0),
      carbs: Number(eCarbs || 0),
      fat: Number(eFat || 0),
      sugar: Number(eSugar || 0),
      fiber: Number(eFiber || 0),
      source: (editSource ?? "manual") as AddPayload["source"],
      fdcId: editSource === "fdc" ? eFdcId : null,
    });
  }
  function normalizeMealItem(raw: any, fallbackName: string) {
    // Flatten if macros are nested
    const m = raw?.macros && typeof raw.macros === "object" ? raw.macros : raw;

    const numFrom = (v: any): number | undefined => {
      if (v == null) return undefined;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      // Extract leading numeric part from strings like "120 kcal", "32g"
      const s = String(v).trim().replace(",", ".");
      const match = s.match(/-?\d+(\.\d+)?/);
      if (!match) return undefined;
      const n = Number(match[0]);
      return Number.isFinite(n) ? n : undefined;
    };

    const pick = (obj: any, keys: string[]) => {
      for (const k of keys) {
        if (obj && obj[k] != null) return obj[k];
      }
      return undefined;
    };

    const name =
      String(
        raw?.name ??
          raw?.food ??
          raw?.title ??
          (typeof raw === "string" ? raw : "") ??
          fallbackName
      ).trim() || fallbackName;

    const serving = pick(raw, ["serving", "portion", "unit", "size"]);

    const calories = numFrom(
      pick(m, ["calories", "kcal", "energy", "energy_kcal", "calories_kcal"])
    );
    const protein = numFrom(
      pick(m, ["protein", "protein_g", "proteins", "prot"])
    );
    const carbs = numFrom(
      pick(m, ["carbs", "carbohydrates", "carbs_g", "carbohydrate_g"])
    );
    const fat = numFrom(pick(m, ["fat", "fats", "fat_g", "lipids"]));
    const sugar = numFrom(pick(m, ["sugar", "sugars", "sugar_g"]));
    const fiber = numFrom(pick(m, ["fiber", "fibre", "fiber_g"]));

    return { name, serving, calories, protein, carbs, fat, sugar, fiber };
  }

  const filteredHistory = useMemo(() => {
    if (!q.trim()) return history.slice(0, 10);
    const low = q.toLowerCase();
    return history.filter((h) =>
      String(h.name || "")
        .toLowerCase()
        .includes(low)
    );
  }, [q, history]);

  // Derived animations
  const scrimOpacity = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });
  const translateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get("window").height * 0.5, 0],
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={colors.background}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          automaticallyAdjustKeyboardInsets
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons
                name="fast-food-outline"
                size={18}
                color={colors.text}
              />
              <Text
                style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}
              >
                Add food
              </Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {/* Context bar */}
          <GlassPanel pad={10}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ContextTile label="Meal" value={meal} />
              <ContextTile label="Date" value={date} mono />
            </View>
          </GlassPanel>

          {/* Tabs */}
          <Segmented
            value={tab}
            onChange={(k) => setTab(k as any)}
            items={[
              { key: "search", label: "Search", icon: "search-outline" },
              {
                key: "describe",
                label: "Describe",
                icon: "chatbox-ellipses-outline",
              },
              { key: "manual", label: "Manual", icon: "apps-outline" },
            ]}
          />

          {/* SEARCH */}
          {tab === "search" && (
            <View style={{ gap: 12 }}>
              <GlassPanel>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 12,
                    backgroundColor: colors.inputBg,
                    paddingHorizontal: 12,
                    height: 48,
                  }}
                >
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={colors.muted}
                  />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder="Search your history & USDA…"
                    placeholderTextColor={colors.placeholder}
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      color: colors.text,
                      fontSize: 16,
                    }}
                    autoCapitalize="none"
                    onFocus={() =>
                      setTimeout(
                        () =>
                          scrollRef.current?.scrollTo({ y: 0, animated: true }),
                        60
                      )
                    }
                  />
                  {loading ? (
                    <ActivityIndicator />
                  ) : q ? (
                    <Pressable
                      onPress={() => setQ("")}
                      hitSlop={8}
                      accessibilityLabel="Clear search"
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.muted}
                      />
                    </Pressable>
                  ) : null}
                </View>
              </GlassPanel>

              <GlassPanel>
                <SectionTitle>History</SectionTitle>
                {filteredHistory.length === 0 ? (
                  <EmptyHint text="No recent items. Try the Describe tab or search for USDA items." />
                ) : (
                  filteredHistory
                    .slice(0, 15)
                    .map((h) => (
                      <ListRow
                        key={h.id}
                        onPress={() => startEditFromHistory(h)}
                        title={h.name}
                        subtitle={`${Math.round(
                          h.calories || 0
                        )} kcal • P${Math.round(h.protein || 0)} C${Math.round(
                          h.carbs || 0
                        )} F${Math.round(h.fat || 0)}`}
                        right={
                          <Ionicons
                            name="create-outline"
                            size={20}
                            color={colors.text}
                          />
                        }
                      />
                    ))
                )}
              </GlassPanel>

              <GlassPanel>
                <SectionTitle>USDA FoodData Central</SectionTitle>
                {!q.trim() ? (
                  <EmptyHint text="Type above to search the national database." />
                ) : fdcResults.length === 0 ? (
                  <EmptyHint
                    text={loading ? "Searching…" : "No results found."}
                  />
                ) : (
                  fdcResults.map((f) => (
                    <ListRow
                      key={f.fdcId}
                      onPress={() => startEditFromFdc(f)}
                      title={f.description}
                      subtitle={f.brandOwner}
                      right={
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color={colors.text}
                        />
                      }
                    />
                  ))
                )}
              </GlassPanel>
            </View>
          )}

          {/* DESCRIBE */}
          {tab === "describe" && (
            <View style={{ gap: 12 }}>
              <GlassPanel>
                <SectionTitle>Describe your meal</SectionTitle>
                <Field
                  value={descText}
                  onChangeText={setDescText}
                  placeholder="e.g., chicken bowl with rice and veggies"
                  multiline
                  onFocus={() =>
                    scrollRef.current?.scrollTo({ y: 0, animated: true })
                  }
                />
                <PrimaryButton
                  label={calcLoading ? "Calculating…" : "Calculate macros"}
                  onPress={onCalculateMacros}
                  disabled={calcLoading || !descText.trim()}
                />
                {!!calcError && (
                  <Text style={{ color: "#ef4444", fontSize: 12 }}>
                    {calcError}
                  </Text>
                )}
              </GlassPanel>

              <GlassPanel>
                <SectionTitle>Autofilled details (edit if needed)</SectionTitle>
                <Field
                  label="Name"
                  value={dName}
                  onChangeText={setDName}
                  placeholder="Meal name"
                  onFocus={() =>
                    scrollRef.current?.scrollTo({ y: 0, animated: true })
                  }
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field
                    label="Quantity"
                    value={dQty}
                    onChangeText={(t) => setDQty(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 220, animated: true })
                    }
                  />
                  <Field
                    label="Unit"
                    value={dUnit}
                    onChangeText={setDUnit}
                    placeholder="serving / g / ml"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 220, animated: true })
                    }
                  />
                </View>

                <SectionTitle>Macros (per unit)</SectionTitle>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field
                    label="Calories"
                    value={dCalories}
                    onChangeText={(t) =>
                      setDCalories(t.replace(/[^0-9.]/g, ""))
                    }
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 360, animated: true })
                    }
                  />
                  <Field
                    label="Protein (g)"
                    value={dProtein}
                    onChangeText={(t) => setDProtein(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 360, animated: true })
                    }
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field
                    label="Carbs (g)"
                    value={dCarbs}
                    onChangeText={(t) => setDCarbs(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 430, animated: true })
                    }
                  />
                  <Field
                    label="Fat (g)"
                    value={dFat}
                    onChangeText={(t) => setDFat(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 430, animated: true })
                    }
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field
                    label="Sugar (g)"
                    value={dSugar}
                    onChangeText={(t) => setDSugar(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 500, animated: true })
                    }
                  />
                  <Field
                    label="Fiber (g)"
                    value={dFiber}
                    onChangeText={(t) => setDFiber(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 500, animated: true })
                    }
                  />
                </View>

                <PrimaryButton
                  label="Add"
                  onPress={addFromDescribe}
                  disabled={!dName.trim()}
                />
              </GlassPanel>
            </View>
          )}

          {/* MANUAL */}
          {tab === "manual" && (
            <View style={{ gap: 12 }}>
              <GlassPanel>
                <SectionTitle>Details</SectionTitle>
                <Field
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Greek yogurt"
                  onFocus={() =>
                    scrollRef.current?.scrollTo({ y: 0, animated: true })
                  }
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field
                    label="Qty"
                    value={qty}
                    onChangeText={(t) => setQty(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 120, animated: true })
                    }
                  />
                  <Field
                    label="Unit"
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="serving"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 120, animated: true })
                    }
                  />
                </View>

                <SectionTitle>Macros (per unit)</SectionTitle>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field
                    label="Calories"
                    value={calories}
                    onChangeText={(t) => setCalories(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 250, animated: true })
                    }
                  />
                  <Field
                    label="Protein (g)"
                    value={protein}
                    onChangeText={(t) => setProtein(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 250, animated: true })
                    }
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field
                    label="Carbs (g)"
                    value={carbs}
                    onChangeText={(t) => setCarbs(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 320, animated: true })
                    }
                  />
                  <Field
                    label="Fat (g)"
                    value={fat}
                    onChangeText={(t) => setFat(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 320, animated: true })
                    }
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field
                    label="Sugar (g)"
                    value={sugar}
                    onChangeText={(t) => setSugar(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 390, animated: true })
                    }
                  />
                  <Field
                    label="Fiber (g)"
                    value={fiber}
                    onChangeText={(t) => setFiber(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    onFocus={() =>
                      scrollRef.current?.scrollTo({ y: 390, animated: true })
                    }
                  />
                </View>

                <PrimaryButton
                  label="Add"
                  onPress={addFromManual}
                  disabled={!name.trim()}
                />
              </GlassPanel>
            </View>
          )}
        </ScrollView>

        {/* Bottom Sheet Editor */}
        {editOpen && (
          <>
            {/* Scrim */}
            <Animated.View
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "#000",
                opacity: scrimOpacity,
              }}
            />
            <Pressable
              onPress={closeEdit}
              style={{ position: "absolute", inset: 0 }}
              accessibilityLabel="Dismiss editor"
            />
            {/* Sheet */}
            <Animated.View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                transform: [{ translateY }],
              }}
            >
              <SafeAreaView
                edges={["bottom"]}
                style={{ padding: 16, paddingTop: 8 }}
              >
                <GlassPanel>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "800" }}>
                      Edit details
                    </Text>
                    <Pressable
                      onPress={closeEdit}
                      hitSlop={8}
                      accessibilityLabel="Close edit"
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colors.muted}
                      />
                    </Pressable>
                  </View>

                  <Field
                    label="Name"
                    value={eName}
                    onChangeText={setEName}
                    placeholder="Meal name"
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Field
                      label="Quantity"
                      value={eQty}
                      onChangeText={(t) => setEQty(t.replace(/[^0-9.]/g, ""))}
                      keyboardType="decimal-pad"
                    />
                    <Field
                      label="Unit"
                      value={eUnit}
                      onChangeText={setEUnit}
                      placeholder="serving / g / ml"
                    />
                  </View>

                  <SectionTitle>Macros (per unit)</SectionTitle>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Field
                      label="Calories"
                      value={eCalories}
                      onChangeText={(t) =>
                        setECalories(t.replace(/[^0-9.]/g, ""))
                      }
                      keyboardType="decimal-pad"
                    />
                    <Field
                      label="Protein (g)"
                      value={eProtein}
                      onChangeText={(t) =>
                        setEProtein(t.replace(/[^0-9.]/g, ""))
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Field
                      label="Carbs (g)"
                      value={eCarbs}
                      onChangeText={(t) => setECarbs(t.replace(/[^0-9.]/g, ""))}
                      keyboardType="decimal-pad"
                    />
                    <Field
                      label="Fat (g)"
                      value={eFat}
                      onChangeText={(t) => setEFat(t.replace(/[^0-9.]/g, ""))}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Field
                      label="Sugar (g)"
                      value={eSugar}
                      onChangeText={(t) => setESugar(t.replace(/[^0-9.]/g, ""))}
                      keyboardType="decimal-pad"
                    />
                    <Field
                      label="Fiber (g)"
                      value={eFiber}
                      onChangeText={(t) => setEFiber(t.replace(/[^0-9.]/g, ""))}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <PrimaryButton
                    label="Add"
                    onPress={addFromEditDraft}
                    disabled={!eName.trim()}
                  />
                </GlassPanel>
              </SafeAreaView>
            </Animated.View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
