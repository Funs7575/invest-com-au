import { describe, it, expect } from "vitest";
import {
  SMSF_SETUP_TREE,
  SMSF_SETUP_START_ID,
} from "@/lib/decision-trees/smsf-setup";
import type { TreeNode, TreeLeaf, TreeQuestion } from "@/components/DecisionTree";

/**
 * smsf-setup.ts is a static `TreeNode[]` data module (no runtime logic).
 * These tests assert the structural invariants the DecisionTree renderer
 * relies on, plus that the documented routing (returns-check can loop
 * back into the shared balance-check question) resolves cleanly.
 */

const VALID_VERDICTS = new Set(["buy", "rent", "save", "review"]);

function isLeaf(node: TreeNode): node is TreeLeaf {
  return "verdict" in node;
}
function isQuestion(node: TreeNode): node is TreeQuestion {
  return "question" in node;
}

const byId = new Map(SMSF_SETUP_TREE.map((n) => [n.id, n]));

describe("SMSF_SETUP_TREE — shape & invariants (static data module)", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(SMSF_SETUP_TREE)).toBe(true);
    expect(SMSF_SETUP_TREE.length).toBeGreaterThan(0);
  });

  it("exposes a start id that points at an existing node", () => {
    expect(SMSF_SETUP_START_ID).toBe("start");
    expect(byId.has(SMSF_SETUP_START_ID)).toBe(true);
  });

  it("every node id is unique and non-empty", () => {
    const ids = SMSF_SETUP_TREE.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id.length).toBeGreaterThan(0));
  });

  it("every node is exactly one of question | leaf", () => {
    SMSF_SETUP_TREE.forEach((node) => {
      const leaf = isLeaf(node);
      const question = isQuestion(node);
      expect(leaf || question).toBe(true);
      expect(leaf && question).toBe(false);
    });
  });

  it("every question has at least two options, each with label + resolvable next", () => {
    SMSF_SETUP_TREE.filter(isQuestion).forEach((q) => {
      expect(q.question.length).toBeGreaterThan(0);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      q.options.forEach((opt) => {
        expect(opt.label.length).toBeGreaterThan(0);
        expect(byId.has(opt.next)).toBe(true);
      });
    });
  });

  it("every leaf has a valid verdict, heading, and detail", () => {
    const leaves = SMSF_SETUP_TREE.filter(isLeaf);
    expect(leaves.length).toBeGreaterThan(0);
    leaves.forEach((leaf) => {
      expect(VALID_VERDICTS.has(leaf.verdict)).toBe(true);
      expect(leaf.heading.length).toBeGreaterThan(0);
      expect(leaf.detail.length).toBeGreaterThan(0);
    });
  });

  it("leaf actions (when present) have a label and a root-relative href", () => {
    SMSF_SETUP_TREE.filter(isLeaf)
      .filter((l): l is TreeLeaf & { action: NonNullable<TreeLeaf["action"]> } =>
        Boolean(l.action),
      )
      .forEach((leaf) => {
        expect(leaf.action.label.length).toBeGreaterThan(0);
        expect(leaf.action.href.startsWith("/")).toBe(true);
      });
  });

  it("every node is reachable from the start id (no orphans), tolerating the returns->balance loop", () => {
    const seen = new Set<string>();
    const stack = [SMSF_SETUP_START_ID];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue; // guard handles the returns-check -> balance-check re-entry
      seen.add(id);
      const node = byId.get(id);
      if (node && isQuestion(node)) {
        node.options.forEach((o) => stack.push(o.next));
      }
    }
    const allIds = new Set(SMSF_SETUP_TREE.map((n) => n.id));
    expect(seen).toEqual(allIds);
  });

  it("the start node offers control, business-property and returns paths", () => {
    const start = byId.get("start") as TreeQuestion;
    const nexts = start.options.map((o) => o.next);
    expect(nexts).toContain("balance-check");
    expect(nexts).toContain("leaf-business-property");
    expect(nexts).toContain("returns-check");
  });

  it("returns-check feeds back into the shared balance-check question (no duplicate balance node)", () => {
    const returnsCheck = byId.get("returns-check") as TreeQuestion;
    const nexts = returnsCheck.options.map((o) => o.next);
    expect(nexts).toContain("balance-check");
    expect(nexts).toContain("leaf-check-fund-first");
  });

  it("balance bands map to escalating verdicts: too-small=rent, mid=review, strong=buy", () => {
    expect((byId.get("leaf-too-small") as TreeLeaf).verdict).toBe("rent");
    expect((byId.get("leaf-viable-watch-costs") as TreeLeaf).verdict).toBe(
      "review",
    );
    expect((byId.get("leaf-viable-strong") as TreeLeaf).verdict).toBe("buy");
  });

  it("balance-check has exactly three bands", () => {
    const balanceCheck = byId.get("balance-check") as TreeQuestion;
    expect(balanceCheck.options).toHaveLength(3);
    expect(balanceCheck.options.map((o) => o.next)).toEqual([
      "leaf-too-small",
      "leaf-viable-watch-costs",
      "leaf-viable-strong",
    ]);
  });
});
