// Canonical URL has moved to /startup/grants (W-14 hub relocation).
// 301 redirect is also declared in next.config.ts — this component is
// a server-side fallback to ensure the redirect fires even if the
// edge-layer config entry is somehow skipped.
import { permanentRedirect } from "next/navigation";

export default function GrantsRedirectPage() {
  permanentRedirect("/startup/grants");
}
