"use client";

import { useState, useEffect } from "react";

interface Props {
  track?: "diy" | "advisor";
}

const DIY_MESSAGES = [
  "Scoring 15+ platforms against your answers…",
  "Checking fees, CHESS status & broker ratings…",
  "Applying your investment amount and goals…",
  "Ranking your personalised shortlist…",
];

const ADVISOR_MESSAGES = [
  "Identifying the right specialist for your goals…",
  "Checking verified advisors near you…",
  "Reviewing specialties that match your situation…",
  "Preparing your personalised match…",
];

export default function QuizAnalyzingScreen({ track = "diy" }: Props) {
  const messages = track === "advisor" ? ADVISOR_MESSAGES : DIY_MESSAGES;
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[50vh] reveal-screen-in">

          {/* Spinner with icon inside */}
          <div className="relative w-20 h-20 mb-7">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 analyzing-ring-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              {track === "advisor" ? (
                <svg
                  className="w-8 h-8 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              )}
            </div>
          </div>

          <h2 className="text-lg md:text-2xl font-extrabold mb-2 reveal-text-in text-slate-900">
            {track === "advisor" ? "Finding your match…" : "Analysing your answers…"}
          </h2>

          {/* Cycling contextual message */}
          <div className="h-7 flex items-center justify-center overflow-hidden">
            <p
              key={msgIndex}
              className="text-slate-500 text-xs md:text-sm text-center tagline-cycle px-4"
            >
              {messages[msgIndex]}
            </p>
          </div>

          {/* Animated dots */}
          <div className="flex gap-2 mt-6">
            <span className="w-2 h-2 rounded-full bg-amber-400 analyzing-dot-1" />
            <span className="w-2 h-2 rounded-full bg-amber-400 analyzing-dot-2" />
            <span className="w-2 h-2 rounded-full bg-amber-400 analyzing-dot-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
