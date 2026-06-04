import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdvisorProfileClient from "@/app/advisor/[slug]/AdvisorProfileClient";
import type { Professional } from "@/lib/types";

// Heavy children / browser-only helpers irrelevant to the enquiry-submit branch.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/advisor/jane-smith",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/BookingWidget", () => ({ default: () => null }));
vi.mock("@/components/AdvisorAppointmentsWidget", () => ({ default: () => null }));
vi.mock("@/components/AdvisorReviewForm", () => ({ default: () => null }));
vi.mock("@/components/AdvisorFeeOpinionButton", () => ({ default: () => null }));
vi.mock("@/components/SocialShareButtons", () => ({ default: () => null }));
vi.mock("@/lib/tracking", async (importOriginal) => ({
  ...(await importOriginal() as Record<string, unknown>),
  trackEvent: vi.fn(),
}));
vi.mock("@/lib/posthog/events", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/qualification-store", () => ({ getQualificationData: () => ({}) }));
vi.mock("@/components/UtmCapture", () => ({ getStoredUtm: () => ({}) }));
vi.mock("@/lib/hooks/useAdvisorShortlist", () => ({
  useAdvisorShortlist: () => ({ toggle: vi.fn(), has: () => false, count: 0, max: 3 }),
}));

function pro(overrides: Partial<Professional> = {}): Professional {
  return {
    id: 1,
    slug: "jane-smith",
    name: "Jane Smith",
    type: "financial_planner",
    specialties: ["Retirement Planning"],
    rating: 4.8,
    review_count: 20,
    verified: true,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Professional;
}

function renderProfile() {
  return render(
    <AdvisorProfileClient professional={pro()} similar={[]} reviews={[]} />,
  );
}

async function submitValidEnquiry() {
  fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: "Test User" } });
  fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: "test@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: /Send Enquiry to Jane/i }));
}

describe("AdvisorProfileClient enquiry submit", () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("shows a temporarily-unavailable message when the API returns 503 (kill switch)", async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 503 }));

    renderProfile();
    await submitValidEnquiry();

    await waitFor(() => {
      expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    });
    // The generic error copy must not appear for the gated-window case.
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
  });

  it("shows the generic error message for other non-2xx failures", async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 500 }));

    renderProfile();
    await submitValidEnquiry();

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/temporarily unavailable/i)).not.toBeInTheDocument();
  });
});
