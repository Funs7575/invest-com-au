/**
 * Detect device type from user-agent string.
 * Returns 'mobile', 'tablet', or 'desktop'.
 */
export function detectDeviceType(
  userAgent: string
): "mobile" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (
    /mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile|wpdesktop/.test(
      ua
    )
  )
    return "mobile";
  return "desktop";
}
