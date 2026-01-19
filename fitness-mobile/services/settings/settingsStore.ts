// components/settings/premium/settingsStore.ts
// Drop-in ✅ tiny persisted settings hooks (AsyncStorage recommended)

import { useEffect, useState } from "react";

let AsyncStorage: any = null;
try {
  // optional dependency
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  AsyncStorage = null;
}

type Setter<T> = (v: T) => void;

async function getItem(key: string): Promise<string | null> {
  if (!AsyncStorage) return null;
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (!AsyncStorage) return;
  try {
    await AsyncStorage.setItem(key, value);
  } catch {}
}

export function useSettingBool(
  key: string,
  defaultValue: boolean
): [boolean, Setter<boolean>, boolean] {
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = await getItem(key);
      if (!alive) return;
      if (raw === "true") setValue(true);
      else if (raw === "false") setValue(false);
      else setValue(defaultValue);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [key, defaultValue]);

  const set: Setter<boolean> = (v) => {
    setValue(v);
    setItem(key, v ? "true" : "false");
  };

  return [value, set, loading];
}

export function useSettingString(
  key: string,
  defaultValue: string
): [string, Setter<string>, boolean] {
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = await getItem(key);
      if (!alive) return;
      if (typeof raw === "string" && raw.length) setValue(raw);
      else setValue(defaultValue);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [key, defaultValue]);

  const set: Setter<string> = (v) => {
    setValue(v);
    setItem(key, v);
  };

  return [value, set, loading];
}
