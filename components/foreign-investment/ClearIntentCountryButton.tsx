"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { clearIntentCountryAction } from "@/lib/intent-context-actions";

/**
 * Small button that clears the intent-country cookie and refreshes the
 * current page so server components see the cleared state. Used inside
 * IntentCountryBadge where the user wants to drop the filter.
 */
export default function ClearIntentCountryButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await clearIntentCountryAction();
          router.refresh();
        })
      }
      className={className}
    >
      {children}
    </button>
  );
}
