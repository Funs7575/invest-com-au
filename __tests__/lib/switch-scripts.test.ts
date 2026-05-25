import { describe, it, expect } from "vitest";
import {
  SWITCH_SCRIPTS,
  getSwitchScript,
  listSwitchScripts,
} from "@/lib/switch-scripts";

describe("getSwitchScript", () => {
  it("returns the script for a known broker slug", () => {
    const script = getSwitchScript("commsec");
    expect(script).toBeDefined();
    expect(script?.brokerSlug).toBe("commsec");
    expect(script?.brokerName).toBe("CommSec");
  });

  it("returns undefined for an unknown broker slug", () => {
    expect(getSwitchScript("no-such-broker")).toBeUndefined();
  });

  it("is case-sensitive on the slug", () => {
    expect(getSwitchScript("CommSec")).toBeUndefined();
    expect(getSwitchScript("commsec")).toBeDefined();
  });

  it("returns undefined for an empty slug", () => {
    expect(getSwitchScript("")).toBeUndefined();
  });
});

describe("listSwitchScripts", () => {
  it("returns the full SWITCH_SCRIPTS array", () => {
    expect(listSwitchScripts()).toBe(SWITCH_SCRIPTS);
    expect(listSwitchScripts().length).toBeGreaterThan(0);
  });
});

describe("SWITCH_SCRIPTS data integrity", () => {
  it("has unique broker slugs", () => {
    const slugs = SWITCH_SCRIPTS.map((s) => s.brokerSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every script has non-empty negotiation + transfer + tax content", () => {
    for (const s of SWITCH_SCRIPTS) {
      expect(s.brokerName.length).toBeGreaterThan(0);
      expect(s.whySwitch.length).toBeGreaterThan(0);
      expect(s.negotiationScript.length).toBeGreaterThan(0);
      expect(s.transferProcess.length).toBeGreaterThan(0);
      expect(s.taxNotes.length).toBeGreaterThan(0);
      expect(s.recommendedAlternatives.length).toBeGreaterThan(0);
    }
  });

  it("never recommends the broker as its own alternative", () => {
    for (const s of SWITCH_SCRIPTS) {
      expect(s.recommendedAlternatives).not.toContain(s.brokerSlug);
    }
  });

  it("carries ISO verifiedAt/stalesAt dates with stalesAt after verifiedAt", () => {
    for (const s of SWITCH_SCRIPTS) {
      const verified = new Date(s.verifiedAt).getTime();
      const stales = new Date(s.stalesAt).getTime();
      expect(Number.isNaN(verified)).toBe(false);
      expect(Number.isNaN(stales)).toBe(false);
      expect(stales).toBeGreaterThan(verified);
    }
  });

  it("negotiation + transfer steps always carry a label and body", () => {
    for (const s of SWITCH_SCRIPTS) {
      for (const step of s.negotiationScript) {
        expect(step.label.length).toBeGreaterThan(0);
        expect(step.body.length).toBeGreaterThan(0);
      }
      for (const step of s.transferProcess) {
        expect(step.label.length).toBeGreaterThan(0);
        expect(step.body.length).toBeGreaterThan(0);
      }
    }
  });
});
