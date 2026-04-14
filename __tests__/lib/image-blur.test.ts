import { describe, it, expect } from "vitest";
import { blurDataURL, gradientBlurDataURL } from "@/lib/image-blur";

function decode(dataUrl: string): string {
  const b64 = dataUrl.replace(/^data:image\/svg\+xml;base64,/, "");
  return Buffer.from(b64, "base64").toString("utf8");
}

describe("blurDataURL", () => {
  it("returns a base64 SVG data URL", () => {
    const url = blurDataURL("#ff0000");
    expect(url.startsWith("data:image/svg+xml;base64,")).toBe(true);
    const svg = decode(url);
    expect(svg).toContain("#ff0000");
    expect(svg).toContain("<svg");
  });

  it("falls back to a default for an invalid colour", () => {
    const url = blurDataURL("javascript:alert(1)");
    const svg = decode(url);
    // Should NOT include the XSS attempt
    expect(svg).not.toContain("javascript");
    // Should include the fallback
    expect(svg).toContain("#e2e8f0");
  });

  it("rejects colour with angle brackets (XSS attempt)", () => {
    const url = blurDataURL('"><script>alert(1)</script>');
    const svg = decode(url);
    expect(svg).not.toContain("<script");
  });

  it("accepts rgb() and named colours", () => {
    expect(decode(blurDataURL("rgb(255, 0, 0)"))).toContain("rgb(255, 0, 0)");
    expect(decode(blurDataURL("royalblue"))).toContain("royalblue");
  });
});

describe("gradientBlurDataURL", () => {
  it("returns a gradient SVG with both colours", () => {
    const url = gradientBlurDataURL("#111111", "#eeeeee");
    const svg = decode(url);
    expect(svg).toContain("#111111");
    expect(svg).toContain("#eeeeee");
    expect(svg).toContain("linearGradient");
  });

  it("falls back on invalid input", () => {
    const url = gradientBlurDataURL("<bad>", "<worse>");
    const svg = decode(url);
    expect(svg).not.toContain("<bad>");
  });
});
