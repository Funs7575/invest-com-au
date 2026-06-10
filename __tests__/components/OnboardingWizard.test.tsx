import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, userEvent } from "./setup";

// AdvisorPhotoUpload uses canvas/Image (unavailable in jsdom) — stub it.
vi.mock("@/components/AdvisorPhotoUpload", () => ({
  default: ({ advisorSlug }: { advisorSlug: string }) => (
    <div data-testid="photo-upload" data-slug={advisorSlug} />
  ),
}));

import OnboardingWizard from "@/app/advisor-portal/OnboardingWizard";
import type { Advisor } from "@/app/advisor-portal/types";

const advisor: Advisor = {
  id: 1,
  name: "Test Advisor",
  slug: "test-advisor",
  type: "financial_planner",
};

function mockFetchOk() {
  const fn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("OnboardingWizard", () => {
  beforeEach(() => {
    mockFetchOk();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("opens at the photo step by default with progress visible", () => {
    render(<OnboardingWizard advisor={advisor} onAdvisorChange={() => {}} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add your photo" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByTestId("photo-upload")).toHaveAttribute("data-slug", "test-advisor");
  });

  it("opens at the requested initial step", () => {
    render(
      <OnboardingWizard advisor={advisor} onAdvisorChange={() => {}} onClose={() => {}} initialStep="fees" />,
    );
    expect(screen.getByRole("heading", { name: "Explain your fees" })).toBeInTheDocument();
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();
  });

  it("saves the bio step through the profile PATCH with only that step's fields", async () => {
    const fetchMock = mockFetchOk();
    const onAdvisorChange = vi.fn();
    render(
      <OnboardingWizard advisor={advisor} onAdvisorChange={onAdvisorChange} onClose={() => {}} initialStep="bio" />,
    );

    await userEvent.type(screen.getByLabelText("Bio"), "20 years in planning.");
    await userEvent.click(screen.getByRole("button", { name: "Save & continue" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/advisor-auth/profile",
      expect.objectContaining({ method: "PATCH" }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toEqual({ bio: "20 years in planning.", website: "" });
    // Saved edits sync back to portal state, and we advance to specialties.
    expect(onAdvisorChange).toHaveBeenCalledWith(expect.objectContaining({ bio: "20 years in planning." }));
    expect(await screen.findByRole("heading", { name: "Set your specialties" })).toBeInTheDocument();
  });

  it("skip advances without any network call", async () => {
    const fetchMock = mockFetchOk();
    render(
      <OnboardingWizard advisor={advisor} onAdvisorChange={() => {}} onClose={() => {}} initialStep="bio" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Set your specialties" })).toBeInTheDocument();
  });

  it("adds and removes specialty tags, then saves the array", async () => {
    const fetchMock = mockFetchOk();
    render(
      <OnboardingWizard advisor={advisor} onAdvisorChange={() => {}} onClose={() => {}} initialStep="specialties" />,
    );
    const input = screen.getByLabelText("Add a specialty, then press Enter");
    await userEvent.type(input, "SMSF setup{Enter}");
    await userEvent.type(input, "Retirement{Enter}");
    expect(screen.getByText("SMSF setup")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove Retirement" }));
    expect(screen.queryByText("Retirement")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save & continue" }));
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toEqual({ specialties: ["SMSF setup"] });
  });

  it("shows an inline error and stays on the step when the save fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    render(
      <OnboardingWizard advisor={advisor} onAdvisorChange={() => {}} onClose={() => {}} initialStep="bio" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save & continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't save/);
    expect(screen.getByRole("heading", { name: "Introduce yourself" })).toBeInTheDocument();
  });

  it("finishing the last step shows the completion screen with profile link", async () => {
    render(
      <OnboardingWizard advisor={advisor} onAdvisorChange={() => {}} onClose={() => {}} initialStep="availability" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save & continue" }));
    expect(await screen.findByText("Setup complete")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View my public profile" })).toHaveAttribute(
      "href",
      "/advisor/test-advisor",
    );
  });

  it("close button and Escape both call onClose", async () => {
    const onClose = vi.fn();
    render(<OnboardingWizard advisor={advisor} onAdvisorChange={() => {}} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close setup wizard" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("progress score rises as draft fields are filled and saved", async () => {
    render(
      <OnboardingWizard advisor={advisor} onAdvisorChange={() => {}} onClose={() => {}} initialStep="bio" />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    await userEvent.type(screen.getByLabelText("Bio"), "Hello");
    // bio (20) filled in the draft → live progress update.
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
  });
});
