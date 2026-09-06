import { createClient, isSuccessful } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { TransactionHash } from "genlayer-js/types";
import type { Address, Bundle, CaseRecord } from "./domain";
import { parseCase } from "./domain";
import type { Provider } from "./wallet";
import { bounded } from "./rpc";

const configured = String(import.meta.env.VITE_CONTRACT_ADDRESS ?? "").toLowerCase();
export const CONTRACT = (/^0x[0-9a-f]{40}$/.test(configured) ? configured : "") as Address | "";
const readClient = createClient({ chain: studionet });
async function readRecord(functionName: "get_case" | "get_version", args: bigint[]): Promise<CaseRecord> {
  if (!CONTRACT) throw new Error("Contract address is not configured yet.");
  return parseCase(await readClient.readContract({ address: CONTRACT, functionName, args }));
}
export const getCase = (id: string) => readRecord("get_case", [BigInt(id)]);
export const getVersion = (id: string, revision: string) => readRecord("get_version", [BigInt(id), BigInt(revision)]);
export async function getIdByNonce(creator: Address, nonce: string): Promise<string> {
  if (!CONTRACT) throw new Error("Contract address is not configured yet.");
  return String(await readClient.readContract({ address: CONTRACT, functionName: "get_id_by_nonce", args: [creator, nonce] }));
}
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
  if (!isSuccessful(transaction)) throw new Error(`Execution failed: ${transaction.statusName} / ${transaction.txExecutionResultName}`);
  return transaction;
}
export const bundleJson = (bundle: Bundle) => JSON.stringify(bundle);
