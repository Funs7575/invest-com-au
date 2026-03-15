/**
 * Stores qualification data (quiz answers, calculator inputs) in sessionStorage
 * so it can be attached to advisor enquiry leads for better lead quality scoring.
 */

export interface QualificationData {
  source: string; // e.g. "find_advisor", "mortgage_calculator", "quiz", "savings_calculator"
  data: Record<string, unknown>;
  captured_at: string; // ISO timestamp
}

const STORAGE_KEY = "qualification_data";

export function storeQualificationData(source: string, data: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const payload: QualificationData = {
      source,
      data,
      captured_at: new Date().toISOString(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable (private browsing, storage full)
  }
}

export function getQualificationData(): QualificationData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QualificationData;
  } catch {
    return null;
  }
}

export function clearQualificationData(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
