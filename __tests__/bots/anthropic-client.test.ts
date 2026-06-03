import { describe, it, expect } from "vitest";
import { coalesceTurns, extractJsonObject } from "../../bots/ai/anthropic-client";
import type { ConversationTurn } from "../../bots/ai/types";

describe("coalesceTurns", () => {
  it("merges consecutive same-role turns", () => {
    const turns: ConversationTurn[] = [
      { role: "user", content: "a" },
      { role: "user", content: "b" },
      { role: "assistant", content: "c" },
    ];
    expect(coalesceTurns(turns)).toEqual([
      { role: "user", content: "a\n\nb" },
      { role: "assistant", content: "c" },
    ]);
  });

  it("drops a leading assistant turn (API must start with user)", () => {
    const turns: ConversationTurn[] = [
      { role: "assistant", content: "x" },
      { role: "user", content: "y" },
    ];
    expect(coalesceTurns(turns)).toEqual([{ role: "user", content: "y" }]);
  });

  it("preserves a valid alternating sequence", () => {
    const turns: ConversationTurn[] = [
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ];
    expect(coalesceTurns(turns)).toHaveLength(3);
  });
});

describe("extractJsonObject", () => {
  it("pulls a JSON object out of surrounding prose", () => {
    expect(extractJsonObject('Sure! {"type":"click","ref":"e1"} done')).toBe(
      '{"type":"click","ref":"e1"}',
    );
  });
  it("returns null when there is no object", () => {
    expect(extractJsonObject("no json here")).toBeNull();
  });
});
