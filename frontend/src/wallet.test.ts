// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const account = `0x${"1".repeat(40)}`;

beforeEach(() => { vi.resetModules(); });

describe("wallet registry", () => {
  it("renders no synthetic choices and retains the announced provider object", async () => {
    const { discoverWallets, walletStore } = await import("./wallet");
    discoverWallets();
    expect(walletStore.snapshot().wallets).toHaveLength(0);
    const provider = { request: vi.fn(async ({ method }: { method: string }) => method === "eth_chainId" ? "0xf22f" : method === "eth_requestAccounts" ? [account] : null) };
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: { info: { uuid: "m1", rdns: "io.metamask" }, provider } }));
    expect(walletStore.snapshot().wallets).toEqual([expect.objectContaining({ id: "metamask", provider })]);
    await walletStore.connect(walletStore.snapshot().wallets[0]);
    expect(provider.request).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
    expect(walletStore.snapshot()).toEqual(expect.objectContaining({ phase: "CONNECTED", account, selected: expect.objectContaining({ provider }) }));
  });

  it("hides unsupported announcements", async () => {
    const { discoverWallets, walletStore } = await import("./wallet");
    discoverWallets();
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: { info: { uuid: "x", rdns: "unknown.wallet" }, provider: { request: vi.fn() } } }));
    expect(walletStore.snapshot().wallets).toHaveLength(0);
  });
});
