import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import AdvisorMatchCTA from "@/components/AdvisorMatchCTA";

describe("AdvisorMatchCTA", () => {
  it("renders the headline + description", () => {
    render(
      <AdvisorMatchCTA
        needKey="mortgage"
        headline="Need a mortgage broker?"
        description="Get matched with a verified broker."
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Need a mortgage broker?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Get matched with a verified broker."),
    ).toBeInTheDocument();
  });

  it("renders a 'Get Matched Free' CTA link", () => {
    render(
      <AdvisorMatchCTA
        needKey="mortgage"
        headline="x"
        description="y"
      />,
    );
    expect(
      screen.getByRole("link", { name: /Get Matched Free/ }),
    ).toBeInTheDocument();
  });

  it("includes the needKey as a query param in the CTA href", () => {
    render(
      <AdvisorMatchCTA
        needKey="mortgage"
        headline="x"
        description="y"
      />,
    );
    const href = screen
      .getByRole("link", { name: /Get Matched Free/ })
      .getAttribute("href");
    expect(href).toContain("need=mortgage");
  });

  it("appends state + postcode + budget to the CTA href when supplied (LX-04 pre-fill)", () => {
    render(
      <AdvisorMatchCTA
        needKey="planning"
        headline="x"
        description="y"
        state="VIC"
        postcode="3000"
        budget="200k_500k"
      />,
    );
    const href = screen
      .getByRole("link", { name: /Get Matched Free/ })
      .getAttribute("href")!;
    expect(href).toContain("need=planning");
    expect(href).toContain("state=VIC");
    expect(href).toContain("postcode=3000");
    expect(href).toContain("budget=200k_500k");
  });

  it("omits state/postcode/budget from the href when not supplied", () => {
    render(
      <AdvisorMatchCTA
        needKey="mortgage"
        headline="x"
        description="y"
      />,
    );
    const href = screen
      .getByRole("link", { name: /Get Matched Free/ })
      .getAttribute("href")!;
    expect(href).not.toContain("state=");
    expect(href).not.toContain("postcode=");
    expect(href).not.toContain("budget=");
  });
});
