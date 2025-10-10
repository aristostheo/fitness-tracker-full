// mobile/app/(workouts)/add-exercise.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  Pressable,
  Text,
  ActivityIndicator,
} from "react-native";
import { useExerciseSearch } from "@/hooks/useExerciseSearch";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AddExercise() {
  const { query, setQuery, results, setFilters } = useExerciseSearch();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const onPick = async (id: string) => {
    setLoadingId(id);
    const snap = await getDoc(doc(db, "exercises", id));
    setLoadingId(null);
    if (!snap.exists()) return;
    const ex = snap.data();
    // Navigate to your “Edit workout item” modal with the exercise prefilled
    // router.push({ pathname: "/(modals)/edit-workout-item", params: { exerciseId: id }});
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search exercises (e.g., row, lats, barbell)…"
        style={{
          backgroundColor: "#111",
          color: "#fff",
          padding: 12,
          borderRadius: 12,
        }}
      />
      {/* Simple filters – wire to chips in your UI */}
      {/* setFilters({ body: 'lats', equipment: 'barbell' }) */}
      <FlatList
        data={results}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPick(item.id)}
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: "#1b1b1b",
              marginBottom: 8,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              {item.name}
            </Text>
            <Text style={{ color: "#bbb", marginTop: 4 }}>
              {item.primaryMuscles.join(", ")} • {item.equipment.join(", ")}
            </Text>
            {loadingId === item.id ? (
              <ActivityIndicator style={{ marginTop: 8 }} />
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}
