import { describe, expect, it } from "vitest";
import { cells, resolutionPath, type Bundle } from "./domain";

const bundle: Bundle = {
  clauses: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }],
  scenarios: [{ id: "s1", text: "One" }, { id: "s2", text: "Two" }],
  precedence: [{ higher: "a", lower: "b" }, { higher: "b", lower: "c" }],
};

describe("pair map", () => {
  it("uses scenario order and i<j clause order", () => {
    expect(cells(bundle).map(({ scenario, left, right }) => `${scenario.id}:${left.id}${right.id}`))
      .toEqual(["s1:ab", "s1:ac", "s1:bc", "s2:ab", "s2:ac", "s2:bc"]);
  });

  it("shows deterministic transitive precedence paths", () => {
    expect(resolutionPath(bundle, "a", "c")).toEqual(["a", "b", "c"]);
    expect(resolutionPath(bundle, "c", "a")).toEqual([]);
  });
});
