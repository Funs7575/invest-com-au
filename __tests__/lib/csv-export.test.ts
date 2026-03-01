import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to mock DOM APIs before importing
const mockClick = vi.fn();
const mockCreateElement = vi.fn(() => ({ href: "", download: "", click: mockClick }));
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
const mockRevokeObjectURL = vi.fn();

vi.stubGlobal("document", { createElement: mockCreateElement });
vi.stubGlobal("URL", { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL });
vi.stubGlobal("Blob", class MockBlob { constructor(public parts: string[], public options: Record<string, string>) {} });

// Now import the module
const { downloadCSV } = await import("@/lib/csv-export");

describe("downloadCSV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a download link and clicks it", () => {
    downloadCSV("test.csv", ["Name", "Age"], [["Alice", "30"]]);
    expect(mockCreateElement).toHaveBeenCalledWith("a");
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it("generates correct CSV content", () => {
    downloadCSV("test.csv", ["Name", "Score"], [["Alice", "100"], ["Bob", "95"]]);
    const blobArgs = (mockCreateObjectURL.mock.calls[0][0] as { parts: string[] }).parts;
    const csv = blobArgs[0];
    expect(csv).toContain("Name,Score");
    expect(csv).toContain("Alice,100");
    expect(csv).toContain("Bob,95");
  });

  it("escapes values with commas", () => {
    downloadCSV("test.csv", ["Name"], [["Smith, John"]]);
    const blobArgs = (mockCreateObjectURL.mock.calls[0][0] as { parts: string[] }).parts;
    const csv = blobArgs[0];
    expect(csv).toContain('"Smith, John"');
  });

  it("escapes values with quotes", () => {
    downloadCSV("test.csv", ["Name"], [['He said "hello"']]);
    const blobArgs = (mockCreateObjectURL.mock.calls[0][0] as { parts: string[] }).parts;
    const csv = blobArgs[0];
    expect(csv).toContain('"He said ""hello"""');
  });

  it("escapes values with newlines", () => {
    downloadCSV("test.csv", ["Note"], [["Line1\nLine2"]]);
    const blobArgs = (mockCreateObjectURL.mock.calls[0][0] as { parts: string[] }).parts;
    const csv = blobArgs[0];
    expect(csv).toContain('"Line1\nLine2"');
  });

  it("passes through simple values without escaping", () => {
    downloadCSV("test.csv", ["Name"], [["Alice"]]);
    const blobArgs = (mockCreateObjectURL.mock.calls[0][0] as { parts: string[] }).parts;
    const csv = blobArgs[0];
    expect(csv).toBe("Name\nAlice");
  });
});
