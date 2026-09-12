import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { TransactionHash } from "genlayer-js/types";
import type { Address, Bundle, CaseRecord } from "./domain";
import { parseCase } from "./domain";
import type { Provider } from "./wallet";
import { bounded, boundedOnce } from "./rpc";

const configured = String(import.meta.env.VITE_CONTRACT_ADDRESS ?? "").toLowerCase();
export const CONTRACT = (/^0x[0-9a-f]{40}$/.test(configured) ? configured : "") as Address | "";
const readClient = createClient({ chain: studionet });
const requireContract = () => {
  if (!CONTRACT) throw new Error("Contract address is not configured yet.");
  return CONTRACT;
};
async function boundedRead<T>(row: string, functionName: string, args: unknown[], parse: (value: unknown) => T): Promise<T> {
  const address = requireContract();
  return parse(await boundedOnce(row, `${functionName}:${JSON.stringify(args, (_key, value) => typeof value === "bigint" ? value.toString() : value)}`,
    () => readClient.readContract({ address, functionName, args: args as never[] })));
}
async function readRecord(functionName: "get_case" | "get_version", args: bigint[]): Promise<CaseRecord> {
  return boundedRead(`view:${functionName}:${args.join(":")}`, functionName, args, parseCase);
}
const parseOptionalCase = (value: unknown) => value === "null" ? undefined : parseCase(value);
export const getCase = (id: string) => readRecord("get_case", [BigInt(id)]);
export const getVersion = (id: string, revision: string) => readRecord("get_version", [BigInt(id), BigInt(revision)]);
export const getOptionalVersion = (id: string, revision: string) => boundedRead(`view:get_version:${id}:${revision}`, "get_version", [BigInt(id), BigInt(revision)], parseOptionalCase);
export async function getIdByNonce(creator: Address, nonce: string): Promise<string> {
  return boundedRead(`view:get_id_by_nonce:${creator}:${nonce}`, "get_id_by_nonce", [creator, nonce], String);
}
type IdPage = { ids: string[]; next: string };
const parsePage = (value: unknown): IdPage => {
  if (typeof value !== "string") throw new Error("Contract returned a non-text page.");
  const page = JSON.parse(value) as Partial<IdPage>;
  if (!Array.isArray(page.ids) || !page.ids.every((id) => /^(0|[1-9][0-9]*)$/.test(id)) || !/^(0|[1-9][0-9]*)$/.test(page.next ?? "")) throw new Error("Contract returned an invalid page.");
  return page as IdPage;
};
export const getCount = () => boundedRead("view:get_count", "get_count", [], String);
export const listCases = (start = "1", limit = "4") => boundedRead(`view:list_cases:${start}:${limit}`, "list_cases", [BigInt(start), BigInt(limit)], parsePage);
export const listActor = (actor: Address, offset = "0", limit = "4") => boundedRead(`view:list_actor:${actor}:${offset}:${limit}`, "list_actor", [actor, BigInt(offset), BigInt(limit)], parsePage);
export const listChildren = (parent: string, offset = "0", limit = "4") => boundedRead(`view:list_children:${parent}:${offset}:${limit}`, "list_children", [BigInt(parent), BigInt(offset), BigInt(limit)], parsePage);
export function writer(provider: Provider, account: Address) { return createClient({ chain: studionet, provider, account }); }
export async function submit(client: ReturnType<typeof writer>, method: string, args: unknown[]) {
  if (!CONTRACT) throw new Error("Contract address is not configured yet.");
  const hash = await client.writeContract({ address: CONTRACT, functionName: method, args: args as never[], value: 0n });
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error("Wallet returned an invalid transaction hash.");
  return hash as TransactionHash;
}
const delay = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => { const timer = setTimeout(resolve, ms); signal.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason ?? new Error("Transaction check stopped.")); }, { once: true }); });
async function visible(signal: AbortSignal) {
  if (!document.hidden) return;
  await new Promise<void>((resolve, reject) => { const show = () => { if (!document.hidden) { document.removeEventListener("visibilitychange", show); resolve(); } }; signal.addEventListener("abort", () => reject(signal.reason), { once: true }); document.addEventListener("visibilitychange", show); });
}
export async function finalized(hash: TransactionHash, signal: AbortSignal) {
  let transaction;
  for (const ms of [2_000, 4_000, 8_000]) {
    await visible(signal); await delay(ms, signal);
    transaction = await bounded(`receipt:${hash}`, `receipt:${hash}`, 3, () => readClient.getTransaction({ hash }));
    if (transaction.statusName === "FINALIZED") break;
  }
  if (!transaction || transaction.statusName !== "FINALIZED") throw new Error("Finality was not observed within the RPC budget. Reconcile this hash; do not resubmit.");
  if (transaction.txExecutionResultName !== "FINISHED_WITH_RETURN") throw new FinalizedExecutionError(`Execution failed: ${transaction.statusName} / ${transaction.txExecutionResultName}`);
  return transaction;
}
export class FinalizedExecutionError extends Error {}
export const bundleJson = (bundle: Bundle) => JSON.stringify(bundle);
