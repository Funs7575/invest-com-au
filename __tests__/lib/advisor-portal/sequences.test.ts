import { describe, it, expect } from "vitest";

import {
  firstName,
  resolveMergeFields,
  escapeHtml,
  renderSubject,
  renderBodyHtml,
  renderBodyText,
  validateSteps,
  MERGE_FIELDS,
  MAX_BODY_LEN,
  MAX_SUBJECT_LEN,
  MAX_STEPS_PER_SEQUENCE,
  SEED_SEQUENCE_TEMPLATES,
  type MergeContext,
} from "@/lib/advisor-portal/sequences";

const CTX: MergeContext = {
  leadFirstName: "Sam",
  adviserName: "Dana Lee",
  adviserFirm: "Lee Advisory",
};

describe("firstName", () => {
  it("returns the first whitespace-delimited word", () => {
    expect(firstName("Jordan Taylor Smith")).toBe("Jordan");
    expect(firstName("  Robin  ")).toBe("Robin");
  });
  it("handles empty / nullish names", () => {
    expect(firstName("")).toBe("");
    expect(firstName(null)).toBe("");
    expect(firstName(undefined)).toBe("");
  });
});

describe("resolveMergeFields — allowlist only", () => {
  it("resolves the three allowlisted fields", () => {
    expect(resolveMergeFields("Hi {{lead_first_name}}", CTX)).toBe("Hi Sam");
    expect(resolveMergeFields("— {{adviser_name}}, {{adviser_firm}}", CTX)).toBe("— Dana Lee, Lee Advisory");
  });

  it("is case-insensitive and whitespace-tolerant", () => {
    expect(resolveMergeFields("Hi {{ LEAD_First_Name }}", CTX)).toBe("Hi Sam");
  });

  it("leaves UNKNOWN tokens literal (never resolves outside the allowlist)", () => {
    expect(resolveMergeFields("Acct: {{account_number}} {{password}}", CTX)).toBe(
      "Acct: {{account_number}} {{password}}",
    );
  });

  it("falls back to a neutral greeting when the lead name is empty", () => {
    expect(resolveMergeFields("Hi {{lead_first_name}},", { ...CTX, leadFirstName: "" })).toBe("Hi there,");
  });

  it("only exposes exactly the documented merge fields", () => {
    expect([...MERGE_FIELDS]).toEqual(["lead_first_name", "adviser_name", "adviser_firm"]);
  });
});

describe("escapeHtml + renderBodyHtml — adviser content is inert", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<b>"x" & 'y'>`)).toBe("&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&gt;");
  });

  it("neutralises a script tag an adviser types in the body", () => {
    const html = renderBodyHtml("<script>alert(1)</script>", CTX);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("neutralises markup arriving via a merge value", () => {
    const html = renderBodyHtml("Hi {{adviser_firm}}", { ...CTX, adviserFirm: "<img src=x onerror=alert(1)>" });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("converts newlines to <br> AFTER escaping", () => {
    expect(renderBodyHtml("line1\nline2", CTX)).toBe("line1<br>line2");
    // CRLF collapses to a single <br>
    expect(renderBodyHtml("a\r\nb", CTX)).toBe("a<br>b");
  });
});

describe("renderSubject", () => {
  it("resolves merge fields and collapses to a single trimmed line", () => {
    expect(renderSubject("  Hi {{lead_first_name}}\n  ", CTX)).toBe("Hi Sam");
  });
  it("does not HTML-escape (subjects are sent as text)", () => {
    expect(renderSubject("A & B", CTX)).toBe("A & B");
  });
});

describe("renderBodyText", () => {
  it("resolves merge fields and keeps newlines (no <br>)", () => {
    expect(renderBodyText("Hi {{lead_first_name}}\nThanks", CTX)).toBe("Hi Sam\nThanks");
  });
});

describe("validateSteps", () => {
  const ok = { day_offset: 0, subject: "Hi", body: "Hello there" };

  it("rejects an empty step list", () => {
    expect(validateSteps([])).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects more than the max steps", () => {
    const many = Array.from({ length: MAX_STEPS_PER_SEQUENCE + 1 }, () => ({ ...ok }));
    expect(validateSteps(many)).toEqual({ ok: false, reason: "too_many_steps" });
  });

  it("rejects a day_offset outside 0..30", () => {
    expect(validateSteps([{ ...ok, day_offset: 31 }])).toMatchObject({ ok: false, reason: "bad_day_offset", index: 0 });
    expect(validateSteps([{ ...ok, day_offset: -1 }])).toMatchObject({ ok: false, reason: "bad_day_offset" });
    expect(validateSteps([{ ...ok, day_offset: 1.5 }])).toMatchObject({ ok: false, reason: "bad_day_offset" });
  });

  it("rejects empty / oversized subject", () => {
    expect(validateSteps([{ ...ok, subject: "   " }])).toMatchObject({ ok: false, reason: "subject_empty" });
    expect(validateSteps([{ ...ok, subject: "x".repeat(MAX_SUBJECT_LEN + 1) }])).toMatchObject({
      ok: false,
      reason: "subject_too_long",
    });
  });

  it("rejects empty / oversized body", () => {
    expect(validateSteps([{ ...ok, body: "  " }])).toMatchObject({ ok: false, reason: "body_empty" });
    expect(validateSteps([{ ...ok, body: "x".repeat(MAX_BODY_LEN + 1) }])).toMatchObject({
      ok: false,
      reason: "body_too_long",
    });
  });

  it("accepts and normalises a valid set (trims subject/body)", () => {
    const res = validateSteps([{ day_offset: 2, subject: "  Hi  ", body: "  Hello  " }]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.steps[0]).toEqual({ day_offset: 2, subject: "Hi", body: "Hello" });
    }
  });
});

describe("SEED_SEQUENCE_TEMPLATES", () => {
  it("ships templates that pass validation (so the seed never produces a 400)", () => {
    for (const tpl of SEED_SEQUENCE_TEMPLATES) {
      expect(tpl.steps.length).toBeGreaterThan(0);
      expect(tpl.steps.length).toBeLessThanOrEqual(MAX_STEPS_PER_SEQUENCE);
      const res = validateSteps(tpl.steps);
      expect(res.ok).toBe(true);
    }
  });

  it("seed steps only reference allowlisted merge fields", () => {
    const tokenRe = /\{\{\s*([a-z_]+)\s*\}\}/gi;
    for (const tpl of SEED_SEQUENCE_TEMPLATES) {
      for (const step of tpl.steps) {
        const text = `${step.subject}\n${step.body}`;
        for (const m of text.matchAll(tokenRe)) {
          expect(MERGE_FIELDS).toContain(m[1]!.toLowerCase());
        }
      }
    }
  });
});
