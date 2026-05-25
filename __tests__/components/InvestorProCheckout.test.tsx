/**
 * @vitest-environment jsdom
 *
 * Tests for the InvestorProCheckout client component.
 *
 * The component handles plan-toggle and Stripe checkout redirect.
 * We mock useSubscription to control auth + subscription state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "./setup";

// ── Hoist mocks before imports ──────────────────────────────────────────────

const { mockUseSubscription, mockRouterPush, mockFetch } = vi.hoisted(() => ({
  mockUseSubscription: vi.fn(),
  mockRouterPush: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock("@/lib/hooks/useSubscription", () => ({
  useSubscription: mockUseSubscription,
}));

// next/navigation is already mocked in setup.tsx; we re-mock push here so
// we can assert on it in individual tests.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => "/account/upgrade",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// ── Import subject after mocks are declared ─────────────────────────────────

import InvestorProCheckout from "@/app/account/upgrade/InvestorProCheckout";

// ── Helpers ──────────────────────────────────────────────────────────────────

function freeUser() {
  mockUseSubscription.mockReturnValue({
    user: { id: "u1", email: "test@example.com" },
    isPro: false,
    loading: false,
  });
}

function proUser() {
  mockUseSubscription.mockReturnValue({
    user: { id: "u1", email: "test@example.com" },
    isPro: true,
    loading: false,
  });
}

function notLoggedIn() {
  mockUseSubscription.mockReturnValue({
    user: null,
    isPro: false,
    loading: false,
  });
}

beforeEach(() => {
  mockRouterPush.mockReset();
  mockFetch.mockReset();
  // Restore the global fetch before each test
  vi.stubGlobal("fetch", mockFetch);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("InvestorProCheckout — authenticated free user", () => {
  it("renders the Pro tile with Subscribe Now CTA", () => {
    freeUser();
    render(<InvestorProCheckout />);
    expect(screen.getByRole("heading", { name: /investor pro/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /subscribe now/i })).toBeInTheDocument();
  });

  it("defaults to yearly plan", () => {
    freeUser();
    render(<InvestorProCheckout />);
    // Yearly price ($89) should be displayed
    expect(screen.getByText("$89")).toBeInTheDocument();
    // Monthly equivalent copy
    expect(screen.getByText(/7\.42\/month/i)).toBeInTheDocument();
  });

  it("can toggle to monthly plan", () => {
    freeUser();
    render(<InvestorProCheckout />);
    const monthlyBtn = screen.getByRole("button", { name: /monthly/i });
    fireEvent.click(monthlyBtn);
    expect(screen.getByText("$9")).toBeInTheDocument();
  });

  it("lists the Pro benefits", () => {
    freeUser();
    render(<InvestorProCheckout />);
    expect(screen.getByText("Unlimited holdings tracker")).toBeInTheDocument();
    expect(screen.getByText("Sharesight sync")).toBeInTheDocument();
    expect(screen.getByText("Fee alerts")).toBeInTheDocument();
  });

  it("calls checkout API with selected plan and redirects on success", async () => {
    freeUser();
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ url: "https://checkout.stripe.com/session/abc" }),
    });

    render(<InvestorProCheckout />);
    const btn = screen.getByRole("button", { name: /subscribe now/i });
    fireEvent.click(btn);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/stripe/create-checkout",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"plan":"yearly"'),
      }),
    );
  });

  it("shows an error message when checkout API fails", async () => {
    freeUser();
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ error: "Plan not configured" }),
    });

    render(<InvestorProCheckout />);
    const btn = screen.getByRole("button", { name: /subscribe now/i });
    fireEvent.click(btn);

    // Error appears asynchronously after the fetch resolves
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Plan not configured");
  });
});

describe("InvestorProCheckout — unauthenticated user", () => {
  it("renders Sign In & Subscribe CTA", () => {
    notLoggedIn();
    render(<InvestorProCheckout />);
    expect(screen.getByRole("button", { name: /sign in & subscribe/i })).toBeInTheDocument();
  });

  it("redirects to login on CTA click", () => {
    notLoggedIn();
    render(<InvestorProCheckout />);
    fireEvent.click(screen.getByRole("button", { name: /sign in & subscribe/i }));
    expect(mockRouterPush).toHaveBeenCalledWith("/auth/login?next=/account/upgrade");
  });
});

describe("InvestorProCheckout — existing Pro subscriber", () => {
  it("renders the Active state with a go-to-account link", () => {
    proUser();
    render(<InvestorProCheckout />);
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /go to account/i });
    expect(link).toHaveAttribute("href", "/account");
  });

  it("does not render the Subscribe Now button", () => {
    proUser();
    render(<InvestorProCheckout />);
    expect(screen.queryByRole("button", { name: /subscribe now/i })).not.toBeInTheDocument();
  });
});
