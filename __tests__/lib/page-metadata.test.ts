import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

import { publicMetadata, portalMetadata } from "@/lib/page-metadata";

describe("publicMetadata", () => {
  it("appends '— invest.com.au' suffix to the title", () => {
    const m = publicMetadata({
      title: "Fee alerts",
      description: "Track when broker fees change.",
      path: "/fee-alerts",
    });
    expect(m.title).toBe("Fee alerts — invest.com.au");
  });

  it("does NOT double-append the site name if the title already mentions it", () => {
    const m = publicMetadata({
      title: "Something about invest.com.au",
      description: "desc",
      path: "/x",
    });
    expect(m.title).toBe("Something about invest.com.au");
  });

  it("sets the canonical to the supplied path (not the full URL)", () => {
    const m = publicMetadata({
      title: "Fee alerts",
      description: "desc",
      path: "/fee-alerts",
    });
    expect(m.alternates?.canonical).toBe("/fee-alerts");
  });

  it("marks the page as index/follow for SEO", () => {
    const m = publicMetadata({
      title: "t",
      description: "d",
      path: "/x",
    });
    const robots = m.robots as { index: boolean; follow: boolean };
    expect(robots.index).toBe(true);
    expect(robots.follow).toBe(true);
  });

  it("builds an absolute OG URL by joining SITE_URL + path", () => {
    const m = publicMetadata({
      title: "t",
      description: "d",
      path: "/fee-alerts",
    });
    expect(m.openGraph?.url).toBe("https://invest.com.au/fee-alerts");
  });

  it("uses a supplied ogImage URL directly", () => {
    const m = publicMetadata({
      title: "t",
      description: "d",
      path: "/x",
      ogImage: "https://cdn.example.com/custom.png",
    });
    const image = Array.isArray(m.openGraph?.images)
      ? m.openGraph.images[0]
      : m.openGraph?.images;
    expect(image).toMatchObject({
      url: "https://cdn.example.com/custom.png",
      width: 1200,
      height: 630,
    });
  });

  it("generates an /api/og fallback image with url-encoded title when no ogImage supplied", () => {
    const m = publicMetadata({
      title: "Hello & World",
      description: "d",
      path: "/x",
    });
    const images = m.openGraph?.images as Array<{ url: string }>;
    expect(images[0]?.url).toBe(
      "/api/og?title=Hello%20%26%20World&type=default",
    );
  });

  it("uses summary_large_image twitter card", () => {
    const m = publicMetadata({
      title: "t",
      description: "d",
      path: "/x",
    });
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("portalMetadata", () => {
  it("marks the page as noindex/nofollow/nocache", () => {
    const m = portalMetadata("Dashboard");
    const robots = m.robots as {
      index: boolean;
      follow: boolean;
      nocache: boolean;
    };
    expect(robots.index).toBe(false);
    expect(robots.follow).toBe(false);
    expect(robots.nocache).toBe(true);
  });

  it("still suffixes the site name on portal titles", () => {
    const m = portalMetadata("Dashboard");
    expect(m.title).toBe("Dashboard — invest.com.au");
  });

  it("defaults description to 'Private portal'", () => {
    expect(portalMetadata("X").description).toBe("Private portal");
  });

  it("allows overriding the description", () => {
    expect(portalMetadata("X", "Custom").description).toBe("Custom");
  });
});
