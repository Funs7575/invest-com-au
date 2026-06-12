import { describe, it, expect } from "vitest";
import { render, screen } from "../setup";
import LotPaperTrail from "@/components/invest/lot/LotPaperTrail";
import { buildLotProfile } from "@/lib/listings/lot-profile";

describe("LotPaperTrail", () => {
  it("renders nothing when the listing has no evidence", () => {
    const { container } = render(
      <LotPaperTrail profile={buildLotProfile({ hectares: 100 })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a provenance timeline for structured events", () => {
    const profile = buildLotProfile({
      provenance_events: [
        { year: 2019, label: "Acquired at auction", detail: "Shannons, Sydney" },
        { when: "2023", label: "Concours restoration completed" },
      ],
    });
    render(<LotPaperTrail profile={profile} />);

    expect(screen.getByRole("heading", { name: "Paper trail" })).toBeInTheDocument();
    expect(screen.getByText("Acquired at auction")).toBeInTheDocument();
    expect(screen.getByText("Shannons, Sydney")).toBeInTheDocument();
    expect(screen.getByText("2023")).toBeInTheDocument();
  });

  it("renders document status chips with seller-stated framing", () => {
    const profile = buildLotProfile({
      documents: [
        { name: "Independent valuation", status: "verified" },
        { name: "Water licence", status: "pending" },
      ],
    });
    render(<LotPaperTrail profile={profile} />);

    expect(screen.getByText("Independent valuation")).toBeInTheDocument();
    expect(screen.getByText("Copy available")).toBeInTheDocument();
    expect(screen.getByText("On request")).toBeInTheDocument();
    expect(screen.getByText(/as stated by the seller/i)).toBeInTheDocument();
    expect(screen.getByText(/request copies/i)).toBeInTheDocument();
  });

  it("renders scalar doc-ish facts from seed-shaped key_metrics", () => {
    const profile = buildLotProfile({
      provenance: "full build sheet and ownership history",
      matching_numbers: true,
    });
    render(<LotPaperTrail profile={profile} />);

    expect(screen.getByText("Provenance")).toBeInTheDocument();
    expect(
      screen.getByText("Full Build Sheet And Ownership History"),
    ).toBeInTheDocument();
    expect(screen.getByText("Matching Numbers")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });
});
