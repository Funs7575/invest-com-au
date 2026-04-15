"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Resets keyboard focus to <main> after every route change so
 * screen-reader users don't land at the top of the <body> with
 * no context.
 *
 * Without this, Next.js App Router's client-side nav keeps focus
 * wherever the previous link was, which for screen readers means
 * "you just announced a link, now you're somewhere else, no cue
 * that the page changed".
 *
 * Mount once in the root layout so it listens to every nav.
 */

export default function RouteChangeFocus() {
  const pathname = usePathname();
  const initialMount = useRef(true);

  useEffect(() => {
    // Don't steal focus from the initial page load — the browser's
    // native behaviour (focus on address bar / first link) is what
    // the user expects on a cold load. Only reset focus on
    // subsequent navigations.
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }

    if (typeof document === "undefined") return;

    // Prefer <main id="main-content"> (the LayoutShell target),
    // fall back to any <main>, then <body>
    const main =
      document.getElementById("main-content") ||
      document.querySelector("main") ||
      document.body;
    if (!main) return;

    // Ensure the element is focusable — main typically isn't in the
    // tab order, so we set tabindex=-1 temporarily. Remove after
    // focus to keep the tab order clean.
    const prev = main.getAttribute("tabindex");
    if (prev === null) main.setAttribute("tabindex", "-1");
    (main as HTMLElement).focus({ preventScroll: true });
    // Reset scroll to top as well — App Router does this too, but
    // we want to be explicit so the re-focus matches.
    window.scrollTo({ top: 0, behavior: "auto" });

    // Restore tabindex shortly after so keyboard tabbing isn't
    // affected. The delay is just long enough for the focus to
    // land on the element.
    const timer = window.setTimeout(() => {
      if (prev === null) main.removeAttribute("tabindex");
    }, 100);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
