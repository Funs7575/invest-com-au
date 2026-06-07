"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  courseId: string;
  isEnrolled: boolean;
  isCompleted: boolean;
  certificateId: string | null;
}

interface CompleteResponse {
  certificate_id: string | null;
  cpd_hours_earned: number | null;
  is_cpd_eligible: boolean;
  error?: string;
}

export default function CourseCompleteButton({
  courseId,
  isEnrolled,
  isCompleted: initialIsCompleted,
  certificateId: initialCertificateId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);
  const [certificateId, setCertificateId] = useState<string | null>(
    initialCertificateId,
  );

  if (!isEnrolled) return null;

  if (isCompleted) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Completed
          {certificateId && (
            <a
              href={`/account/certificates/${certificateId}`}
              className="ml-auto text-teal-600 hover:text-teal-800 underline text-xs font-medium"
            >
              View certificate
            </a>
          )}
        </div>
      </div>
    );
  }

  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/complete`, {
        method: "POST",
      });

      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      const json = (await res.json()) as CompleteResponse;

      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      setIsCompleted(true);
      setCertificateId(json.certificate_id);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleComplete}
        disabled={loading}
        aria-busy={loading}
        className="w-full py-2.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        {loading ? "Marking complete…" : "Mark as Complete"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
