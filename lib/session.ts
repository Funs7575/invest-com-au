/**
 * First-party session ID for analytics.
 * Generates/retrieves a session ID from cookies or localStorage.
 */

function generateId(): string {
  // Use crypto.randomUUID if available, fallback to Math.random
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  // Try cookie first
  const cookieId = getCookie("_inv_sid");
  if (cookieId) return cookieId;

  // Try localStorage fallback
  try {
    const storedId = localStorage.getItem("_inv_sid");
    if (storedId) {
      // Re-set cookie in case it expired
      setCookie("_inv_sid", storedId, 30);
      return storedId;
    }
  } catch {
    // localStorage not available
  }

  // Generate new session ID
  const newId = generateId();
  setCookie("_inv_sid", newId, 30);
  try {
    localStorage.setItem("_inv_sid", newId);
  } catch {
    // localStorage not available
  }

  return newId;
}
