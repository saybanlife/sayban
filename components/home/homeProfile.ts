export function resolveHomeProfileName(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  const result =
    root.result && typeof root.result === "object"
      ? (root.result as Record<string, unknown>)
      : root;

  for (const key of ["name", "full_name", "user_name"] as const) {
    const value = result[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}
