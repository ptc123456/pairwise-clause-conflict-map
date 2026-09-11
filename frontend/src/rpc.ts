const inFlight = new Map<string, Promise<unknown>>();
const counts = new Map<string, number>();
let journey = 0;
let tail: Promise<unknown> = Promise.resolve();
export async function bounded<T>(row: string, key: string, maximum: number, call: () => Promise<T>): Promise<T> {
  const active = inFlight.get(key); if (active) return active as Promise<T>;
  const count = (counts.get(row) ?? 0) + 1; if (count > maximum) throw new Error(`RPC budget exceeded: ${row}`); counts.set(row, count);
  const pending = tail.then(call, call); tail = pending.then(() => undefined, () => undefined); inFlight.set(key, pending);
  try { return await pending; } finally { if (inFlight.get(key) === pending) inFlight.delete(key); }
}
export const boundedOnce = <T>(row: string, key: string, call: () => Promise<T>) => bounded(`${row}#${++journey}`, key, 1, call);
export const rpcEvidence = () => Object.fromEntries(counts);
