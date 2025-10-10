export default function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms = 300
) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
