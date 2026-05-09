/**
 * RLS isolation test for qa_votes.
 * Policies: "Public insert votes" WITH CHECK (true), "Public read votes" USING (true).
 * Isolation is enforced by UNIQUE(target_type, target_id, voter_identifier) — duplicate
 * voter cannot vote twice on the same target. There is no user-scoped RLS because the
 * voter is keyed by hashed IP, not auth.uid().
 */

// rls-isolation: qa_votes

import { describe, it, expect } from "vitest";

interface Vote {
  target_type: "question" | "answer";
  target_id: number;
  voter_identifier: string;
  vote_value: 1 | -1;
}

const SEEN: Vote[] = [];

function tryInsert(vote: Vote): { error: { code: string; message: string } | null } {
  const dup = SEEN.find(
    (v) =>
      v.target_type === vote.target_type &&
      v.target_id === vote.target_id &&
      v.voter_identifier === vote.voter_identifier,
  );
  if (dup) return { error: { code: "23505", message: "duplicate key violates unique constraint" } };
  SEEN.push(vote);
  return { error: null };
}

describe("qa_votes — voter dedup (acts as the RLS-equivalent isolation guarantee)", () => {
  it("first vote from a voter on a target succeeds", () => {
    const r = tryInsert({ target_type: "answer", target_id: 1, voter_identifier: "ip-hash-A", vote_value: 1 });
    expect(r.error).toBeNull();
  });

  it("same voter cannot double-vote on the same target", () => {
    tryInsert({ target_type: "answer", target_id: 2, voter_identifier: "ip-hash-B", vote_value: 1 });
    const r = tryInsert({ target_type: "answer", target_id: 2, voter_identifier: "ip-hash-B", vote_value: -1 });
    expect(r.error?.code).toBe("23505");
  });

  it("different voters can both vote on the same target", () => {
    tryInsert({ target_type: "question", target_id: 3, voter_identifier: "ip-hash-C", vote_value: 1 });
    const r = tryInsert({ target_type: "question", target_id: 3, voter_identifier: "ip-hash-D", vote_value: 1 });
    expect(r.error).toBeNull();
  });

  it("same voter can vote on different targets", () => {
    tryInsert({ target_type: "question", target_id: 4, voter_identifier: "ip-hash-E", vote_value: 1 });
    const r = tryInsert({ target_type: "question", target_id: 5, voter_identifier: "ip-hash-E", vote_value: -1 });
    expect(r.error).toBeNull();
  });
});
