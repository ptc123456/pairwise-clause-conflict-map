// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { journalJson, loadJournal, removeUnsigned, reserve, update } from "./pending";

const base = { chain: "61999", contract: `0x${"a".repeat(40)}` as const, account: `0x${"b".repeat(40)}` as const, method: "freeze_bundle", intent: "freeze_bundle:1:1", args_json: "[]", pre_revision: "1", pre_hash: "0".repeat(64) };

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, "locks", { configurable: true, value: { request: vi.fn(async (_name, _options, fn) => fn()) } });
});

describe("pending write journal", () => {
  it("serializes bigint losslessly and blocks conflicting unresolved writes", async () => {
    expect(journalJson([1n])).toBe('["1"]');
    await reserve(base);
    await expect(reserve({ ...base, method: "replace_bundle", intent: "replace_bundle:1:1" })).rejects.toThrow("already unresolved");
  });

  it("retains an immutable submitted hash and removes only unsigned records", async () => {
    const unsigned = await reserve(base);
    await removeUnsigned(unsigned.reservation);
    expect(loadJournal()).toHaveLength(0);
    const submitted = await reserve(base);
    const hash = `0x${"1".repeat(64)}`;
    await update(submitted.reservation, { status: "SUBMITTED", tx_hash: hash });
    await expect(update(submitted.reservation, { status: "RECONCILE", tx_hash: `0x${"2".repeat(64)}` })).rejects.toThrow("immutable");
    await expect(removeUnsigned(submitted.reservation)).rejects.toThrow("cannot be removed");
  });

  it("records a finalized execution error as terminal without erasing its hash", async () => {
    const item = await reserve(base);
    const hash = `0x${"3".repeat(64)}`;
    await update(item.reservation, { status: "FINALIZED_ERROR", tx_hash: hash });
    expect(loadJournal()[0]).toMatchObject({ status: "FINALIZED_ERROR", tx_hash: hash });
    await expect(reserve(base)).resolves.toMatchObject({ status: "SIGNING" });
  });
});
