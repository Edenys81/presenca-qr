export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") return value;

  if (typeof value === "string") return parseFloat(value);

  return Number(value);
}