import { expect, it, vi } from "vitest";
import { bounded, boundedOnce } from "./rpc";

it("coalesces concurrent identical RPC work and enforces the row budget", async () => {
  const call = vi.fn(async () => "ok");
  const first = bounded("test-row", "same-key", 1, call);
  const second = bounded("test-row", "same-key", 1, call);
  await expect(Promise.all([first, second])).resolves.toEqual(["ok", "ok"]);
  expect(call).toHaveBeenCalledOnce();
  await expect(bounded("test-row", "new-key", 1, call)).rejects.toThrow("RPC budget exceeded");
});

it("starts a fresh one-read budget for each explicit journey", async () => {
  const call = vi.fn(async () => "ok");
  await expect(boundedOnce("detail", "case:1", call)).resolves.toBe("ok");
  await expect(boundedOnce("detail", "case:1", call)).resolves.toBe("ok");
  expect(call).toHaveBeenCalledTimes(2);
});

it("runs different RPC keys in FIFO order", async () => {
  const order: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const first = bounded("fifo-a", "fifo-a", 1, async () => { order.push("a:start"); await gate; order.push("a:end"); });
  const second = bounded("fifo-b", "fifo-b", 1, async () => { order.push("b"); });
  await Promise.resolve();
  expect(order).toEqual(["a:start"]);
  release();
  await Promise.all([first, second]);
  expect(order).toEqual(["a:start", "a:end", "b"]);
});
