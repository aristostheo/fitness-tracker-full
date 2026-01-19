// services/scanQuota.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  increment,
  setDoc,
} from "firebase/firestore";

const DB = () => getFirestore();

export type ScanQuotaStatus = {
  allowed: boolean;
  unlimited: boolean;
  remaining: number; // if unlimited => Infinity-like handled as large number
  used: number;
  limit: number;
  dateKey: string; // local date key (YYYY-MM-DD)
  reason?: "not_signed_in" | "limit_reached" | "unavailable";
};

const DEFAULT_DAILY_LIMIT = 2;

// Storage keys
const KEY_LOCAL_COUNT = (uid: string, dateKey: string) =>
  `@scan_quota_v2:${uid}:${dateKey}`;
const KEY_UNLIMITED_CACHE = (uid: string) => `@scan_unlimited_v2:${uid}`;

/**
 * Local date key in user's timezone (not UTC).
 * Avoids UTC date drift.
 */
export function localDateKey(d = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Firestore shape:
 * - overrides_scanUnlimited/{uid} => { unlimited: true }
 * - usage_scanDaily/{uid}_{dateKey} => { uid, dateKey, used, limit, updatedAt }
 */
function overrideDocRef(uid: string) {
  return doc(DB(), "overrides_scanUnlimited", uid);
}
function usageDocRef(uid: string, dateKey: string) {
  return doc(DB(), "usage_scanDaily", `${uid}_${dateKey}`);
}

async function getCachedUnlimited(uid: string): Promise<boolean | null> {
  const raw = await AsyncStorage.getItem(KEY_UNLIMITED_CACHE(uid));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.unlimited === "boolean" ? parsed.unlimited : null;
  } catch {
    return null;
  }
}

async function setCachedUnlimited(uid: string, unlimited: boolean) {
  await AsyncStorage.setItem(
    KEY_UNLIMITED_CACHE(uid),
    JSON.stringify({ unlimited, t: Date.now() })
  );
}

async function getLocalUsed(uid: string, dateKey: string): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY_LOCAL_COUNT(uid, dateKey));
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    const n = Number(parsed?.used ?? 0);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  } catch {
    return 0;
  }
}

async function setLocalUsed(uid: string, dateKey: string, used: number) {
  await AsyncStorage.setItem(
    KEY_LOCAL_COUNT(uid, dateKey),
    JSON.stringify({ used, t: Date.now() })
  );
}

/**
 * Read-only check (no increment). Use this to show "scans left today".
 */
export async function getScanQuotaStatus(opts?: {
  limit?: number;
  date?: Date;
}): Promise<ScanQuotaStatus> {
  const limit = Math.max(1, Math.floor(opts?.limit ?? DEFAULT_DAILY_LIMIT));
  const dateKey = localDateKey(opts?.date ?? new Date());

  const uid = getAuth().currentUser?.uid;
  if (!uid) {
    return {
      allowed: false,
      unlimited: false,
      remaining: 0,
      used: 0,
      limit,
      dateKey,
      reason: "not_signed_in",
    };
  }

  // Fast path: cached unlimited
  const cachedUnlimited = await getCachedUnlimited(uid);
  if (cachedUnlimited === true) {
    return {
      allowed: true,
      unlimited: true,
      remaining: 999999,
      used: 0,
      limit,
      dateKey,
    };
  }

  // Try Firestore override
  try {
    const oSnap = await getDoc(overrideDocRef(uid));
    const unlimited = !!oSnap.data()?.unlimited;
    await setCachedUnlimited(uid, unlimited);

    if (unlimited) {
      return {
        allowed: true,
        unlimited: true,
        remaining: 999999,
        used: 0,
        limit,
        dateKey,
      };
    }
  } catch {
    // If override fetch fails, fall back to local usage check
    const usedLocal = await getLocalUsed(uid, dateKey);
    const remaining = Math.max(0, limit - usedLocal);
    return {
      allowed: remaining > 0,
      unlimited: false,
      remaining,
      used: usedLocal,
      limit,
      dateKey,
      reason: "unavailable",
    };
  }

  // Usage: try Firestore usage doc, else local
  try {
    const uSnap = await getDoc(usageDocRef(uid, dateKey));
    const used = Number(uSnap.data()?.used ?? 0);
    const safeUsed = Number.isFinite(used) ? Math.max(0, used) : 0;

    // keep local roughly in sync
    await setLocalUsed(uid, dateKey, safeUsed);

    const remaining = Math.max(0, limit - safeUsed);
    return {
      allowed: remaining > 0,
      unlimited: false,
      remaining,
      used: safeUsed,
      limit,
      dateKey,
    };
  } catch {
    const usedLocal = await getLocalUsed(uid, dateKey);
    const remaining = Math.max(0, limit - usedLocal);
    return {
      allowed: remaining > 0,
      unlimited: false,
      remaining,
      used: usedLocal,
      limit,
      dateKey,
      reason: "unavailable",
    };
  }
}

/**
 * Reserve a scan token (increments usage) BEFORE you call the AI endpoint.
 * ✅ allowed=true ONLY if we actually reserved a token (incremented), or unlimited=true.
 */
export async function reserveScanToken(opts?: {
  limit?: number;
  date?: Date;
}): Promise<ScanQuotaStatus> {
  const limit = Math.max(1, Math.floor(opts?.limit ?? DEFAULT_DAILY_LIMIT));
  const dateKey = localDateKey(opts?.date ?? new Date());

  const uid = getAuth().currentUser?.uid;
  if (!uid) {
    return {
      allowed: false,
      unlimited: false,
      remaining: 0,
      used: 0,
      limit,
      dateKey,
      reason: "not_signed_in",
    };
  }

  // cached unlimited quick allow
  const cachedUnlimited = await getCachedUnlimited(uid);
  if (cachedUnlimited === true) {
    return {
      allowed: true,
      unlimited: true,
      remaining: 999999,
      used: 0,
      limit,
      dateKey,
    };
  }

  try {
    const result = await runTransaction(DB(), async (tx) => {
      const oRef = overrideDocRef(uid);
      const uRef = usageDocRef(uid, dateKey);

      const oSnap = await tx.get(oRef);
      const unlimited = !!oSnap.data()?.unlimited;

      if (unlimited) {
        return { unlimited: true, used: 0, incremented: false };
      }

      const uSnap = await tx.get(uRef);
      const currentUsed = Number(uSnap.data()?.used ?? 0);
      const used = Number.isFinite(currentUsed) ? Math.max(0, currentUsed) : 0;

      // 🚫 at/over limit -> do NOT increment
      if (used >= limit) {
        return { unlimited: false, used, incremented: false };
      }

      // ✅ reserve: create or increment
      if (!uSnap.exists()) {
        tx.set(uRef, {
          uid,
          dateKey,
          used: 1,
          limit,
          updatedAt: serverTimestamp(),
        });
        return { unlimited: false, used: 1, incremented: true };
      } else {
        tx.update(uRef, {
          used: increment(1),
          limit,
          updatedAt: serverTimestamp(),
        });
        return { unlimited: false, used: used + 1, incremented: true };
      }
    });

    const unlimited = (result as any).unlimited === true;
    await setCachedUnlimited(uid, unlimited);

    if (unlimited) {
      return {
        allowed: true,
        unlimited: true,
        remaining: 999999,
        used: 0,
        limit,
        dateKey,
      };
    }

    const used = Number((result as any).used ?? 0) || 0;
    const incremented = (result as any).incremented === true;

    await setLocalUsed(uid, dateKey, used);

    const remaining = Math.max(0, limit - used);

    // ✅ Only allow if we actually reserved a token
    if (!incremented) {
      return {
        allowed: false,
        unlimited: false,
        remaining,
        used,
        limit,
        dateKey,
        reason: "limit_reached",
      };
    }

    return {
      allowed: true,
      unlimited: false,
      remaining,
      used,
      limit,
      dateKey,
    };
  } catch {
    // Fallback: local counter (still reduces cost somewhat)
    const usedLocal = await getLocalUsed(uid, dateKey);
    if (usedLocal >= limit) {
      return {
        allowed: false,
        unlimited: false,
        remaining: 0,
        used: usedLocal,
        limit,
        dateKey,
        reason: "limit_reached",
      };
    }

    const nextUsed = usedLocal + 1;
    await setLocalUsed(uid, dateKey, nextUsed);
    return {
      allowed: true,
      unlimited: false,
      remaining: Math.max(0, limit - nextUsed),
      used: nextUsed,
      limit,
      dateKey,
      reason: "unavailable",
    };
  }
}

/**
 * Best-effort "refund" (if the scan request fails and you want to give the token back).
 * Note: if your Firestore rules disallow decreasing `used`, firestore refund will fail.
 */
export async function refundScanToken(opts?: {
  limit?: number;
  date?: Date;
}): Promise<void> {
  const limit = Math.max(1, Math.floor(opts?.limit ?? DEFAULT_DAILY_LIMIT));
  const dateKey = localDateKey(opts?.date ?? new Date());

  const uid = getAuth().currentUser?.uid;
  if (!uid) return;

  // If unlimited, nothing to refund
  const cachedUnlimited = await getCachedUnlimited(uid);
  if (cachedUnlimited === true) return;

  // local refund
  const usedLocal = await getLocalUsed(uid, dateKey);
  await setLocalUsed(uid, dateKey, Math.max(0, usedLocal - 1));

  // firestore refund best-effort
  try {
    await runTransaction(DB(), async (tx) => {
      const uRef = usageDocRef(uid, dateKey);
      const uSnap = await tx.get(uRef);
      if (!uSnap.exists()) return;

      const used = Number(uSnap.data()?.used ?? 0);
      const safeUsed = Number.isFinite(used) ? Math.max(0, used) : 0;
      if (safeUsed <= 0) return;

      tx.update(uRef, {
        used: safeUsed - 1,
        limit,
        updatedAt: serverTimestamp(),
      });
    });
  } catch {
    // ignore
  }
}

/**
 * Admin/helper (DON'T expose this in normal UI).
 * Used by you in dev builds or an admin screen.
 * Secure with Firestore rules.
 */
export async function setUserUnlimitedScan(uid: string, unlimited: boolean) {
  await setDoc(
    overrideDocRef(uid),
    { unlimited: !!unlimited, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
