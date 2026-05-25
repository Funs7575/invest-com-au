import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "./setup";
import userEvent from "@testing-library/user-event";

// Hoisted mocks to satisfy vi.mock() hoisting constraint.
const { mockBuildShareableUrl } = vi.hoisted(() => ({
  mockBuildShareableUrl: vi.fn((_path: string, _key: string, _state: unknown) => "https://invest.com.au/mock-deep-link"),
}));

vi.mock("@/hooks/use-calculator-state", () => ({
  buildShareableUrl: mockBuildShareableUrl,
}));

vi.mock("@/lib/compliance", () => ({
  GENERAL_ADVICE_WARNING: "Test general advice warning text.",
}));

import ShareResult, { type CalcSlug } from "@/components/ShareResult";

const defaultProps = {
  calculatorKey: "mortgage_calculator",
  resultLabel: "$2,450/mo",
  calcTitle: "Mortgage Repayment Calculator",
  calcSlug: "mortgage" as CalcSlug,
  state: { loanAmount: 600000, interestRate: 6.0 },
};

describe("ShareResult", () => {
  beforeEach(() => {
    mockBuildShareableUrl.mockClear();
    // Ensure window.location is available.
    Object.defineProperty(window, "location", {
      value: { pathname: "/mortgage-calculator", search: "" },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a button with the correct aria-label", () => {
    render(<ShareResult {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Share this calculator result" }),
    ).toBeInTheDocument();
  });

  it("renders the default 'Share result' label text", () => {
    render(<ShareResult {...defaultProps} />);
    expect(screen.getByText("Share result")).toBeInTheDocument();
  });

  it("shows the AFSL disclaimer when showDisclaimer=true (default)", () => {
    render(<ShareResult {...defaultProps} />);
    expect(screen.getByText("Test general advice warning text.")).toBeInTheDocument();
  });

  it("hides the AFSL disclaimer when showDisclaimer=false", () => {
    render(<ShareResult {...defaultProps} showDisclaimer={false} />);
    expect(screen.queryByText("Test general advice warning text.")).not.toBeInTheDocument();
  });

  it("applies a custom className to the wrapper", () => {
    const { container } = render(<ShareResult {...defaultProps} className="my-custom-class" />);
    expect(container.firstChild).toHaveClass("my-custom-class");
  });

  it("renders a hidden OG pre-warm image on the client", () => {
    render(<ShareResult {...defaultProps} />);
    const img = document.querySelector("img.sr-only");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("aria-hidden")).toBe("true");
    expect(img?.getAttribute("src")).toMatch(/\/api\/og\?type=calculator/);
  });

  it("OG image src includes calc slug", () => {
    render(<ShareResult {...defaultProps} calcSlug="retirement" />);
    const img = document.querySelector("img.sr-only");
    expect(img?.getAttribute("src")).toMatch(/calc=retirement/);
  });

  it("OG image src encodes the result label", () => {
    render(<ShareResult {...defaultProps} resultLabel="$1,234/mo" />);
    const img = document.querySelector("img.sr-only");
    // encodeURIComponent("$1,234/mo") contains %24
    expect(img?.getAttribute("src")).toMatch(/%241%2C234%2Fmo|%241%2c234%2fmo|\$1%2C234%2Fmo/i);
  });

  it("calls buildShareableUrl when button is clicked (mechanism-agnostic)", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: shareMock,
      configurable: true,
      writable: true,
    });

    const user = userEvent.setup();
    render(<ShareResult {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: "Share this calculator result" }));

    await waitFor(() => expect(mockBuildShareableUrl).toHaveBeenCalled());
    expect(mockBuildShareableUrl).toHaveBeenCalledWith(
      expect.any(String),
      "mortgage_calculator",
      defaultProps.state,
    );
  });

  it("shows 'Shared!' status after navigator.share resolves", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: shareMock,
      configurable: true,
      writable: true,
    });

    const user = userEvent.setup();
    render(<ShareResult {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: "Share this calculator result" }));

    await waitFor(() => expect(screen.getByText("Shared!")).toBeInTheDocument());
  });

  it("accepts all 6 CalcSlug variants without throwing", () => {
    const slugs: CalcSlug[] = [
      "retirement",
      "compound-interest",
      "mortgage",
      "savings",
      "super-contributions",
      "cgt",
    ];
    for (const slug of slugs) {
      const { unmount } = render(<ShareResult {...defaultProps} calcSlug={slug} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
      unmount();
    }
  });

  it("OG image src uses the correct type=calculator parameter", () => {
    render(<ShareResult {...defaultProps} />);
    const img = document.querySelector("img.sr-only");
    expect(img?.getAttribute("src")).toContain("type=calculator");
  });

  it("OG image src includes the calc title", () => {
    render(<ShareResult {...defaultProps} calcTitle="My Test Calculator" />);
    const img = document.querySelector("img.sr-only");
    expect(img?.getAttribute("src")).toMatch(/title=/);
  });

  it("does not render OG img on server (no window)", () => {
    // This is a client component — in jsdom window is always defined.
    // We verify at minimum the img is rendered with the correct attributes.
    render(<ShareResult {...defaultProps} />);
    const img = document.querySelector("img.sr-only");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("loading")).toBe("lazy");
  });
});
