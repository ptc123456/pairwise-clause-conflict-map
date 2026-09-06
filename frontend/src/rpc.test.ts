import { expect, it, vi } from "vitest";
import { bounded } from "./rpc";

it("coalesces concurrent identical RPC work and enforces the row budget", async () => {
  const call = vi.fn(async () => "ok");
  const first = bounded("test-row", "same-key", 1, call);
  const second = bounded("test-row", "same-key", 1, call);
  await expect(Promise.all([first, second])).resolves.toEqual(["ok", "ok"]);
  expect(call).toHaveBeenCalledOnce();
  await expect(bounded("test-row", "new-key", 1, call)).rejects.toThrow("RPC budget exceeded");
});
