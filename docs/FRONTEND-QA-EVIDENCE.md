# Frontend QA evidence

Recorded: 2026-09-11 (Asia/Saigon), local Vite production-equivalent source in the Codex in-app Chromium browser.

## Automated checks

`npm --prefix frontend test -- --run` passes 13 tests in 5 files and `npm --prefix frontend run build` passes. The tests include shared RPC FIFO/single-flight/budget enforcement, journal locking and immutable hashes, canonical argument hashing, pair ordering and precedence paths. Static regression assertions require all seven product views to exist, prohibit direct read paths outside the shared wrapper, and require explicit `FINALIZED_ERROR` handling.

## Browser assertions

The page was loaded fresh at each temporary viewport. Browser-evaluated `documentElement.scrollWidth <= clientWidth` passed at widths 320, 375, 414 and 768 px. Every visible button, input, select and link measured at least 44 by 44 CSS pixels. All visible inputs/selects had an accessible label. The compiled styles contained a `prefers-reduced-motion` rule.

Keyboard/focus verification opened the wallet chooser from the `Connect wallet` button: focus moved to `Close wallet chooser`, Tab remained trapped within the dialog when no provider option existed, and Escape closed the dialog. The main shell was inert while the modal was open. The evidence-view panel exposed Count, Cases, My cases, Children and History as native buttons; My cases remained disabled without an account.

No wallet was connected and no RPC, signature, transaction or external submission occurred during these browser checks.
