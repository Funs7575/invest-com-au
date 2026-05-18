import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import NewsletterProUpsell from "@/app/newsletter/[edition]/NewsletterProUpsell";

describe("NewsletterProUpsell", () => {
  it("links to the /pro upgrade page", () => {
    render(<NewsletterProUpsell />);
    const link = screen.getByRole("link", { name: /Upgrade to Pro/i });
    expect(link).toHaveAttribute("href", "/pro");
  });

  it("exposes a stable test hook so the parent page can opt out", () => {
    render(<NewsletterProUpsell />);
    expect(screen.getByTestId("newsletter-pro-upsell")).toBeInTheDocument();
  });

  it("mentions the Pro tier price so visitors can decide on the spot", () => {
    render(<NewsletterProUpsell />);
    expect(screen.getByTestId("newsletter-pro-upsell")).toHaveTextContent("$99/yr");
  });
});
