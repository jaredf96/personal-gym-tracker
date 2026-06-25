// Stable unique id generator. Uses the platform UUID when available.
export function uid(prefix = ""): string {
  const base =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}-${base}` : base;
}
