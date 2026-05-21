import { describe, it, expect } from "vitest";
import {
  BUY_VS_RENT_TREE,
  BUY_VS_RENT_START_ID,
} from "@/lib/decision-trees/buy-vs-rent";
import type { TreeNode, TreeLeaf, TreeQuestion } from "@/components/DecisionTree";

/**
 * buy-vs-rent.ts is a static `TreeNode[]` data module (no runtime logic).
 * These tests assert the structural invariants the DecisionTree renderer
 * relies on: unique ids, every `next` pointer resolves, every node is
 * reachable from the start id, every leaf has a valid verdict, and there
 * are no orphans or dangling references.
 */

const VALID_VERDICTS = new Set(["buy", "rent", "save", "review"]);

function isLeaf(node: TreeNode): node is TreeLeaf {
  return "verdict" in node;
}
function isQuestion(node: TreeNode): node is TreeQuestion {
  return "question" in node;
}

const byId = new Map(BUY_VS_RENT_TREE.map((n) => [n.id, n]));

describe("BUY_VS_RENT_TREE — shape & invariants (static data module)", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(BUY_VS_RENT_TREE)).toBe(true);
    expect(BUY_VS_RENT_TREE.length).toBeGreaterThan(0);
  });

  it("exposes a start id that points at an existing node", () => {
    expect(BUY_VS_RENT_START_ID).toBe("start");
    expect(byId.has(BUY_VS_RENT_START_ID)).toBe(true);
  });

  it("every node id is unique and non-empty", () => {
    const ids = BUY_VS_RENT_TREE.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id.length).toBeGreaterThan(0));
  });

  it("every node is exactly one of question | leaf (never both, never neither)", () => {
    BUY_VS_RENT_TREE.forEach((node) => {
      const leaf = isLeaf(node);
      const question = isQuestion(node);
      expect(leaf || question).toBe(true);
      expect(leaf && question).toBe(false);
    });
  });

  it("every question has at least two options, each with label + resolvable next", () => {
    BUY_VS_RENT_TREE.filter(isQuestion).forEach((q) => {
      expect(q.question.length).toBeGreaterThan(0);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      q.options.forEach((opt) => {
        expect(opt.label.length).toBeGreaterThan(0);
        expect(byId.has(opt.next)).toBe(true);
      });
    });
  });

  it("every leaf has a valid verdict, heading, and detail", () => {
    const leaves = BUY_VS_RENT_TREE.filter(isLeaf);
    expect(leaves.length).toBeGreaterThan(0);
    leaves.forEach((leaf) => {
      expect(VALID_VERDICTS.has(leaf.verdict)).toBe(true);
      expect(leaf.heading.length).toBeGreaterThan(0);
      expect(leaf.detail.length).toBeGreaterThan(0);
    });
  });

  it("leaf actions (when present) have a label and a root-relative href", () => {
    BUY_VS_RENT_TREE.filter(isLeaf)
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
    const stack = [BUY_VS_RENT_START_ID];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const node = byId.get(id);
      if (node && isQuestion(node)) {
        node.options.forEach((o) => stack.push(o.next));
      }
    }
    const allIds = new Set(BUY_VS_RENT_TREE.map((n) => n.id));
    expect(seen).toEqual(allIds);
  });

  it("contains the expected verdict spread (buy / rent / save / review all present)", () => {
    const verdicts = new Set(BUY_VS_RENT_TREE.filter(isLeaf).map((l) => l.verdict));
    expect(verdicts).toEqual(new Set(["buy", "rent", "save", "review"]));
  });

  it("the start node branches to both the renter and the owner paths", () => {
    const start = byId.get("start");
    expect(start && isQuestion(start)).toBe(true);
    const nexts = (start as TreeQuestion).options.map((o) => o.next);
    expect(nexts).toContain("horizon");
    expect(nexts).toContain("own-sell");
  });

  it("the short-horizon renter path lands on a 'rent' verdict", () => {
    const leaf = byId.get("leaf-rent-short");
    expect(leaf && isLeaf(leaf) && (leaf as TreeLeaf).verdict).toBe("rent");
  });
});
