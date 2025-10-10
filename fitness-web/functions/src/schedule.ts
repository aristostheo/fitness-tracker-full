import { setGlobalOptions } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { importWger } from "./import-wger";
import { enrichMedia } from "./enrich-media";
import { makeSeedToStorage } from "./make-seed"; // optional

setGlobalOptions({
  region: "us-central1",
  timeoutSeconds: 540,
  memory: "1GiB",
});

export const weeklyExerciseSync = onSchedule(
  { schedule: "every monday 03:00", timeZone: "America/Toronto" },
  async () => {
    await importWger();
    await enrichMedia();
    await makeSeedToStorage().catch(() => {}); // optional
  }
);
