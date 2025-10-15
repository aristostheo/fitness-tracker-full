// functions/src/util/slug.ts
export function toSlug(input: string): string {
  return (input || "")
    .normalize("NFKD") // separate accents
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanum => dash
    .replace(/^-+|-+$/g, "") // trim dashes
    .slice(0, 80); // keep short (like max-len)
}
