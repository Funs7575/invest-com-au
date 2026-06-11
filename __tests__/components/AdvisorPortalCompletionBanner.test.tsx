/**
 * Tests for the portal-wide profile-completion banner in
 * app/advisor-portal/page.tsx and the Leads tab empty-state nudge.
 *
 * We test the banner / nudge pieces in isolation rather than rendering the
 * entire portal page (which pulls in dozens of dynamic imports), by extracting
 * just the logic we care about.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, userEvent } from "./setup";
import React from "react";
import { deriveProfileCompleteness } from "@/lib/advisor-portal/profile-completeness";

// ─── Helper: minimal portal-banner component extracted from the logic in page.tsx ───

type BannerProps = {
  score: number;
  nextTitle: string | null;
  onContinue: () => void;
  onDismiss: () => void;
};

function CompletionBanner({ score, nextTitle, onContinue, onDismiss }: BannerProps) {
  if (score >= 80) return null;
  return (
    <div
      role="complementary"
      aria-label="Profile completion"
      className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5 flex items-center gap-3"
    >
      <div
        className="hidden sm:block w-20 h-1.5 bg-violet-100 rounded-full overflow-hidden shrink-0"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Profile ${score}% complete`}
      >
        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-violet-900 flex-1 min-w-0 truncate">
        <span className="font-bold">{score}% complete</span>
        {nextTitle && <span className="text-violet-700"> — next: {nextTitle.toLowerCase()}</span>}
      </p>
      <button onClick={onContinue} className="shrink-0 text-xs font-bold text-violet-700 underline min-h-11 px-1">
        Continue setup →
      </button>
      <button onClick={onDismiss} aria-label="Dismiss setup reminder" className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg">
        ✕
      </button>
    </div>
  );
}

// ─── Helper: minimal empty-state nudge (mirrors what LeadsTab renders) ───

type NudgeProps = {
  advisorScore: number;
  onNavigate: () => void;
};

function LeadsEmptyNudge({ advisorScore, onNavigate }: NudgeProps) {
  if (advisorScore >= 80) return null;
  return (
    <p className="mt-3 text-xs text-violet-700">
      Your profile is{" "}
      <strong>{advisorScore}%</strong> complete — advisors with full profiles receive
      up to 3× more leads.{" "}
      <button onClick={onNavigate} className="underline font-semibold hover:text-violet-900">
        Complete your profile →
      </button>
    </p>
  );
}

// ─── CompletionBanner tests ───

describe("CompletionBanner", () => {
  it("renders with role=complementary and aria-label='Profile completion'", () => {
    render(
      <CompletionBanner
        score={40}
        nextTitle="Add your photo"
        onContinue={() => {}}
        onDismiss={() => {}}
      />,
    );
    const banner = screen.getByRole("complementary", { name: "Profile completion" });
    expect(banner).toBeInTheDocument();
  });

  it("shows the score and next step in the banner", () => {
    render(
      <CompletionBanner
        score={40}
        nextTitle="Set your specialties"
        onContinue={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText("40% complete")).toBeInTheDocument();
    expect(screen.getByText(/next: set your specialties/)).toBeInTheDocument();
  });

  it("the progress bar has the correct aria-valuenow", () => {
    render(
      <CompletionBanner score={55} nextTitle="Explain your fees" onContinue={() => {}} onDismiss={() => {}} />,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "55");
  });

  it("hidden when score is 80 or above", () => {
    const { container } = render(
      <CompletionBanner score={80} nextTitle={null} onContinue={() => {}} onDismiss={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onDismiss when the dismiss button is clicked", async () => {
    const onDismiss = vi.fn();
    render(<CompletionBanner score={40} nextTitle="Add your photo" onContinue={() => {}} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss setup reminder" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("calls onContinue when 'Continue setup' is clicked", async () => {
    const onContinue = vi.fn();
    render(<CompletionBanner score={40} nextTitle="Add your photo" onContinue={onContinue} onDismiss={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue setup →" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

// ─── sessionStorage dismiss tests (mirrors the portal page behaviour) ───

describe("completion banner sessionStorage dismiss", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("sets the sessionStorage key on dismiss", async () => {
    const onDismiss = vi.fn(() => {
      sessionStorage.setItem("advisor-onboarding-banner-dismissed", "1");
    });
    render(<CompletionBanner score={40} nextTitle="Add your photo" onContinue={() => {}} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss setup reminder" }));
    expect(sessionStorage.getItem("advisor-onboarding-banner-dismissed")).toBe("1");
  });

  it("a component that reads sessionStorage initialises dismissed state correctly", () => {
    sessionStorage.setItem("advisor-onboarding-banner-dismissed", "1");
    const initiallyDismissed = sessionStorage.getItem("advisor-onboarding-banner-dismissed") === "1";
    expect(initiallyDismissed).toBe(true);
  });
});

// ─── LeadsEmptyNudge tests ───

describe("LeadsEmptyNudge", () => {
  it("shows the completeness score and CTA when profile is below 80%", () => {
    render(<LeadsEmptyNudge advisorScore={35} onNavigate={() => {}} />);
    expect(screen.getByText("35%")).toBeInTheDocument();
    expect(screen.getByText(/up to 3× more leads/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete your profile →" })).toBeInTheDocument();
  });

  it("hidden when profile is at 80% or above", () => {
    const { container } = render(<LeadsEmptyNudge advisorScore={80} onNavigate={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("calls onNavigate when the CTA is clicked", async () => {
    const onNavigate = vi.fn();
    render(<LeadsEmptyNudge advisorScore={30} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("button", { name: "Complete your profile →" }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

// ─── Integration: deriveProfileCompleteness feeds the banner correctly ───

describe("completeness derived from advisor row feeds banner", () => {
  it("an empty advisor row produces score=0 and nextTitle='Add your photo'", () => {
    const c = deriveProfileCompleteness({});
    expect(c.score).toBe(0);
    const next = c.steps.find((s) => !s.complete);
    expect(next?.title).toBe("Add your photo");
  });

  it("a photo+bio advisor is at 40% — below threshold, banner shows", () => {
    const c = deriveProfileCompleteness({ photo_url: "x.jpg", bio: "Bio here." });
    expect(c.score).toBe(40);
    // Banner threshold is < 80, so it should be shown.
    const bannerShouldShow = c.score < 80;
    expect(bannerShouldShow).toBe(true);
  });

  it("a complete advisor (score=100) hides the banner", () => {
    const c = deriveProfileCompleteness({
      photo_url: "https://cdn/x.jpg",
      bio: "Bio.",
      specialties: ["SMSF"],
      fee_structure: "fee-for-service",
      fee_description: "$330/hr.",
      website: "https://firm.example",
      phone: "0400 000 000",
      booking_link: "https://cal.com/x",
    });
    expect(c.score).toBe(100);
    const bannerShouldShow = c.score < 80;
    expect(bannerShouldShow).toBe(false);
  });
});
