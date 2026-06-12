/**
 * Listing media parsing — video / virtual-tour embeds (idea #14).
 *
 * Sellers store plain URLs in key_metrics (`video_url`,
 * `virtual_tour_url`); this module turns them into SAFE embed sources.
 * The hostname allowlist is strict by construction — an iframe src is an
 * injection surface, so anything that doesn't parse to an exactly-known
 * host yields null. YouTube embeds use the nocookie domain.
 */

export interface ListingEmbed {
  kind: "youtube" | "matterport";
  /** Safe iframe src. */
  embedUrl: string;
  /** Accessible title for the iframe. */
  title: string;
}

const YOUTUBE_HOSTS = new Set(["www.youtube.com", "youtube.com", "m.youtube.com"]);
const MATTERPORT_HOSTS = new Set(["my.matterport.com", "matterport.com", "www.matterport.com"]);

function parseUrl(raw: unknown): URL | null {
  if (typeof raw !== "string" || raw.length > 500) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

/** Extract a YouTube video id from watch/share/shorts/embed URL shapes. */
function youtubeId(url: URL): string | null {
  let id: string | null = null;
  if (url.hostname === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0] ?? null;
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] ?? null;
    else if (url.pathname.startsWith("/shorts/")) id = url.pathname.split("/")[2] ?? null;
  }
  if (!id) return null;
  // YouTube ids are strictly [A-Za-z0-9_-]{11} — reject anything else.
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export function parseListingVideo(raw: unknown): ListingEmbed | null {
  const url = parseUrl(raw);
  if (!url) return null;

  const ytId = youtubeId(url);
  if (ytId) {
    return {
      kind: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
      title: "Listing video",
    };
  }

  if (MATTERPORT_HOSTS.has(url.hostname) && url.pathname.startsWith("/show")) {
    const modelId = url.searchParams.get("m");
    if (modelId && /^[A-Za-z0-9]{5,32}$/.test(modelId)) {
      return {
        kind: "matterport",
        embedUrl: `https://my.matterport.com/show/?m=${modelId}&play=0`,
        title: "3D virtual tour",
      };
    }
  }

  return null;
}

/** The lot page's embeds, from a listing's key_metrics. */
export function listingEmbeds(km: Record<string, unknown> | null | undefined): ListingEmbed[] {
  if (!km) return [];
  const out: ListingEmbed[] = [];
  const video = parseListingVideo(km["video_url"]);
  if (video) out.push(video);
  const tour = parseListingVideo(km["virtual_tour_url"]);
  if (tour && tour.embedUrl !== video?.embedUrl) out.push(tour);
  return out;
}
