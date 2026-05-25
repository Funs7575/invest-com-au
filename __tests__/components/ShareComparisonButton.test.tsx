import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "./setup";
import ShareComparisonButton from "@/components/compare/ShareComparisonButton";
import { trackEvent } from "@/lib/tracking";

/**
 * Structural + tracking tests. The clipboard/native-share paths fight jsdom's
 * read-only `navigator.clipboard` and absent `navigator.share`, so a click
 * deterministically falls through to the `window.prompt` fallback here — which
 * we stub. End-to-end copy semantics are exercised against the live preview.
 */
describe("ShareComparisonButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom doesn't implement prompt; stub it so the fallback path is inert.
    vi.stubGlobal("prompt", vi.fn());
  });

  it("renders a Share button with a descriptive title", () => {
    render(<ShareComparisonButton brokerSlugs={["commsec", "stake"]} />);
    expect(
      screen.getByRole("button", {
        name: /share/i,
      }),
    ).toHaveAttribute("title", "Copy a shareable link to this comparison");
  });

  it("renders nothing when there are no broker slugs", () => {
    const { container } = render(<ShareComparisonButton brokerSlugs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("accepts a custom className override", () => {
    render(
      <ShareComparisonButton
        brokerSlugs={["commsec"]}
        className="custom-share"
      />,
    );
    expect(screen.getByRole("button", { name: /share/i })).toHaveClass(
      "custom-share",
    );
  });

  it("fires a saved_comparison_share tracking event on click", async () => {
    render(
      <ShareComparisonButton
        brokerSlugs={["commsec", "stake", "moomoo"]}
        name="Low-fee brokers"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /share/i }));

    expect(trackEvent).toHaveBeenCalledWith(
      "saved_comparison_share",
      { count: "3" },
      "/account/saved",
    );
  });
});
