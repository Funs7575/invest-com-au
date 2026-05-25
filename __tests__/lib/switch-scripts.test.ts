import { describe, it, expect } from "vitest";
import {
  SWITCH_SCRIPTS,
  getSwitchScript,
  listSwitchScripts,
} from "@/lib/switch-scripts";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("SWITCH_SCRIPTS data invariants", () => {
  it("is non-empty", () => {
    expect(SWITCH_SCRIPTS.length).toBeGreaterThan(0);
  });

  it("has unique broker slugs", () => {
    const slugs = SWITCH_SCRIPTS.map((s) => s.brokerSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every script has required string fields populated", () => {
    for (const s of SWITCH_SCRIPTS) {
      expect(s.brokerSlug.length).toBeGreaterThan(0);
      expect(s.brokerName.length).toBeGreaterThan(0);
      expect(s.whySwitch.length).toBeGreaterThan(0);
    }
  });

  it("negotiation steps have label + body", () => {
    for (const s of SWITCH_SCRIPTS) {
      expect(s.negotiationScript.length).toBeGreaterThan(0);
      for (const step of s.negotiationScript) {
        expect(step.label.length).toBeGreaterThan(0);
        expect(step.body.length).toBeGreaterThan(0);
      }
    }
  });

  it("transfer steps have label + body, eta optional", () => {
    for (const s of SWITCH_SCRIPTS) {
      expect(s.transferProcess.length).toBeGreaterThan(0);
      for (const step of s.transferProcess) {
        expect(step.label.length).toBeGreaterThan(0);
        expect(step.body.length).toBeGreaterThan(0);
        if (step.eta !== undefined) {
          expect(typeof step.eta).toBe("string");
        }
      }
    }
  });

  it("tax notes are non-empty strings", () => {
    for (const s of SWITCH_SCRIPTS) {
      expect(s.taxNotes.length).toBeGreaterThan(0);
      for (const note of s.taxNotes) {
        expect(typeof note).toBe("string");
        expect(note.length).toBeGreaterThan(0);
      }
    }
  });

  it("recommendedAlternatives never reference the broker itself", () => {
    for (const s of SWITCH_SCRIPTS) {
      expect(s.recommendedAlternatives).not.toContain(s.brokerSlug);
    }
  });

  it("verifiedAt + stalesAt are ISO dates and verifiedAt precedes stalesAt", () => {
    for (const s of SWITCH_SCRIPTS) {
      expect(s.verifiedAt).toMatch(ISO_DATE);
      expect(s.stalesAt).toMatch(ISO_DATE);
      expect(new Date(s.verifiedAt).getTime()).toBeLessThan(new Date(s.stalesAt).getTime());
    }
  });

  it("sourceUrl, when present, is an https URL", () => {
    for (const s of SWITCH_SCRIPTS) {
      if (s.sourceUrl !== undefined) {
        expect(s.sourceUrl.startsWith("https://")).toBe(true);
      }
    }
  });
});

describe("getSwitchScript", () => {
  it("returns the matching script for a known slug", () => {
    const s = getSwitchScript("commsec");
    expect(s).toBeDefined();
    expect(s!.brokerName).toBe("CommSec");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getSwitchScript("does-not-exist")).toBeUndefined();
  });

  it("is case-sensitive (no fuzzy match)", () => {
    expect(getSwitchScript("CommSec")).toBeUndefined();
  });

  it("resolves every defined slug", () => {
    for (const s of SWITCH_SCRIPTS) {
      expect(getSwitchScript(s.brokerSlug)).toBe(s);
    }
  });
});

describe("listSwitchScripts", () => {
  it("returns the full SWITCH_SCRIPTS array", () => {
    expect(listSwitchScripts()).toBe(SWITCH_SCRIPTS);
    expect(listSwitchScripts()).toHaveLength(SWITCH_SCRIPTS.length);
  });
});
