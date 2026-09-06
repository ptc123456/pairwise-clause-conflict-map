import type { Address } from "./domain";

export type JournalStatus = "SIGNING" | "SUBMITTED" | "RECONCILE" | "FINALIZED_ERROR" | "VERIFIED";
export interface JournalRecord { v: 1; reservation: string; chain: string; contract: Address; account: Address; method: string; intent: string; args_json: string; pre_revision: string; pre_hash: string; tx_hash: string; status: JournalStatus; created_ms: string }
const INDEX = "glj1:index";
const LOCK = "genlayer-journal-v1";
const key = (reservation: string) => `glj1:${reservation}`;

function records(): JournalRecord[] {
  const found: JournalRecord[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const name = localStorage.key(i);
    if (!name?.startsWith("glj1:") || name === INDEX) continue;
    try { const item = JSON.parse(localStorage.getItem(name) ?? "") as JournalRecord; if (item.v === 1 && item.reservation && item.tx_hash !== undefined) found.push(item); } catch { throw new Error("Journal storage is unreadable. Export it before continuing."); }
  }
  return found.sort((a, b) => Number(a.created_ms) - Number(b.created_ms));
}
function save(record: JournalRecord) { localStorage.setItem(key(record.reservation), JSON.stringify(record)); localStorage.setItem(INDEX, JSON.stringify(records().map((item) => key(item.reservation)))); }
async function locked<T>(fn: () => T | Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error("Journal lock unavailable");
  return navigator.locks.request(LOCK, { mode: "exclusive" }, fn);
}
function reservation() { return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join(""); }

export async function reserve(input: Omit<JournalRecord, "v" | "reservation" | "tx_hash" | "status" | "created_ms">) {
  return locked(() => {
    const current = records();
    if (current.length >= 32) throw new Error("Journal capacity reached. Reconcile or export existing operations.");
    if (current.some((item) => !["VERIFIED", "FINALIZED_ERROR"].includes(item.status) && item.chain === input.chain && item.contract === input.contract && (item.intent.startsWith("create:") ? item.intent === input.intent : item.intent.split(":")[1] === input.intent.split(":")[1]))) throw new Error("A write for this case is already unresolved.");
    const record: JournalRecord = { ...input, v: 1, reservation: reservation(), tx_hash: "", status: "SIGNING", created_ms: String(Date.now()) };
    save(record); return record;
  });
}
export async function update(reservationId: string, patch: Pick<JournalRecord, "status" | "tx_hash">) {
  return locked(() => { const current = records().find((item) => item.reservation === reservationId); if (!current) throw new Error("Journal record not found."); if (current.tx_hash && patch.tx_hash !== current.tx_hash) throw new Error("Transaction hash is immutable."); const next = { ...current, ...patch }; save(next); return next; });
}
export async function removeUnsigned(reservationId: string) { return locked(() => { const current = records().find((item) => item.reservation === reservationId); if (current?.tx_hash) throw new Error("Submitted operations cannot be removed."); localStorage.removeItem(key(reservationId)); localStorage.setItem(INDEX, JSON.stringify(records().map((item) => key(item.reservation)))); }); }
export function loadJournal() { return records(); }
export const journalJson = (value: unknown) => JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item);
