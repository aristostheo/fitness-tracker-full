// services/steps.ios.ts
import AppleHealthKit, { HealthInputOptions } from "react-native-health";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fmt } from "@/utils/date";

const PERMS = AppleHealthKit.Constants.Permissions;

export async function requestStepsPermissions() {
  return new Promise<void>((resolve, reject) => {
    AppleHealthKit.initHealthKit(
      {
        permissions: { read: [PERMS.Steps] },
      },
      (err: any) => (err ? reject(err) : resolve())
    );
  });
}

export async function pullStepsLastNDays(uid: string, days = 30) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const opts: HealthInputOptions = {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    ascending: true,
    includeManuallyAdded: true,
  };

  return new Promise<void>((resolve, reject) => {
    AppleHealthKit.getDailyStepCountSamples(
      opts,
      async (err: any, samples: any[]) => {
        if (err) return reject(err);
        // samples: [{ startDate, endDate, value }]
        const batch = samples.map(async (s) => {
          const d = new Date(s.startDate);
          const date = fmt(d); // YYYY-MM-DD (you already have fmt)
          const ref = doc(collection(db, `users/${uid}/stepsDaily`), date);
          await setDoc(
            ref,
            {
              date,
              steps: Number(s.value || 0),
              source: "healthkit",
              syncedAt: serverTimestamp(),
            },
            { merge: true }
          );
        });
        await Promise.all(batch);
        resolve();
      }
    );
  });
}
