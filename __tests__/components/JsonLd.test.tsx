/**
 * Render-time tests for the <JsonLd> helper.
 *
 * Verifies the component emits a valid `application/ld+json` script tag
 * with the serialised payload — the contract that the coverage gate
 * depends on.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import JsonLd from "@/components/JsonLd";

describe("<JsonLd>", () => {
  it("renders one <script> tag for a single object", () => {
    const data = { "@context": "https://schema.org", "@type": "WebSite", name: "Foo" };
    const { container } = render(<JsonLd data={data} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0]!.innerHTML)).toEqual(data);
  });

  it("renders one <script> per entry when given an array", () => {
    const data = [
      { "@type": "BreadcrumbList", itemListElement: [] },
      { "@type": "FAQPage", mainEntity: [] },
    ];
    const { container } = render(<JsonLd data={data} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(2);
    expect(JSON.parse(scripts[0]!.innerHTML)["@type"]).toBe("BreadcrumbList");
    expect(JSON.parse(scripts[1]!.innerHTML)["@type"]).toBe("FAQPage");
  });

  it("renders nothing when data is null or undefined", () => {
    const { container: c1 } = render(<JsonLd data={null} />);
    const { container: c2 } = render(<JsonLd data={undefined} />);
    expect(c1.querySelectorAll("script")).toHaveLength(0);
    expect(c2.querySelectorAll("script")).toHaveLength(0);
  });

  it("appends data-testid on each block when testId is provided", () => {
    const data = [{ a: 1 }, { b: 2 }];
    const { container } = render(<JsonLd data={data} testId="ld" />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts[0]!.getAttribute("data-testid")).toBe("ld-0");
    expect(scripts[1]!.getAttribute("data-testid")).toBe("ld-1");
  });

  it("omits data-testid when testId is not provided", () => {
    const { container } = render(<JsonLd data={{ a: 1 }} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script!.hasAttribute("data-testid")).toBe(false);
  });
});
