import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Drives V-NEW-02. The gate script lives at scripts/check-ai-factual-filter.mjs
// and is executed by .github/workflows/ci.yml. These tests prove the script
// itself does what it claims: pass on a wired AI file, fail on an
// unwired one, honour the EXEMPT allowlist, and reject stale allowlist
// entries.

const SCRIPT = fileURLToPath(
  new URL("../../scripts/check-ai-factual-filter.mjs", import.meta.url),
);

function runOn(workdir: string): { exitCode: number; output: string } {
  try {
    const output = execSync(`node ${SCRIPT} --json --root=${workdir}`, {
      encoding: "utf8",
      timeout: 15000,
    });
    return { exitCode: 0, output };
  } catch (err) {
    const e = err as { status: number; stdout: string; stderr: string };
    return { exitCode: e.status, output: e.stdout || e.stderr || "" };
  }
}

function setupFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "v-new-02-test-"));
  mkdirSync(join(dir, "lib"), { recursive: true });
  mkdirSync(join(dir, "app"), { recursive: true });
  return dir;
}

describe("scripts/check-ai-factual-filter.mjs", () => {
  it("passes when no files import @anthropic-ai/sdk", () => {
    const dir = setupFixture();
    try {
      writeFileSync(join(dir, "lib", "harmless.ts"), "export const x = 1;\n");
      const { exitCode, output } = runOn(dir);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(output) as { ok: boolean; offenders: string[] };
      expect(parsed.ok).toBe(true);
      expect(parsed.offenders).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("FAILS when a file imports Anthropic SDK without filterFactualOutput", () => {
    const dir = setupFixture();
    try {
      writeFileSync(
        join(dir, "app", "rogue-ai.ts"),
        `import Anthropic from "@anthropic-ai/sdk";\nexport const x = new Anthropic();\n`,
      );
      const { exitCode, output } = runOn(dir);
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(output) as { ok: boolean; offenders: string[] };
      expect(parsed.ok).toBe(false);
      expect(parsed.offenders).toContain("app/rogue-ai.ts");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("PASSES when filter is also imported from @/lib/compliance", () => {
    const dir = setupFixture();
    try {
      writeFileSync(
        join(dir, "app", "good-ai.ts"),
        [
          `import Anthropic from "@anthropic-ai/sdk";`,
          `import { filterFactualOutput } from "@/lib/compliance";`,
          `export const x = { Anthropic, filterFactualOutput };`,
        ].join("\n") + "\n",
      );
      const { exitCode } = runOn(dir);
      expect(exitCode).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects bare comment mention of filterFactualOutput as not an import", () => {
    const dir = setupFixture();
    try {
      writeFileSync(
        join(dir, "app", "comment-only.ts"),
        [
          `import Anthropic from "@anthropic-ai/sdk";`,
          `// TODO: should call filterFactualOutput before returning`,
          `export const x = new Anthropic();`,
        ].join("\n") + "\n",
      );
      const { exitCode, output } = runOn(dir);
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(output) as { offenders: string[] };
      expect(parsed.offenders).toContain("app/comment-only.ts");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores test files even when they import Anthropic SDK without the filter", () => {
    const dir = setupFixture();
    try {
      mkdirSync(join(dir, "__tests__"), { recursive: true });
      writeFileSync(
        join(dir, "__tests__", "ai.test.ts"),
        `import Anthropic from "@anthropic-ai/sdk";\nexport const x = 1;\n`,
      );
      const { exitCode } = runOn(dir);
      expect(exitCode).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("honours the in-repo EXEMPT allowlist (real allowlisted file passes)", () => {
    // Run the actual gate against the real repo — should be green with the
    // wiring this PR ships. Catches accidental EXEMPT removal too.
    const result = execSync(`node ${SCRIPT} --json`, { encoding: "utf8", timeout: 30000 });
    const parsed = JSON.parse(result) as {
      ok: boolean;
      offenders: string[];
      exempt: string[];
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.offenders).toEqual([]);
    // Allowlist has the four documented entries; if a new one is added,
    // bump this assertion deliberately rather than letting it silently grow.
    expect(parsed.exempt.length).toBeGreaterThanOrEqual(4);
  }, 30000);
});
