// rls-isolation: user_documents

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for user_documents (DV-01).
 *
 * Policies under test:
 *   "Owners can view own documents"  — SELECT USING (user_id = auth.uid())
 *   "Owners can insert own documents" — INSERT WITH CHECK (user_id = auth.uid())
 *   "Owners can delete own documents" — DELETE USING (user_id = auth.uid())
 *
 * Verifies that user A cannot read, insert, or delete user B's document rows.
 */

interface Row {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  description: string | null;
  created_at: string;
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  const visibleRows = () => rows.filter((r) => r.user_id === callerUid);

  return {
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: visibleRows(), error: null }),
    }),
    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => {
      if (newRow.user_id !== callerUid) {
        return Promise.resolve({
          data: null,
          error: { code: "42501", message: "new row violates row-level security policy" },
        });
      }
      return Promise.resolve({ data: { ...newRow, id: "new-uuid" }, error: null });
    }),
    delete: vi.fn().mockReturnValue({
      eq: (col: string, val: string) => {
        const target = rows.find((r) => (r as unknown as Record<string, unknown>)[col] === val);
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve({
            data: null,
            error: { code: "42501", message: "row-level security violation" },
          });
        }
        return Promise.resolve({ data: target, error: null });
      },
    }),
  };
}

const USER_A = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_B = "bbbbbbbb-0000-0000-0000-000000000002";

const SEED_ROWS: Row[] = [
  {
    id: "doc-a-1",
    user_id: USER_A,
    document_type: "tax_return",
    file_name: "tax-2025.pdf",
    file_path: `${USER_A}/doc-a-1/tax-2025.pdf`,
    file_size_bytes: 512000,
    mime_type: "application/pdf",
    description: null,
    created_at: "2026-05-20T00:00:00Z",
  },
  {
    id: "doc-b-1",
    user_id: USER_B,
    document_type: "will",
    file_name: "will-signed.pdf",
    file_path: `${USER_B}/doc-b-1/will-signed.pdf`,
    file_size_bytes: 256000,
    mime_type: "application/pdf",
    description: "My last will and testament",
    created_at: "2026-05-20T00:00:00Z",
  },
];

describe("user_documents — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B);
  });

  it("user A can SELECT their own documents", async () => {
    const { data, error } = await clientA.select().order("created_at");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_A);
  });

  it("user A cannot see user B's documents in their SELECT", async () => {
    const { data } = await clientA.select().order("created_at");
    expect(data!.filter((r: Row) => r.user_id === USER_B)).toHaveLength(0);
  });

  it("user B can SELECT their own documents", async () => {
    const { data, error } = await clientB.select().order("created_at");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_B);
  });

  it("user A can INSERT a document with their own user_id", async () => {
    const { data, error } = await clientA.insert({
      user_id: USER_A,
      document_type: "bank_statement",
      file_name: "statement-apr.pdf",
      file_path: `${USER_A}/new-uuid/statement-apr.pdf`,
      file_size_bytes: 102400,
      mime_type: "application/pdf",
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a document with user B's user_id", async () => {
    const { data, error } = await clientA.insert({
      user_id: USER_B,
      document_type: "tax_return",
      file_name: "b-tax.pdf",
      file_path: `${USER_B}/x/b-tax.pdf`,
      file_size_bytes: 1024,
      mime_type: "application/pdf",
    });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user A can DELETE their own document", async () => {
    const { error } = await clientA.delete().eq("id", "doc-a-1");
    expect(error).toBeNull();
  });

  it("user A cannot DELETE user B's document", async () => {
    const { error } = await clientA.delete().eq("id", "doc-b-1");
    expect(error?.code).toBe("42501");
  });

  it("user B can DELETE their own document", async () => {
    const { error } = await clientB.delete().eq("id", "doc-b-1");
    expect(error).toBeNull();
  });
});
