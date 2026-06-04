/**
 * @vitest-environment jsdom
 *
 * Deliberately does NOT import ./setup — the shared setup hard-mocks
 * next/navigation's usePathname to "/", and the newsletter modal is gated
 * to NOT fire on the homepage. We need an eligible content path, so this
 * file owns its own next/navigation mock (which would otherwise lose to
 * setup's). The modal only depends on usePathname + getSessionId + fetch,
 * so none of setup's other mocks (next/link, next/image, useUser) are needed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import NewsletterExitIntentModal from "@/components/NewsletterExitIntentModal";

vi.mock("next/navigation", () => ({
  usePathname: () => "/article/best-etfs-australia",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

/** Trip the desktop trigger: cursor leaves through the top (clientY <= 10). */
function fireExitIntent() {
  act(() => {
    document.dispatchEvent(
      new MouseEvent("mouseleave", { clientY: 0, bubbles: true }),
    );
  });
}

describe("NewsletterExitIntentModal — keyboard / focus a11y", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens on the exit-intent trigger for an eligible content path", () => {
    render(<NewsletterExitIntentModal />);
    fireExitIntent();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("gives the email input an accessible name (label, not placeholder-only)", () => {
    render(<NewsletterExitIntentModal />);
    fireExitIntent();
    const email = screen.getByLabelText(/email address/i);
    expect(email).toBeInTheDocument();
    expect(email).toHaveAttribute("type", "email");
  });

  it("moves focus into the dialog when it opens", async () => {
    render(<NewsletterExitIntentModal />);
    fireExitIntent();
    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    render(<NewsletterExitIntentModal />);
    fireExitIntent();
    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(trigger);

    trigger.remove();
  });
});
