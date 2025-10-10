// mobile/hooks/useExerciseSearch.ts
import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import seed from "../assets/exercises.seed.json"; // { id,name,primaryMuscles,equipment }[]

type Seed = {
  id: string;
  name: string;
  primaryMuscles: string[];
  equipment: string[];
};

export function useExerciseSearch() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<{ body?: string; equipment?: string }>(
    {}
  );
  const [results, setResults] = useState<Seed[]>([]);

  const fuse = useMemo(
    () =>
      new Fuse(seed as Seed[], {
        keys: [
          { name: "name", weight: 0.7 },
          { name: "primaryMuscles", weight: 0.2 },
          { name: "equipment", weight: 0.1 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    []
  );

  useEffect(() => {
    let r = query ? fuse.search(query).map((x) => x.item) : (seed as Seed[]);
    if (filters.body)
      r = r.filter((x) => x.primaryMuscles.includes(filters.body!));
    if (filters.equipment)
      r = r.filter((x) => x.equipment.includes(filters.equipment!));
    setResults(r.slice(0, 50)); // keep it snappy
  }, [query, filters]);

  return { query, setQuery, filters, setFilters, results };
}
