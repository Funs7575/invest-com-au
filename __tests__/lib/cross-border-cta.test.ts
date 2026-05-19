import { describe, it, expect } from "vitest";
import {
  getCrossBorderCta,
  CROSS_BORDER_CTA_ISO_CODES,
} from "@/lib/cross-border-cta";

describe("getCrossBorderCta", () => {
  it("returns null for unknown / empty inputs", () => {
    expect(getCrossBorderCta(null)).toBeNull();
    expect(getCrossBorderCta(undefined)).toBeNull();
    expect(getCrossBorderCta("")).toBeNull();
    expect(getCrossBorderCta("zz")).toBeNull();
    expect(getCrossBorderCta("atlantis")).toBeNull();
  });

  it("maps gb (and aliases) to UK Pension Transfer", () => {
    for (const slug of ["gb", "GB", "uk", "UK", "united-kingdom"]) {
      const cta = getCrossBorderCta(slug);
      expect(cta?.specialty).toBe("UK Pension Transfer");
      expect(cta?.countryParam).toBe("gb");
      expect(cta?.href).toBe(
        "/find-advisor?specialty=UK%20Pension%20Transfer&country=gb",
      );
      expect(cta?.ctaLabel).toMatch(/UK Pension Transfer/);
    }
  });

  it("maps us / usa / united-states to FATCA-Aware US Expat Planning", () => {
    for (const slug of ["us", "usa", "united-states"]) {
      const cta = getCrossBorderCta(slug);
      expect(cta?.specialty).toBe("FATCA-Aware US Expat Planning");
      expect(cta?.countryParam).toBe("us");
      expect(cta?.href).toContain(
        "specialty=FATCA-Aware%20US%20Expat%20Planning",
      );
      expect(cta?.href).toContain("country=us");
    }
  });

  it("returns country-only CTAs (no specialty) for unmapped corridors", () => {
    const cta = getCrossBorderCta("hong-kong");
    expect(cta?.specialty).toBeNull();
    expect(cta?.countryParam).toBe("hk");
    expect(cta?.href).toBe("/find-advisor?country=hk");
    expect(cta?.ctaLabel).toMatch(/Hong Kong/);
  });

  it("includes at least the corridors used by the country page directory", () => {
    // Mirrors app/foreign-investment/from/* dirs we currently render.
    for (const iso of ["gb", "us", "in", "hk", "cn", "jp", "my", "nz", "sa"]) {
      expect(CROSS_BORDER_CTA_ISO_CODES).toContain(iso);
    }
  });

  it("encodes the specialty into the href safely", () => {
    const cta = getCrossBorderCta("uk");
    // The space in "UK Pension Transfer" must be percent-encoded.
    expect(cta?.href).toContain("%20");
    expect(cta?.href).not.toContain(" ");
  });
});
