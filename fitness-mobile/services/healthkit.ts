// // services/healthkit.ts
// import AppleHealthKit, {
//   HealthKitPermissions,
//   HealthValue,
//   SampleValue,
// } from "react-native-health";

// const HK = AppleHealthKit;

// const PERMS: HealthKitPermissions = {
//   permissions: {
//     read: [
//       HK.Constants.Permissions.StepCount,
//       HK.Constants.Permissions.ActiveEnergyBurned,
//       HK.Constants.Permissions.BodyMass,
//       HK.Constants.Permissions.HeartRate, // optional
//     ],
//     write: [], // add write perms later if you plan to save workouts/weight
//   },
// };

// export async function initHealthKit(): Promise<boolean> {
//   return new Promise((resolve) => {
//     HK.initHealthKit(PERMS, (err: string) => {
//       if (err) {
//         console.warn("HealthKit init error:", err);
//         resolve(false);
//       } else {
//         resolve(true);
//       }
//     });
//   });
// }

// function iso(d: Date) {
//   return d.toISOString();
// }
// function dayRange(date = new Date()) {
//   const start = new Date(date);
//   start.setHours(0, 0, 0, 0);
//   const end = new Date(date);
//   end.setHours(23, 59, 59, 999);
//   return { startDate: iso(start), endDate: iso(end) };
// }

// export async function getTodaySteps(): Promise<number> {
//   const { startDate, endDate } = dayRange();
//   return new Promise((resolve) => {
//     HK.getDailyStepCountSamples({ startDate, endDate }, (err, res) => {
//       if (err || !Array.isArray(res)) return resolve(0);
//       // API returns array per-day; we asked only for today
//       const sum = res.reduce((acc, r) => acc + (r.value || 0), 0);
//       resolve(Math.round(sum));
//     });
//   });
// }

// export async function getTodayActiveEnergy(): Promise<number> {
//   const { startDate, endDate } = dayRange();
//   return new Promise((resolve) => {
//     HK.getActiveEnergyBurned(
//       { startDate, endDate },
//       (err, res: SampleValue[]) => {
//         if (err || !Array.isArray(res)) return resolve(0);
//         // values are in kilocalories
//         const kcal = res.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
//         resolve(Math.round(kcal));
//       }
//     );
//   });
// }

// export async function getLatestBodyMass(): Promise<number | null> {
//   return new Promise((resolve) => {
//     HK.getLatestWeight(null, (err, res: HealthValue | undefined) => {
//       if (err || !res) return resolve(null);
//       // result in kilograms
//       resolve(Number(res.value));
//     });
//   });
// }
