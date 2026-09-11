# FRONTEND DESIGN RATIONALE

## Product and actors

Pairwise Clause Conflict Map is an authoring and evidence tool, not a generic analytics dashboard. A policy author enters the exact clauses, declared hypothetical scenarios and a directed precedence graph; a reader or judge inspects the frozen pair-by-scenario cells, raw `OK`/`CLASH`/`UNKNOWN` classifications and the path that does or does not resolve each clash. Both actors need provenance, limits and state more than promotional copy.

## Journey and information architecture

The page follows the contract lifecycle: author → freeze → analyze or retry → inspect authoritative result. Navigation therefore anchors the three real surfaces: Author, Pair map and How it works. The author workbench keeps clauses, scenarios and precedence adjacent because together they form one public bundle. Transaction progress remains a distinct live region between mutation controls and results. The map is paginated in frozen scenario-major, `i<j` order so presentation never changes contract meaning.

## Visual direction

Audience is policy authors and technical judges; the primary job is creating and auditing a conflict map; the tone is technical and austere. The bounded redesign should use Hallmark's **Workbench** macrostructure with a modern-minimal, instrument-panel character: compact functional heading, strong typographic hierarchy, restrained cool signal color, visible rules, tabular metadata and the pair map as the main visual proof. Use typography and native CSS structure rather than decorative imagery. Motion is limited to state transitions that communicate progress.

Recommended component direction: an inline command/search-style navigation appropriate to a reference-heavy product, annotated workbench sections for authoring and result interpretation, a persistent transaction status surface only while relevant, and a compact single-line or statement close rather than a generic multi-column marketing footer.

## Required visible states

- Disconnected, chooser open, connecting, connected, wrong chain and wallet error.
- Empty draft, editable base draft, frozen, unresolved/retry, done and exhausted.
- Waiting for wallet, submitted, waiting for finality, verifying execution, verifying readback, success, rejected, failed and reconciliation required.
- Empty/no-pair map, pending cells, all raw labels, ordered and unordered clashes, and paginated maximum-size content.

## Intentionally rejected patterns

- No hero-first SaaS landing rhythm, invented metrics, testimonials, pricing or customer-logo walls.
- No uniform bento-card dashboard: it would flatten lifecycle, evidence and precedence-path relationships.
- No traffic-light browser mockups, fake terminal chrome, glassmorphism, gradient text or decorative blockchain imagery.
- No green/red-only semantics and no prose that implies external facts were verified.
- No hidden wallet fallback, global provider routing, automatic resubmission or optimistic success before authoritative readback.
- No copied presentation from another GenLayer project; the pair × scenario matrix and precedence paths must determine this product's identity.

## Review criteria

The redesign succeeds only if it preserves every existing functional control and contract boundary, makes current lifecycle and transaction state legible without internal/debug language, works without horizontal overflow at 320/375/414/768 px, keeps all controls keyboard-operable with visible focus, supports reduced motion, and leaves the exact public-scope warning and pairwise-only limitation prominent.

Reproducible results and the exact browser assertions are recorded in `docs/FRONTEND-QA-EVIDENCE.md`.
