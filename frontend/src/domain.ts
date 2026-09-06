export type Address = `0x${string}`;
export interface Clause { id: string; text: string }
export interface Scenario { id: string; text: string }
export interface Edge { higher: string; lower: string }
export interface Bundle { clauses: Clause[]; scenarios: Scenario[]; precedence: Edge[] }
export interface CaseRecord {
  v: 1; id: string; primary: Address; secondary: Address;
  phase: "BASE_DRAFT" | "FROZEN" | "UNRESOLVED" | "DONE" | "EXHAUSTED";
  revision: string; parent: string; base: Bundle; accepted_attempts: number;
  outcome: string; result: { v?: 1; labels?: ("OK" | "CLASH" | "UNKNOWN")[] };
  last_operation?: { method: string; caller: Address; args_hash: string };
}

export const EMPTY_BUNDLE: Bundle = {
  clauses: [{ id: "clause_a", text: "" }, { id: "clause_b", text: "" }],
  scenarios: [{ id: "scenario_1", text: "" }],
  precedence: [],
};

export function cells(bundle: Bundle) {
  return bundle.scenarios.flatMap((scenario) => bundle.clauses.flatMap((left, i) =>
    bundle.clauses.slice(i + 1).map((right) => ({ scenario, left, right })),
  ));
}

export function resolutionPath(bundle: Bundle, start: string, target: string): string[] {
  const graph = new Map(bundle.clauses.map((item) => [item.id, bundle.precedence.filter((edge) => edge.higher === item.id).map((edge) => edge.lower)]));
  const queue = [[start]]; const seen = new Set<string>();
  while (queue.length) { const path = queue.shift()!; const node = path.at(-1)!; if (node === target) return path; if (seen.has(node)) continue; seen.add(node); for (const next of graph.get(node) ?? []) queue.push([...path, next]); }
  return [];
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  return JSON.stringify(value);
}

export async function digest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalJson(value)));
  return [...new Uint8Array(bytes)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

export function contractArgs(method: string, args: unknown[]): unknown[] {
  if (method === "create_bundle") return [String(args[0]), JSON.parse(String(args[1])), String(args[2])];
  if (method === "replace_bundle") return [String(args[0]), JSON.parse(String(args[1])), String(args[2])];
  return args.map(String);
}

export function parseCase(value: unknown): CaseRecord {
  if (typeof value !== "string") throw new Error("Contract returned a non-text case record.");
  const record = JSON.parse(value) as Partial<CaseRecord>;
  if (record.v !== 1 || !/^([1-9][0-9]*)$/.test(record.id ?? "") || !record.base || !Array.isArray(record.base.clauses) || !Array.isArray(record.base.scenarios)) {
    throw new Error("Contract returned an invalid case record.");
  }
  return record as CaseRecord;
}
