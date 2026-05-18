"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  videoUrl: string;
  posterUrl?: string | null;
  advisorName: string;
};

function parseVideoEmbed(url: string): { embedUrl: string; thumbnailUrl: string | null } {
  const ytMatch =
    url.match(/youtube\.com\/watch\?v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?]+)/) ||
    url.match(/youtube\.com\/embed\/([^?]+)/);
  if (ytMatch) {
    const id = ytMatch[1];
    return {
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      thumbnailUrl: null,
    };
  }

  return { embedUrl: url, thumbnailUrl: null };
}

export default function AdvisorVideoIntro({ videoUrl, posterUrl, advisorName }: Props) {
  const [playing, setPlaying] = useState(false);
  const { embedUrl, thumbnailUrl } = parseVideoEmbed(videoUrl);
  const poster = posterUrl || thumbnailUrl;

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900">
      {playing ? (
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={`${advisorName} introduction video`}
        />
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="absolute inset-0 w-full h-full flex items-center justify-center group"
          aria-label={`Play ${advisorName}'s introduction video`}
        >
          {poster ? (
            <Image
              src={poster}
              alt={`${advisorName} video thumbnail`}
              fill
              className="object-cover group-hover:brightness-75 transition-all duration-200"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-slate-800" />
          )}
          {/* Play button */}
          <span className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-white/90 group-hover:bg-white shadow-lg transition-all duration-200 group-hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-7 h-7 text-blue-600 ml-1"
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="absolute bottom-3 left-4 text-xs text-white/80 font-medium drop-shadow">
            Watch introduction
          </span>
        </button>
      )}
    </div>
  );
}
