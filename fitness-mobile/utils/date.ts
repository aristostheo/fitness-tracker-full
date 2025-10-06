// utils/date.ts
export const pad = (n: number) => String(n).padStart(2, "0");
export const fmt = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dayKey = (d: Date) => fmt(d);
export const endOfToday = (base = new Date()) =>
  new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    23,
    59,
    59,
    999
  );
export const startOfWeek = (d: Date) => {
  const r = new Date(d);
  const day = r.getDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7; // make Monday = 0
  r.setDate(r.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
};
export const startOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), 1);
export const labelDay = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" }); // Mon, Tue...
};
