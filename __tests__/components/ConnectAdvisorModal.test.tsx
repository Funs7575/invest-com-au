import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const { mockSubmitLead } = vi.hoisted(() => ({ mockSubmitLead: vi.fn() }));
vi.mock("@/lib/submit-lead-client", () => ({ submitLead: mockSubmitLead }));

import ConnectAdvisorModal from "@/app/get-matched/_components/ConnectAdvisorModal";
import type { TopMatch } from "@/lib/getmatched/types";

const ADVISOR: TopMatch = {
  kind: "advisor", slug: "jane-tax", name: "Jane Tax", logo_url: null,
  rating: 4.8, rating_count: 21, one_line_why: "Specialises in Crypto Tax",
  cta_label: "View profile", cta_href: "/advisor/jane-tax", vertical: null, ref_id: 42,
};

function renderModal(over: Partial<Parameters<typeof ConnectAdvisorModal>[0]> = {}) {
  return render(
    <ConnectAdvisorModal
      advisor={ADVISOR}
      planId={7}
      shareToken="tok_abc12345"
      advisorType="tax-agent"
      onClose={() => {}}
      onConnected={() => {}}
      {...over}
    />,
  );
}

async function fillFormAndSend() {
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Alex" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alex@example.com" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /Send verification code/ }));
}

describe("ConnectAdvisorModal (P6 in-funnel lead capture)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    mockSubmitLead.mockResolvedValue({ success: true, lead_id: 901 });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("gates on consent and valid email before sending the code", async () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /Send verification code/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/first name/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the OTP then creates ONE lead via confirm_advisor_id after verify", async () => {
    const onConnected = vi.fn();
    renderModal({ onConnected });
    await fillFormAndSend();

    await screen.findByLabelText("Verification code");
    expect(fetch).toHaveBeenCalledWith("/api/verify-otp/send", expect.anything());

    fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify & Connect/ }));

    await waitFor(() => expect(mockSubmitLead).toHaveBeenCalledTimes(1));
    expect(mockSubmitLead.mock.calls[0]![0]).toMatchObject({
      lead_type: "advisor",
      confirm_advisor_id: 42,
      user_email: "alex@example.com",
      source_page: "/get-matched",
      user_intent: { need: "tax-agent" },
    });
    // Plan stamped converted (best-effort) with the share token.
    await waitFor(() => {
      const urls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
      expect(urls).toContain("/api/get-matched/plans/7/connected");
    });
    expect(onConnected).toHaveBeenCalledWith(901);
    expect(await screen.findByText("You’re connected!")).toBeInTheDocument();
  });

  it("a wrong code keeps the user on the OTP step with the server's error", async () => {
    renderModal();
    await fillFormAndSend();
    await screen.findByLabelText("Verification code");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Incorrect code." }) }),
    );
    fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify & Connect/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect code.");
    expect(mockSubmitLead).not.toHaveBeenCalled();
  });
});
