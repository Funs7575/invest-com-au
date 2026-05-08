import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import DirectoryCard, { type DirectoryItem } from "@/components/DirectoryCard";

const baseItem: DirectoryItem = {
  id: 1,
  slug: "alice-smith",
  name: "Alice Smith",
  ctaHref: "/advisor/alice-smith?source=test",
};

describe("DirectoryCard", () => {
  describe("required fields", () => {
    it("renders the name as an h3", () => {
      render(<DirectoryCard item={baseItem} />);
      expect(screen.getByTestId("directory-card-name")).toHaveTextContent("Alice Smith");
    });

    it("renders CTA link with correct href", () => {
      render(<DirectoryCard item={baseItem} />);
      const cta = screen.getByTestId("directory-card-cta");
      expect(cta).toHaveAttribute("href", "/advisor/alice-smith?source=test");
    });

    it('defaults CTA label to "View Profile"', () => {
      render(<DirectoryCard item={baseItem} />);
      expect(screen.getByTestId("directory-card-cta")).toHaveTextContent("View Profile");
    });
  });

  describe("optional fields", () => {
    it("renders subtitle when provided", () => {
      render(<DirectoryCard item={{ ...baseItem, subtitle: "Smith & Co" }} />);
      expect(screen.getByTestId("directory-card-subtitle")).toHaveTextContent("Smith & Co");
    });

    it("omits subtitle when not provided", () => {
      render(<DirectoryCard item={baseItem} />);
      expect(screen.queryByTestId("directory-card-subtitle")).not.toBeInTheDocument();
    });

    it("renders location when provided", () => {
      render(<DirectoryCard item={{ ...baseItem, locationDisplay: "Sydney, NSW" }} />);
      expect(screen.getByTestId("directory-card-location")).toHaveTextContent("Sydney, NSW");
    });

    it("renders bio when provided", () => {
      render(<DirectoryCard item={{ ...baseItem, bio: "Specialist in SMSF compliance." }} />);
      expect(screen.getByTestId("directory-card-bio")).toHaveTextContent("Specialist in SMSF compliance.");
    });

    it("renders registration badge when provided", () => {
      render(<DirectoryCard item={{ ...baseItem, registrationBadge: "SAN: 12345678" }} />);
      expect(screen.getByTestId("directory-card-registration")).toHaveTextContent("SAN: 12345678");
    });

    it("renders fee labels when provided", () => {
      render(<DirectoryCard item={{ ...baseItem, feeLabels: ["Flat: $800", "Hourly: $200"] }} />);
      const fees = screen.getByTestId("directory-card-fees");
      expect(fees).toHaveTextContent("Flat: $800");
      expect(fees).toHaveTextContent("Hourly: $200");
    });

    it("omits fee section when feeLabels is empty", () => {
      render(<DirectoryCard item={{ ...baseItem, feeLabels: [] }} />);
      expect(screen.queryByTestId("directory-card-fees")).not.toBeInTheDocument();
    });

    it("uses custom ctaLabel when provided", () => {
      render(<DirectoryCard item={{ ...baseItem, ctaLabel: "Get a Quote" }} />);
      expect(screen.getByTestId("directory-card-cta")).toHaveTextContent("Get a Quote");
    });
  });

  describe("badges", () => {
    it("shows Verified badge when isVerified=true", () => {
      render(<DirectoryCard item={{ ...baseItem, isVerified: true }} />);
      expect(screen.getByTestId("directory-card-verified")).toHaveTextContent("Verified");
    });

    it("hides Verified badge when isVerified=false", () => {
      render(<DirectoryCard item={{ ...baseItem, isVerified: false }} />);
      expect(screen.queryByTestId("directory-card-verified")).not.toBeInTheDocument();
    });

    it("shows Sponsored badge when isSponsored=true", () => {
      render(<DirectoryCard item={{ ...baseItem, isSponsored: true }} />);
      expect(screen.getByText("Sponsored")).toBeInTheDocument();
    });

    it("does not show Sponsored badge by default", () => {
      render(<DirectoryCard item={baseItem} />);
      expect(screen.queryByText("Sponsored")).not.toBeInTheDocument();
    });
  });

  describe("article element", () => {
    it("renders as an <article>", () => {
      const { container } = render(<DirectoryCard item={baseItem} />);
      expect(container.querySelector("article")).toBeInTheDocument();
    });
  });
});
