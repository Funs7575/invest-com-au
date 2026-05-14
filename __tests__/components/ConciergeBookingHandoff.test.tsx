import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, userEvent } from "../components/setup";
import ConciergeBookingHandoff from "@/components/ConciergeBookingHandoff";
import * as tracking from "@/lib/tracking";

vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("ConciergeBookingHandoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading and CTA", () => {
    render(
      <ConciergeBookingHandoff firstUserMessage={null} sessionId={null} messagesCount={0} />,
    );
    expect(screen.getByText(/ready for personal advice/i)).toBeInTheDocument();
    expect(screen.getByTestId("concierge-booking-handoff-cta")).toHaveTextContent(
      /book a call/i,
    );
  });

  it("links to /find-advisor with source=concierge when no user message", () => {
    render(
      <ConciergeBookingHandoff firstUserMessage={null} sessionId={null} messagesCount={0} />,
    );
    const cta = screen.getByTestId("concierge-booking-handoff-cta");
    expect(cta).toHaveAttribute("href", "/find-advisor?source=concierge");
  });

  it("forwards the first user message as seed (trimmed + 200-char capped)", () => {
    const long = "  ETF for a beginner ".repeat(20);
    render(
      <ConciergeBookingHandoff
        firstUserMessage={long}
        sessionId={"abcdef12-3456-7890-1234-56789abcdef0"}
        messagesCount={3}
      />,
    );
    const cta = screen.getByTestId("concierge-booking-handoff-cta");
    const href = cta.getAttribute("href") ?? "";
    expect(href).toContain("source=concierge");
    expect(href).toContain("concierge_session=abcdef12-3456-7890-1234-56789abcdef0");
    const url = new URL(`http://x${href}`);
    const seed = url.searchParams.get("seed") ?? "";
    expect(seed.length).toBeGreaterThan(0);
    expect(seed.length).toBeLessThanOrEqual(200);
    expect(seed.startsWith(" ")).toBe(false);
  });

  it("omits seed param when first user message is empty / whitespace", () => {
    render(
      <ConciergeBookingHandoff
        firstUserMessage={"   "}
        sessionId={null}
        messagesCount={1}
      />,
    );
    const href = screen.getByTestId("concierge-booking-handoff-cta").getAttribute("href") ?? "";
    expect(href).not.toContain("seed=");
  });

  it("emits a tracking event when the CTA is clicked", async () => {
    const spy = vi.spyOn(tracking, "trackEvent");
    const user = userEvent.setup();
    render(
      <ConciergeBookingHandoff
        firstUserMessage={"hi"}
        sessionId={"sess-12345"}
        messagesCount={2}
      />,
    );
    await user.click(screen.getByTestId("concierge-booking-handoff-cta"));
    expect(spy).toHaveBeenCalledWith(
      "concierge_booking_handoff_click",
      expect.objectContaining({ session_id: "sess-12345", messages_count: 2 }),
    );
  });
});
