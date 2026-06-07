"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  courseId: string;
  courseSlug: string;
  isFree: boolean;
}

export default function EnrollButton({ courseId, courseSlug, isFree }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (res.status === 401) {
        router.push(`/auth/login?next=/academy/${courseSlug}`);
        return;
      }

      const json = await res.json() as { url?: string; error?: string };

      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (json.url) {
        window.location.href = json.url;
      } else {
        router.push(`/academy/${courseSlug}?enrolled=1`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleEnroll}
        disabled={loading}
        aria-busy={loading}
        className="w-full py-3 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        {loading ? "Please wait…" : isFree ? "Enroll for Free" : "Enroll Now"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
