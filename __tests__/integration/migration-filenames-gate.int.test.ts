/**
 * Integration test for scripts/check-migration-filenames.mjs — the parts the
 * pure-function unit tests can't reach: the git acquisition + the gate's actual
 * exit codes. Spawns the real gate against a throwaway git repo.
 *
 * Guards the load-bearing fixes:
 *  - archive/** files are filtered out of the active set (directory pathspec +
 *    dirname filter),
 *  - a rename to a bad name is caught regardless of the caller's diff.renames
 *    config (the gate forces diff.renames=false),
 *  - an unresolvable base ref skips loudly (exit 0 + warning), never a false fail,
 *  - violations exit 1, clean PRs exit 0.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const GATE = join(process.cwd(), "scripts/check-migration-filenames.mjs");
let repo: string;

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
}

function writeFileEnsuring(relPath: string, body = "-- noop\n"): void {
  const abs = join(repo, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body);
}

function commitAll(msg: string): void {
  git(["add", "-A"]);
  git(["commit", "-q", "-m", msg]);
}

/** Reset the feature branch to a clean copy of main. */
function freshBranch(): void {
  git(["checkout", "-q", "-B", "feature", "main"]);
  git(["reset", "-q", "--hard", "main"]);
  git(["clean", "-fdq"]);
}

/** Run the real gate against the temp repo; return its exit code + combined
 *  output. spawnSync captures stdout AND stderr regardless of exit code (the
 *  gate's skip/violation messages go to stderr). */
function runGate(env: Record<string, string> = {}): { code: number; out: string } {
  const r = spawnSync("node", [GATE], {
    cwd: repo,
    encoding: "utf8",
    env: { ...process.env, GITHUB_BASE_REF: "main", ...env },
  });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), "miggate-"));
  git(["init", "-q"]);
  git(["checkout", "-q", "-b", "main"]);
  git(["config", "user.email", "t@example.com"]);
  git(["config", "user.name", "t"]);
  git(["config", "commit.gpgsign", "false"]);
  writeFileEnsuring("supabase/migrations/20260101000000_base.sql");
  commitAll("base");
});

afterAll(() => {
  if (repo) rmSync(repo, { recursive: true, force: true });
});

describe("migration-filename gate (integration)", () => {
  it("passes (exit 0) when the added migration has a unique 14-digit version", () => {
    freshBranch();
    writeFileEnsuring("supabase/migrations/20260202000000_good.sql");
    commitAll("good");
    expect(runGate().code).toBe(0);
  });

  it("fails (exit 1) on an 8-digit date-only version and names the file", () => {
    freshBranch();
    writeFileEnsuring("supabase/migrations/20260202_bad.sql");
    commitAll("bad");
    const r = runGate();
    expect(r.code).toBe(1);
    expect(r.out).toContain("20260202_bad.sql");
  });

  it("ignores files added under archive/** (passes even with a bad archived name)", () => {
    freshBranch();
    writeFileEnsuring("supabase/migrations/archive/999_legacy.sql");
    commitAll("archive a legacy file");
    expect(runGate().code).toBe(0);
  });

  it("catches a rename to a bad name even when diff.renames is enabled", () => {
    freshBranch();
    git(["config", "diff.renames", "true"]); // hostile config the gate must override
    git([
      "mv",
      "supabase/migrations/20260101000000_base.sql",
      "supabase/migrations/20260303_renamedbad.sql",
    ]);
    commitAll("rename to bad name");
    const r = runGate();
    git(["config", "--unset", "diff.renames"]);
    expect(r.code).toBe(1);
    expect(r.out).toContain("20260303_renamedbad.sql");
  });

  it("skips loudly (exit 0 + warning) when the base ref can't be resolved", () => {
    freshBranch();
    writeFileEnsuring("supabase/migrations/20260202_bad.sql");
    commitAll("bad but unresolvable base");
    const r = runGate({ GITHUB_BASE_REF: "no-such-ref-xyz" });
    expect(r.code).toBe(0);
    expect(r.out).toContain("not resolvable");
  });
});
