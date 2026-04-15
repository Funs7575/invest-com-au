/**
 * Advisor KYC document store.
 *
 * Advisors upload AFSL certificates, proof-of-ID, ABN certs and
 * professional indemnity insurance via the advisor portal. Files
 * land in Supabase Storage (bucket: advisor-kyc) keyed by
 * `advisor-kyc/{professional_id}/{timestamp}-{filename}`. The
 * metadata + verification state lives in advisor_kyc_documents.
 *
 * Everything is service-role because we don't want advisors
 * reading their peers' documents; access is gated via server
 * routes that check session ownership first.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("advisor-kyc");

export type KycDocumentType =
  | "afsl_certificate"
  | "proof_of_id"
  | "abn_certificate"
  | "insurance"
  | "other";

export type KycStatus = "submitted" | "verified" | "rejected" | "expired";

export interface KycDocumentRow {
  id: number;
  professional_id: number;
  document_type: KycDocumentType;
  storage_path: string;
  original_filename: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  status: KycStatus;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  uploaded_at: string;
}

const VALID_TYPES: KycDocumentType[] = [
  "afsl_certificate",
  "proof_of_id",
  "abn_certificate",
  "insurance",
  "other",
];

export function isValidKycType(v: unknown): v is KycDocumentType {
  return typeof v === "string" && (VALID_TYPES as string[]).includes(v);
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export interface RecordUploadInput {
  professionalId: number;
  documentType: KycDocumentType;
  storagePath: string;
  originalFilename: string | null;
  fileSizeBytes: number;
  mimeType: string;
  expiresAt?: string | null;
}

export interface RecordUploadResult {
  ok: boolean;
  id?: number;
  error?: string;
}

export async function recordKycUpload(
  input: RecordUploadInput,
): Promise<RecordUploadResult> {
  if (!isValidKycType(input.documentType)) {
    return { ok: false, error: "invalid_type" };
  }
  if (input.fileSizeBytes <= 0 || input.fileSizeBytes > MAX_BYTES) {
    return { ok: false, error: "invalid_size" };
  }
  if (!ALLOWED_MIMES.has(input.mimeType)) {
    return { ok: false, error: "invalid_mime" };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("advisor_kyc_documents")
      .insert({
        professional_id: input.professionalId,
        document_type: input.documentType,
        storage_path: input.storagePath,
        original_filename: input.originalFilename,
        file_size_bytes: input.fileSizeBytes,
        mime_type: input.mimeType,
        status: "submitted" as KycStatus,
        expires_at: input.expiresAt ?? null,
      })
      .select("id")
      .single();
    if (error) {
      log.warn("advisor_kyc_documents insert failed", { error: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id as number };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function listKycDocuments(
  professionalId: number,
): Promise<KycDocumentRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("advisor_kyc_documents")
      .select("*")
      .eq("professional_id", professionalId)
      .order("uploaded_at", { ascending: false });
    return (data as KycDocumentRow[] | null) || [];
  } catch {
    return [];
  }
}

export async function listPendingKyc(): Promise<KycDocumentRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("advisor_kyc_documents")
      .select("*")
      .eq("status", "submitted")
      .order("uploaded_at", { ascending: true })
      .limit(100);
    return (data as KycDocumentRow[] | null) || [];
  } catch {
    return [];
  }
}

export async function verifyKyc(input: {
  id: number;
  verifiedBy: string;
  notes?: string | null;
}): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("advisor_kyc_documents")
      .update({
        status: "verified",
        verified_by: input.verifiedBy,
        verified_at: new Date().toISOString(),
        verification_notes: input.notes ?? null,
      })
      .eq("id", input.id);
    return !error;
  } catch {
    return false;
  }
}

export async function rejectKyc(input: {
  id: number;
  verifiedBy: string;
  reason: string;
}): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("advisor_kyc_documents")
      .update({
        status: "rejected",
        verified_by: input.verifiedBy,
        verified_at: new Date().toISOString(),
        rejection_reason: input.reason.slice(0, 500),
      })
      .eq("id", input.id);
    return !error;
  } catch {
    return false;
  }
}
