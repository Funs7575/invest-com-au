import { describe, it, expect } from "vitest";
import { parseListingVideo, listingEmbeds } from "@/lib/listings/listing-media";

describe("parseListingVideo", () => {
  it("parses the YouTube URL shapes onto the nocookie embed host", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ]) {
      expect(parseListingVideo(url)?.embedUrl).toBe(
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      );
    }
  });

  it("parses Matterport show links and rebuilds the src", () => {
    const embed = parseListingVideo("https://my.matterport.com/show/?m=AbC123xyz&utm=x");
    expect(embed?.kind).toBe("matterport");
    expect(embed?.embedUrl).toBe("https://my.matterport.com/show/?m=AbC123xyz&play=0");
  });

  it("rejects every spoof and injection shape", () => {
    for (const bad of [
      "https://evil.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=<script>",
      "https://www.youtube.com/watch?v=short", // not 11 chars
      "javascript:alert(1)",
      "https://my.matterport.com/show/?m=../../etc",
      "ftp://www.youtube.com/watch?v=dQw4w9WgXcQ",
      12345,
      null,
      "x".repeat(600),
    ]) {
      expect(parseListingVideo(bad)).toBeNull();
    }
  });
});

describe("listingEmbeds", () => {
  it("collects video + tour, deduping identical sources", () => {
    const km = {
      video_url: "https://youtu.be/dQw4w9WgXcQ",
      virtual_tour_url: "https://my.matterport.com/show/?m=AbC123xyz",
    };
    const embeds = listingEmbeds(km);
    expect(embeds).toHaveLength(2);
    expect(embeds.map((e) => e.kind)).toEqual(["youtube", "matterport"]);

    expect(
      listingEmbeds({
        video_url: "https://youtu.be/dQw4w9WgXcQ",
        virtual_tour_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      }),
    ).toHaveLength(1);
    expect(listingEmbeds(null)).toEqual([]);
    expect(listingEmbeds({})).toEqual([]);
  });
});
