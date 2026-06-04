import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "./setup";
import ExitIntentModal from "@/components/ExitIntentModal";

// form-tracking fires sendBeacon/fetch — stub it out so the modal's
// view/abandon instrumentation is a no-op in jsdom.
vi.mock("@/lib/form-tracking", () => ({
  recordFormEvent: vi.fn(),
  getOrCreateSessionId: () => "test-session",
}));

/**
 * Trip the desktop exit-intent trigger: cursor leaves through the very
 * top of the viewport (clientY <= 0).
 */
function fireExitIntent() {
  act(() => {
    document.dispatchEvent(
      new MouseEvent("mouseleave", { clientY: 0, bubbles: true }),
    );
  });
}

describe("ExitIntentModal — keyboard / focus a11y", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    // fetch may be undefined in jsdom — give the submit path something safe.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not render until the exit-intent trigger fires", () => {
    render(<ExitIntentModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the dialog when the cursor leaves through the top", () => {
    render(<ExitIntentModal />);
    fireExitIntent();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("gives the email input an accessible name (label, not placeholder-only)", () => {
    render(<ExitIntentModal />);
    fireExitIntent();
    // getByLabelText resolves via the <label htmlFor> association.
    const email = screen.getByLabelText(/email address/i);
    expect(email).toBeInTheDocument();
    expect(email).toHaveAttribute("type", "email");
  });

  it("moves focus into the dialog when it opens", async () => {
    render(<ExitIntentModal />);
    fireExitIntent();
    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  it("closes on Escape", async () => {
    render(<ExitIntentModal />);
    fireExitIntent();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("restores focus to the triggering element after Escape closes it", async () => {
    // A real focusable element that holds focus before the modal opens.
    const trigger = document.createElement("button");
    trigger.textContent = "open-trigger";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    render(<ExitIntentModal />);
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
    // Focus returns to the element that was focused before opening.
    expect(document.activeElement).toBe(trigger);

    trigger.remove();
  });

  it("traps Tab focus within the dialog (Tab past the last control wraps to the first)", async () => {
    render(<ExitIntentModal />);
    fireExitIntent();
    const dialog = screen.getByRole("dialog");
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    expect(focusables.length).toBeGreaterThan(1);
    const last = focusables[focusables.length - 1]!;
    const first = focusables[0]!;
    last.focus();
    expect(document.activeElement).toBe(last);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    });
    expect(document.activeElement).toBe(first);
  });
});
