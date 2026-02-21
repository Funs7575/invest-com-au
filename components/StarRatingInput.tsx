"use client";

import { useState } from "react";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-9 h-9",
};

export default function StarRatingInput({ value, onChange, size = "md" }: StarRatingInputProps) {
  const [hovered, setHovered] = useState(0);

  const display = hovered || value;

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="radiogroup"
      aria-label="Star rating"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              onChange(Math.min(5, value + 1));
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(Math.max(1, value - 1));
            }
          }}
          className={`${sizeMap[size]} transition-transform duration-100 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400/50 rounded cursor-pointer`}
          tabIndex={star === value || (value === 0 && star === 1) ? 0 : -1}
        >
          <svg
            viewBox="0 0 24 24"
            fill={star <= display ? "#f59e0b" : "none"}
            stroke={star <= display ? "#f59e0b" : "#cbd5e1"}
            strokeWidth={1.5}
            className="w-full h-full"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
