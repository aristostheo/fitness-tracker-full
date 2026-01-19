// components/hydration/useReducedMotion.ts
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** iOS/Android system "Reduce Motion" support */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => {
      if (mounted) setReduced(!!v);
    });

    const sub =
      AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => {
        setReduced(!!v);
      }) ?? null;

    return () => {
      mounted = false;
      // RN versions differ:
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
