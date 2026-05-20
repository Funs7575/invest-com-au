import { describe, it, expect, vi } from "vitest";
import { render } from "./setup";

// Mock the JSON-LD builder so we can assert what arguments
// ListingSchemaScripts forwards without testing the schema builder
// internals here.
vi.mock("@/lib/schema-markup", () => ({
  listingProductJsonLd: vi.fn().mockReturnValue({
    "@context": "https://schema.org",
    "@type": "Product",
    name: "mocked-product",
  }),
}));

import ListingSchemaScripts from "@/components/ListingSchemaScripts";
import { listingProductJsonLd } from "@/lib/schema-markup";

const baseListing = {
  slug: "acme-listing",
  title: "Acme Listing",
  description: "A great deal",
  images: ["/cover.jpg"],
  asking_price_cents: 123_400, // $1234.00 AUD
  price_display: null,
  location_state: "NSW",
  location_city: "Sydney",
};

describe("ListingSchemaScripts", () => {
  it("renders a single application/ld+json script", () => {
    const { container } = render(
      <ListingSchemaScripts listing={baseListing} vertical="property" />,
    );
    const scripts = container.querySelectorAll(
      "script[type='application/ld+json']",
    );
    expect(scripts).toHaveLength(1);
  });

  it("serialises the builder output into the script body", () => {
    const { container } = render(
      <ListingSchemaScripts listing={baseListing} vertical="property" />,
    );
    const script = container.querySelector(
      "script[type='application/ld+json']",
    );
    const parsed = JSON.parse(script?.innerHTML ?? "{}");
    expect(parsed.name).toBe("mocked-product");
    expect(parsed["@type"]).toBe("Product");
  });

  it("converts asking_price_cents to whole-dollar AUD before forwarding", () => {
    render(
      <ListingSchemaScripts listing={baseListing} vertical="property" />,
    );
    expect(listingProductJsonLd).toHaveBeenLastCalledWith(
      expect.objectContaining({ priceAud: 1234 }),
    );
  });

  it("passes priceAud as null when asking_price_cents is missing", () => {
    render(
      <ListingSchemaScripts
        listing={{ ...baseListing, asking_price_cents: null }}
        vertical="property"
      />,
    );
    expect(listingProductJsonLd).toHaveBeenLastCalledWith(
      expect.objectContaining({ priceAud: null }),
    );
  });

  it("uses the first image as imageUrl, falling back to null", () => {
    render(
      <ListingSchemaScripts listing={baseListing} vertical="property" />,
    );
    expect(listingProductJsonLd).toHaveBeenLastCalledWith(
      expect.objectContaining({ imageUrl: "/cover.jpg" }),
    );
  });

  it("forwards null imageUrl when images is empty or undefined", () => {
    render(
      <ListingSchemaScripts
        listing={{ ...baseListing, images: [] }}
        vertical="property"
      />,
    );
    expect(listingProductJsonLd).toHaveBeenLastCalledWith(
      expect.objectContaining({ imageUrl: null }),
    );
  });

  it("forwards location_state and location_city as-is", () => {
    render(
      <ListingSchemaScripts listing={baseListing} vertical="property" />,
    );
    expect(listingProductJsonLd).toHaveBeenLastCalledWith(
      expect.objectContaining({
        locationState: "NSW",
        locationCity: "Sydney",
      }),
    );
  });

  it("forwards the supplied vertical", () => {
    render(
      <ListingSchemaScripts listing={baseListing} vertical="crypto" />,
    );
    expect(listingProductJsonLd).toHaveBeenLastCalledWith(
      expect.objectContaining({ vertical: "crypto" }),
    );
  });

  it("forwards priceDisplay over priceAud null-coalesce", () => {
    render(
      <ListingSchemaScripts
        listing={{
          ...baseListing,
          asking_price_cents: null,
          price_display: "From $500/wk",
        }}
        vertical="property"
      />,
    );
    expect(listingProductJsonLd).toHaveBeenLastCalledWith(
      expect.objectContaining({ priceDisplay: "From $500/wk" }),
    );
  });
});
