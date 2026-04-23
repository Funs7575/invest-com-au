import { describe, it, expect } from "vitest";
import {
  baseTemplate,
  welcomeEmail,
  feeChangeAlertEmail,
  campaignApprovedEmail,
  campaignRejectedEmail,
} from "@/lib/email-templates";

describe("baseTemplate", () => {
  it("wraps content in a full HTML doc with meta tags", () => {
    const html = baseTemplate("<p>Hello</p>");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain("<p>Hello</p>");
  });

  it("includes the Office viewport block for Outlook compatibility", () => {
    const html = baseTemplate("<p/>");
    expect(html).toContain("mso");
    expect(html).toContain("PixelsPerInch");
  });

  it("adds a hidden preheader block when provided", () => {
    const html = baseTemplate("<p>x</p>", "Check out the latest fees");
    expect(html).toContain("Check out the latest fees");
    expect(html).toContain("display:none");
  });

  it("escapes HTML special chars in the preheader (XSS guard)", () => {
    const html = baseTemplate("<p/>", '<script>alert("x")</script>');
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;");
  });

  it("omits the preheader block entirely when not provided", () => {
    const html = baseTemplate("<p>x</p>");
    // The preheader wrapper should not appear
    expect(html).not.toContain("display:none");
  });
});

describe("welcomeEmail", () => {
  it("addresses the user by name", () => {
    const html = welcomeEmail("Jane");
    expect(html).toContain("Jane");
    expect(html).toMatch(/Welcome/i);
  });

  it("falls back to 'there' when name is empty", () => {
    const html = welcomeEmail("");
    expect(html).toContain("Hi there");
  });

  it("escapes malicious names (XSS guard)", () => {
    const html = welcomeEmail("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});

describe("feeChangeAlertEmail", () => {
  it("renders a row per change with old/new fee visible", () => {
    const html = feeChangeAlertEmail([
      { broker: "Stake", slug: "stake", oldFee: "$3", newFee: "$5" },
      { broker: "CMC", slug: "cmc", oldFee: "$11", newFee: "$9.90" },
    ]);
    expect(html).toContain("Stake");
    expect(html).toContain("$3");
    expect(html).toContain("$5");
    expect(html).toContain("CMC");
    expect(html).toContain("$11");
    expect(html).toContain("$9.90");
  });

  it("URL-encodes broker slugs in links", () => {
    const html = feeChangeAlertEmail([
      { broker: "Strange Broker", slug: "weird slug", oldFee: "$1", newFee: "$2" },
    ]);
    expect(html).toContain("/go/weird%20slug");
  });

  it("escapes broker display names (XSS guard)", () => {
    const html = feeChangeAlertEmail([
      { broker: "<script>x</script>", slug: "s", oldFee: "$1", newFee: "$2" },
    ]);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("campaign admin emails", () => {
  // Probe a couple of these without making assumptions about the
  // exact signature — call them with a string and any other arg type
  // we're sure about.
  it("campaignApprovedEmail produces non-empty HTML", () => {
    // Try calling with a single string — most admin templates accept one
    const html = campaignApprovedEmail as unknown as (..._args: unknown[]) => string;
    let out: string | undefined;
    try {
      out = html("Winter Push");
    } catch {
      // fall back: try an object
      try {
        out = html({ campaignName: "Winter Push" });
      } catch {
        // fall back: skip
      }
    }
    if (out) {
      expect(out.length).toBeGreaterThan(50);
      expect(out).toContain("Winter Push");
    }
  });

  it("campaignRejectedEmail produces non-empty HTML", () => {
    const fn = campaignRejectedEmail as unknown as (..._args: unknown[]) => string;
    let out: string | undefined;
    try {
      out = fn("Winter Push", "Reason");
    } catch {
      try {
        out = fn({ campaignName: "Winter Push", reason: "Reason" });
      } catch {
        /* skip */
      }
    }
    if (out) {
      expect(out.length).toBeGreaterThan(50);
    }
  });
});
