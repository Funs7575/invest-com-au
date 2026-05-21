import { describe, it, expect } from "vitest";
import {
  SALARY_SACRIFICE_TREE,
  SALARY_SACRIFICE_START_ID,
} from "@/lib/decision-trees/salary-sacrifice";
import type { TreeNode, TreeLeaf, TreeQuestion } from "@/components/DecisionTree";

/**
 * salary-sacrifice.ts is a static `TreeNode[]` data module (no runtime
 * logic). These tests assert the structural invariants the DecisionTree
 * renderer relies on.
 */

const VALID_VERDICTS = new Set(["buy", "rent", "save", "review"]);

function isLeaf(node: TreeNode): node is TreeLeaf {
  return "verdict" in node;
}
function isQuestion(node: TreeNode): node is TreeQuestion {
  return "question" in node;
}

const byId = new Map(SALARY_SACRIFICE_TREE.map((n) => [n.id, n]));

describe("SALARY_SACRIFICE_TREE — shape & invariants (static data module)", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(SALARY_SACRIFICE_TREE)).toBe(true);
    expect(SALARY_SACRIFICE_TREE.length).toBeGreaterThan(0);
  });

  it("exposes a start id that points at an existing node", () => {
    expect(SALARY_SACRIFICE_START_ID).toBe("start");
    expect(byId.has(SALARY_SACRIFICE_START_ID)).toBe(true);
  });

  it("every node id is unique and non-empty", () => {
    const ids = SALARY_SACRIFICE_TREE.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id.length).toBeGreaterThan(0));
  });

  it("every node is exactly one of question | leaf", () => {
    SALARY_SACRIFICE_TREE.forEach((node) => {
      const leaf = isLeaf(node);
      const question = isQuestion(node);
      expect(leaf || question).toBe(true);
      expect(leaf && question).toBe(false);
    });
  });

  it("every question has at least two options, each with label + resolvable next", () => {
    SALARY_SACRIFICE_TREE.filter(isQuestion).forEach((q) => {
      expect(q.question.length).toBeGreaterThan(0);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      q.options.forEach((opt) => {
        expect(opt.label.length).toBeGreaterThan(0);
        expect(byId.has(opt.next)).toBe(true);
      });
    });
  });

  it("every leaf has a valid verdict, heading, and detail", () => {
    const leaves = SALARY_SACRIFICE_TREE.filter(isLeaf);
    expect(leaves.length).toBeGreaterThan(0);
    leaves.forEach((leaf) => {
      expect(VALID_VERDICTS.has(leaf.verdict)).toBe(true);
      expect(leaf.heading.length).toBeGreaterThan(0);
      expect(leaf.detail.length).toBeGreaterThan(0);
    });
  });

  it("leaf actions (when present) have a label and a root-relative href", () => {
    SALARY_SACRIFICE_TREE.filter(isLeaf)
      .filter((l): l is TreeLeaf & { action: NonNullable<TreeLeaf["action"]> } =>
        Boolean(l.action),
      )
      .forEach((leaf) => {
        expect(leaf.action.label.length).toBeGreaterThan(0);
        expect(leaf.action.href.startsWith("/")).toBe(true);
      });
  });

  it("every node is reachable from the start id (no orphans)", () => {
    const seen = new Set<string>();
    const stack = [SALARY_SACRIFICE_START_ID];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const node = byId.get(id);
      if (node && isQuestion(node)) {
        node.options.forEach((o) => stack.push(o.next));
      }
    }
    const allIds = new Set(SALARY_SACRIFICE_TREE.map((n) => n.id));
    expect(seen).toEqual(allIds);
  });

  it("the start node splits employee vs self-employed", () => {
    const start = byId.get("start") as TreeQuestion;
    const nexts = start.options.map((o) => o.next);
    expect(nexts).toContain("income-range");
    expect(nexts).toContain("leaf-self-employed");
  });

  it("the high-income branch routes Div 293 vs high-earner", () => {
    const capCheckHigh = byId.get("cap-check-high") as TreeQuestion;
    const nexts = capCheckHigh.options.map((o) => o.next);
    expect(nexts).toContain("leaf-div293");
    expect(nexts).toContain("leaf-high-earner");
  });

  it("clear-winner, high-earner and div293 leaves all carry a 'buy' verdict", () => {
    (["leaf-clear-winner", "leaf-high-earner", "leaf-div293"] as const).forEach(
      (id) => {
        const leaf = byId.get(id) as TreeLeaf;
        expect(leaf.verdict).toBe("buy");
      },
    );
  });

  it("low-income, near-cap and self-employed leaves are 'review' verdicts", () => {
    (["leaf-low-income", "leaf-near-cap", "leaf-self-employed"] as const).forEach(
      (id) => {
        const leaf = byId.get(id) as TreeLeaf;
        expect(leaf.verdict).toBe("review");
      },
    );
  });
});
