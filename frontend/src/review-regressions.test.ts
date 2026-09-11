import { describe, expect, it } from "vitest";
import contract from "./contract.ts?raw";
import app from "./App.tsx?raw";

describe("PRE_DEPLOY review regressions", () => {
  it("routes all seven product views through the shared bounded reader", () => {
    expect(contract.match(/readClient\.readContract/g)).toHaveLength(1);
    for (const name of ["getCase", "getVersion", "getIdByNonce", "getCount", "listCases", "listActor", "listChildren"]) {
      expect(contract).toContain(name);
    }
    expect(app).toContain("Bounded contract evidence views");
  });

  it("separates finalized execution failure from ambiguous reconciliation", () => {
    expect(contract).toContain("FinalizedExecutionError");
    expect(app).toContain('status: "FINALIZED_ERROR"');
    expect(app).toContain("getOptionalVersion");
    expect(app).toContain("Failed-write prestate readback mismatch");
  });
});
