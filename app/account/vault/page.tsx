import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import VaultClient from "./VaultClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Document Vault — My Account",
  description: "Securely store and access your important financial documents.",
  robots: "noindex, nofollow",
};

type DocType = "super_statement" | "tax_return" | "will" | "insurance_policy" | "bank_statement" | "other";

interface Document {
  id: string;
  document_type: DocType;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  description: string | null;
  created_at: string;
  download_url: string | null;
}

const STORAGE_BUCKET = "user-documents";
const SIGNED_URL_EXPIRY = 60 * 10; // 10 min

export default async function VaultPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // user_documents was removed from the live DB schema; cast to bypass
  // typed .from() until the vault feature is re-migrated.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from("user_documents")
    .select("id, document_type, file_name, file_path, file_size_bytes, mime_type, description, created_at")
    .order("created_at", { ascending: false });

  const documents: Document[] = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(row.file_path as string, SIGNED_URL_EXPIRY);
      return {
        ...row,
        document_type: row.document_type as DocType,
        file_name: row.file_name as string,
        file_path: row.file_path as string,
        file_size_bytes: row.file_size_bytes as number,
        mime_type: row.mime_type as string,
        description: (row.description as string | null) ?? null,
        created_at: row.created_at as string,
        download_url: signed?.signedUrl ?? null,
      };
    }),
  );

  return <VaultClient initialDocs={documents} />;
}
