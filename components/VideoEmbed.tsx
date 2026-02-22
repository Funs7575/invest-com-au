"use client";

/**
 * Privacy-enhanced video embed for YouTube and Vimeo.
 * - YouTube: uses youtube-nocookie.com
 * - Vimeo: uses dnt=1
 * - Returns null for unrecognized URLs (no arbitrary iframes)
 */

interface VideoEmbedProps {
  url: string;
  title?: string;
}

function parseVideoUrl(url: string): { provider: "youtube" | "vimeo"; videoId: string } | null {
  // YouTube patterns
  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
    /youtube-nocookie\.com\/embed\/([\w-]{11})/,
  ];
  for (const pattern of ytPatterns) {
    const match = url.match(pattern);
    if (match?.[1]) return { provider: "youtube", videoId: match[1] };
  }

  // Vimeo patterns
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match?.[1]) return { provider: "vimeo", videoId: match[1] };
  }

  return null;
}

export default function VideoEmbed({ url, title }: VideoEmbedProps) {
  const parsed = parseVideoUrl(url);
  if (!parsed) return null;

  const iframeTitle = title || "Video";

  if (parsed.provider === "youtube") {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black mb-6">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${parsed.videoId}?rel=0`}
          title={iframeTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
    );
  }

  if (parsed.provider === "vimeo") {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black mb-6">
        <iframe
          src={`https://player.vimeo.com/video/${parsed.videoId}?dnt=1`}
          title={iframeTitle}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
    );
  }

  return null;
}
