import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GetMatchedEmbed from "@/components/get-matched/GetMatchedEmbed";

describe("GetMatchedEmbed — inline variant", () => {
  it("renders a single compact CTA linking into the opportunity Get Matched flow", () => {
    render(<GetMatchedEmbed context="opportunity" inline />);
    const link = screen.getByRole("link", { name: /build an action plan/i });
    const href = link.getAttribute("href") ?? "";
    // Same destination as the full card — just rendered as one toolbar button.
    expect(href.startsWith("/get-matched?")).toBe(true);
    expect(href).toContain("context=opportunity");
  });

  it("inline variant does not render the full card heading", () => {
    render(<GetMatchedEmbed context="opportunity" inline />);
    // The verbose "Get Matched" eyebrow belongs to the card, not the inline CTA.
    expect(screen.queryByText("Get Matched")).toBeNull();
  });
});
