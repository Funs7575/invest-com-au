"use client";

/**
 * Progress dots row — ported from the old quiz (QuizQuestionScreen.tsx).
 * Past dots are clickable so users can jump back without spamming the
 * back button. Current dot pulses softly; future dots are slate-200.
 *
 * Desktop-only (md+); mobile falls back to the slim progress bar shown
 * just above the question card.
 */

interface Props {
  total: number;
  current: number;
  onJumpTo?: (index: number) => void;
}

export default function ProgressDots({ total, current, onJumpTo }: Props) {
  return (
    <div className="hidden md:flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const isPast = i < current;
        const isCurrent = i === current;
        const canJump = isPast && typeof onJumpTo === "function";
        const cls = isPast
          ? "w-3 h-3 bg-amber-500"
          : isCurrent
            ? "w-3 h-3 bg-amber-500 ring-4 ring-amber-200"
            : "w-2.5 h-2.5 bg-slate-200";
        if (canJump) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onJumpTo!(i)}
              aria-label={`Jump back to question ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${cls} hover:scale-125 hover:bg-amber-600 cursor-pointer`}
            />
          );
        }
        return (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${cls}`}
          />
        );
      })}
    </div>
  );
}
