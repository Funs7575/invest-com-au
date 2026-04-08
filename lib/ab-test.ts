// Cookie-based A/B test variant assignment
// Deterministic: hash of session ID + test ID determines variant
// Sticky: once assigned, variant persists via cookie

export interface ABTestConfig {
  id: number;
  name: string;
  test_type: string;
  variant_a: Record<string, string>;  // e.g. { text: "Open Account", color: "amber-600" }
  variant_b: Record<string, string>;
  traffic_split: number;  // percentage for variant A (e.g. 50)
  status: string;
}

export type ABVariant = "a" | "b";

// Get variant for a test (client-side)
export function getVariant(testId: number, trafficSplit: number = 50): ABVariant {
  if (typeof window === "undefined") return "a";
  const cookieKey = `_inv_ab_${testId}`;
  // Check existing cookie
  const existing = document.cookie.split("; ").find(c => c.startsWith(cookieKey + "="));
  if (existing) return existing.split("=")[1] as ABVariant;
  // Assign based on random
  const variant: ABVariant = Math.random() * 100 < trafficSplit ? "a" : "b";
  // Set cookie (30 days)
  document.cookie = `${cookieKey}=${variant}; path=/; max-age=${30 * 86400}; samesite=lax`;
  return variant;
}
