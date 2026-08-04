import type { State } from "@/lib/types";

/** city id -> city name, flattened from GET /geo/states — used to resolve
 * a "city" kind territory's value (which is a city id, not a zip/borough
 * string like every other kind) into something readable. */
export function buildCityNameMap(states: State[]): Record<string, string> {
  return Object.fromEntries(states.flatMap((s) => s.cities).map((c) => [c.id, c.name]));
}

export function territoryLabel(kind: string, value: string, cityNames: Record<string, string>): string {
  if (kind === "city") {
    return `All of ${cityNames[value] ?? "city"}`;
  }
  return `${kind}: ${value}`;
}
