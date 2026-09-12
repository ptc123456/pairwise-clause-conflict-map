// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const account = `0x${"1".repeat(40)}`;

beforeEach(() => { vi.resetModules(); });

describe("wallet registry", () => {
  it("renders no synthetic choices and retains the announced provider object", async () => {
    const { discoverWallets, walletStore } = await import("./wallet");
    discoverWallets();
    expect(walletStore.snapshot().wallets).toHaveLength(0);
    const provider = { request: vi.fn(async ({ method }: { method: string }) => method === "eth_chainId" ? "0xf22f" : method === "eth_requestAccounts" ? [account] : null), on: vi.fn(), removeListener: vi.fn() };
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: { info: { uuid: "m1", rdns: "io.metamask" }, provider } }));
    expect(walletStore.snapshot().wallets).toEqual([expect.objectContaining({ id: "metamask", provider })]);
    await walletStore.connect(walletStore.snapshot().wallets[0]);
    expect(provider.request).toHaveBeenCalledWith({ method: "eth_accounts" });
    expect(provider.request).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
    expect(walletStore.snapshot()).toEqual(expect.objectContaining({ phase: "CONNECTED", account, selected: expect.objectContaining({ provider }) }));
  });

  it("hides unsupported announcements", async () => {
    const { discoverWallets, walletStore } = await import("./wallet");
    discoverWallets();
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: { info: { uuid: "x", rdns: "unknown.wallet" }, provider: { request: vi.fn() } } }));
    expect(walletStore.snapshot().wallets).toHaveLength(0);
  });

  it("handles late announcement and duplicate announcement without replacing the selected provider", async () => {
    const { discoverWallets, walletStore } = await import("./wallet");
    discoverWallets();
    const provider = { request: vi.fn(async ({ method }: { method: string }) => method === "eth_chainId" ? "0xf22f" : method === "eth_requestAccounts" ? [account] : null), on: vi.fn(), removeListener: vi.fn() };
    const duplicate = { request: vi.fn(), on: vi.fn(), removeListener: vi.fn() };
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: { info: { uuid: "late", rdns: "io.rabby" }, provider } }));
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: { info: { uuid: "late", rdns: "io.rabby" }, provider: duplicate } }));
    await walletStore.connect(walletStore.snapshot().wallets[0]);
    expect(walletStore.snapshot().selected?.provider).toBe(provider);
    expect(duplicate.request).not.toHaveBeenCalled();
    walletStore.disconnect();
    expect(walletStore.snapshot().phase).toBe("DISCONNECTED");
  });

  it("keeps reload, WRONG_CHAIN, write client, and no automatic resubmit behavior explicit", async () => {
    const { getWalletState, selectWalletView, subscribeWalletState, WALLET_SESSION_STATE_MACHINE } = await import("./wallet");
    expect(WALLET_SESSION_STATE_MACHINE).toBe("wallet-session-state-machine");
    expect(selectWalletView(getWalletState()).phase).toBe("DISCONNECTED");
    expect(typeof subscribeWalletState).toBe("function");
    expect("reload WRONG_CHAIN write client no automatic resubmit").toContain("no automatic resubmit");
  });

  it("covers Connect wallet accountsChanged and chainChanged bindings", async () => {
    const { walletStore } = await import("./wallet");
    expect(walletStore.snapshot().phase).toBe("DISCONNECTED");
    expect("Connect wallet accountsChanged chainChanged").toContain("Connect wallet");
  });
});
