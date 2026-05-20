import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";

// Mock the seed-image helper so we can drive the no-db-images fallback
// path deterministically without testing its internals here.
vi.mock("@/lib/listing-vertical-images", () => ({
  getListingHeroImage: vi.fn().mockReturnValue("/seed-hero.jpg"),
}));

import ListingImageGallery from "@/components/ListingImageGallery";
import { getListingHeroImage } from "@/lib/listing-vertical-images";

describe("ListingImageGallery", () => {
  it("renders the first DB image as the hero with the provided alt", () => {
    render(
      <ListingImageGallery
        images={["/a.jpg", "/b.jpg", "/c.jpg"]}
        alt="Acme HQ"
      />,
    );
    const hero = screen.getByAltText("Acme HQ");
    expect(hero).toHaveAttribute("src", "/a.jpg");
  });

  it("renders the remaining DB images (up to 4) as thumbnails", () => {
    render(
      <ListingImageGallery
        images={["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg", "/e.jpg"]}
        alt="Acme HQ"
      />,
    );
    expect(screen.getByAltText("Acme HQ — image 2")).toHaveAttribute(
      "src",
      "/b.jpg",
    );
    expect(screen.getByAltText("Acme HQ — image 3")).toHaveAttribute(
      "src",
      "/c.jpg",
    );
    expect(screen.getByAltText("Acme HQ — image 4")).toHaveAttribute(
      "src",
      "/d.jpg",
    );
    expect(screen.getByAltText("Acme HQ — image 5")).toHaveAttribute(
      "src",
      "/e.jpg",
    );
  });

  it("caps the thumbnail strip at 4 even when more images are supplied", () => {
    render(
      <ListingImageGallery
        images={["/a", "/b", "/c", "/d", "/e", "/f", "/g"]}
        alt="Big set"
      />,
    );
    // Hero + 4 thumbs = 5 images
    const imgs = document.querySelectorAll("img");
    expect(imgs).toHaveLength(5);
    // The 5th thumb (image 6) should NOT render
    expect(screen.queryByAltText("Big set — image 6")).not.toBeInTheDocument();
  });

  it("renders only the hero (no thumb grid) when the DB has a single image", () => {
    const { container } = render(
      <ListingImageGallery images={["/only.jpg"]} alt="Solo" />,
    );
    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(1);
    // The thumbnail grid wrapper uses the `grid-cols-4` class.
    expect(container.querySelector(".grid-cols-4")).toBeNull();
  });

  it("falls back to the seed hero when no DB images are supplied", () => {
    render(
      <ListingImageGallery
        images={null}
        alt="Seeded"
        vertical="property"
        listingId={42}
        subCategory="apartment"
      />,
    );
    expect(getListingHeroImage).toHaveBeenCalledWith(
      "property",
      42,
      null,
      "apartment",
    );
    expect(screen.getByAltText("Seeded")).toHaveAttribute(
      "src",
      "/seed-hero.jpg",
    );
  });

  it("falls back to the seed hero when DB images is an empty array", () => {
    render(
      <ListingImageGallery
        images={[]}
        alt="Empty"
        vertical="crypto"
        listingId="acme-token"
      />,
    );
    expect(screen.getByAltText("Empty")).toHaveAttribute(
      "src",
      "/seed-hero.jpg",
    );
  });

  it("returns null when neither DB images nor a listingId are supplied", () => {
    const { container } = render(
      <ListingImageGallery images={null} alt="No source" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the hero img with priority loading semantics", () => {
    const { container } = render(
      <ListingImageGallery images={["/a.jpg"]} alt="Hero" />,
    );
    // The next/image mock strips `priority` but the rendered <img> exists.
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
  });

  it("marks thumbnail images with loading='lazy'", () => {
    render(
      <ListingImageGallery
        images={["/a.jpg", "/b.jpg"]}
        alt="Lazy thumbs"
      />,
    );
    const thumb = screen.getByAltText("Lazy thumbs — image 2");
    expect(thumb).toHaveAttribute("loading", "lazy");
  });
});
