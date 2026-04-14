"use client";

import { useEffect } from "react";

/**
 * Registers the service worker. Mount once in the root layout.
 *
 * Skipped on localhost by default so iterative dev doesn't fight
 * with a stale worker. Set NEXT_PUBLIC_ENABLE_SW_LOCAL=1 to
 * override for local testing.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocal && process.env.NEXT_PUBLIC_ENABLE_SW_LOCAL !== "1") return;

    // Defer registration until after the page has finished loading
    // so it doesn't compete with the critical-path network.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Non-fatal — worse case we serve the site without offline support
          console.warn("service worker registration failed", err);
        });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
