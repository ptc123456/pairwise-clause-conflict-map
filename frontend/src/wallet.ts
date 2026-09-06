import { useSyncExternalStore } from "react";
import { studionet } from "genlayer-js/chains";
import type { Address } from "./domain";

export interface Provider { request(args: { method: string; params?: readonly unknown[] | object }): Promise<unknown>; on?(event: string, fn: (...args: unknown[]) => void): void; removeListener?(event: string, fn: (...args: unknown[]) => void): void }
export type WalletId = "metamask" | "okx" | "rabby";
export interface Wallet { id: WalletId; name: string; uuid: string; provider: Provider }
type Phase = "DISCONNECTED" | "DISCOVERING" | "CHOOSER_OPEN" | "CONNECTING" | "CONNECTED" | "WRONG_CHAIN" | "ERROR";
interface State { phase: Phase; wallets: readonly Wallet[]; selected?: Wallet; account?: Address; error?: string }

const RDNS: Record<string, { id: WalletId; name: string }> = {
  "io.metamask": { id: "metamask", name: "MetaMask" },
  "com.okex.wallet": { id: "okx", name: "OKX Wallet" },
  "com.okx.wallet": { id: "okx", name: "OKX Wallet" },
  "io.rabby": { id: "rabby", name: "Rabby" },
};
let state: State = { phase: "DISCONNECTED", wallets: [] };
const listeners = new Set<() => void>();
const byId = new Map<WalletId, Wallet>();
const uuidProvider = new Map<string, Provider>();
const objectWallet = new WeakMap<object, WalletId>();
let initialized = false;
let cleanup = () => {};

function emit(next: State) { state = Object.freeze(next); listeners.forEach((fn) => fn()); }
function snapshot() { return state; }
function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
function validAddress(value: unknown): Address | undefined { const text = String(value ?? "").toLowerCase(); return /^0x[0-9a-f]{40}$/.test(text) ? text as Address : undefined; }
const CHAIN_HEX = `0x${studionet.id.toString(16)}`;
const correctChain = (value: unknown) => String(value ?? "").toLowerCase() === CHAIN_HEX;

export function discoverWallets() {
  if (initialized) return;
  initialized = true;
  window.addEventListener("eip6963:announceProvider", ((event: CustomEvent) => {
    const detail = event.detail as { info?: { uuid?: unknown; rdns?: unknown }; provider?: Provider };
    const meta = RDNS[String(detail.info?.rdns ?? "").toLowerCase()];
    const uuid = String(detail.info?.uuid ?? "");
    const provider = detail.provider;
    if (!meta || !uuid || !provider || typeof provider.request !== "function") return;
    if (uuidProvider.has(uuid) && uuidProvider.get(uuid) !== provider) return;
    if (objectWallet.has(provider as object) && objectWallet.get(provider as object) !== meta.id) return;
    uuidProvider.set(uuid, provider); objectWallet.set(provider as object, meta.id);
    byId.set(meta.id, { ...meta, uuid, provider });
    emit({ ...state, wallets: [...byId.values()] });
  }) as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export const walletStore = {
  snapshot, subscribe,
  open() { emit({ ...state, phase: "DISCOVERING", error: undefined }); discoverWallets(); emit({ ...state, phase: "CHOOSER_OPEN", error: undefined }); },
  close() { emit({ phase: "DISCONNECTED", wallets: state.wallets }); },
  async connect(wallet: Wallet) {
    if (!state.wallets.some((item) => item.id === wallet.id && item.provider === wallet.provider)) return;
    emit({ ...state, phase: "CONNECTING", error: undefined });
    try {
      const currentChain = await wallet.provider.request({ method: "eth_chainId" });
      if (!correctChain(currentChain)) {
        try { await wallet.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] }); }
        catch (cause) {
          const code = typeof cause === "object" && cause !== null && "code" in cause ? Number((cause as { code: unknown }).code) : 0;
          if (code !== 4902) throw cause;
          await wallet.provider.request({ method: "wallet_addEthereumChain", params: [{ chainId: CHAIN_HEX, chainName: studionet.name, nativeCurrency: studionet.nativeCurrency, rpcUrls: studionet.rpcUrls.default.http, blockExplorerUrls: studionet.blockExplorers?.default ? [studionet.blockExplorers.default.url] : [] }] });
        }
      }
      if (!correctChain(await wallet.provider.request({ method: "eth_chainId" }))) throw new Error("Wallet is not connected to GenLayer Studionet.");
      const accounts = await wallet.provider.request({ method: "eth_requestAccounts" });
      const account = validAddress(Array.isArray(accounts) ? accounts[0] : undefined);
      if (!account) throw new Error("The wallet did not return a valid account.");
      cleanup();
      const accountsChanged = (value: unknown) => { const next = validAddress(Array.isArray(value) ? value[0] : undefined); next ? emit({ ...state, phase: "CONNECTED", account: next }) : walletStore.disconnect(); };
      const chainChanged = (value: unknown) => correctChain(value) ? emit({ ...state, phase: "CONNECTED", error: undefined }) : emit({ ...state, phase: "WRONG_CHAIN", error: "Network changed. Reconnect before writing." });
      wallet.provider.on?.("accountsChanged", accountsChanged); wallet.provider.on?.("chainChanged", chainChanged);
      cleanup = () => { wallet.provider.removeListener?.("accountsChanged", accountsChanged); wallet.provider.removeListener?.("chainChanged", chainChanged); };
      emit({ phase: "CONNECTED", wallets: state.wallets, selected: wallet, account });
    } catch (cause) { emit({ ...state, phase: "ERROR", error: cause instanceof Error ? cause.message : "Wallet connection failed." }); }
  },
  disconnect() { cleanup(); cleanup = () => {}; emit({ phase: "DISCONNECTED", wallets: state.wallets }); },
  async recoverChain() { if (!state.selected) return; await this.connect(state.selected); },
};
export function useWallet() { return useSyncExternalStore(walletStore.subscribe, walletStore.snapshot); }
