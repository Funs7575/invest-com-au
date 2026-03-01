import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadCSV } from "@/lib/csv-export";

describe("downloadCSV", () => {
  let capturedBlobContent: string;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    capturedBlobContent = "";
    mockClick = vi.fn();
    mockAnchor = { href: "", download: "", click: mockClick };

    vi.stubGlobal("document", {
      createElement: vi.fn(() => mockAnchor),
    });

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(),
    });

    vi.stubGlobal(
      "Blob",
      class MockBlob {
        constructor(parts: string[]) {
          capturedBlobContent = parts.join("");
        }
      }
    );
  });

  it("generates correct CSV content from headers and rows", () => {
    downloadCSV("test.csv", ["Name", "Value"], [["Alice", "100"]]);
    expect(capturedBlobContent).toBe("Name,Value\nAlice,100");
  });

  it("escapes values containing commas and quotes per RFC 4180", () => {
    downloadCSV("t.csv", ["Name"], [['He said, "hi"']]);
    expect(capturedBlobContent).toBe('Name\n"He said, ""hi"""');
  });

  it("escapes values containing commas by wrapping in quotes", () => {
    downloadCSV("t.csv", ["Location"], [["Sydney, Australia"]]);
    expect(capturedBlobContent).toContain('"Sydney, Australia"');
  });

  it("escapes values containing newlines by wrapping in quotes", () => {
    downloadCSV("t.csv", ["Note"], [["Line 1\nLine 2"]]);
    expect(capturedBlobContent).toContain('"Line 1\nLine 2"');
  });

  it("triggers a download by clicking the anchor element", () => {
    downloadCSV("output.csv", ["A"], [["1"]]);
    expect(mockClick).toHaveBeenCalled();
  });

  it("revokes the object URL after download", () => {
    downloadCSV("output.csv", ["A"], [["1"]]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("sets the correct filename on the download attribute", () => {
    downloadCSV("my-report.csv", ["A"], [["1"]]);
    expect(mockAnchor.download).toBe("my-report.csv");
  });

  it("handles multiple rows", () => {
    downloadCSV(
      "test.csv",
      ["Name", "Fee"],
      [
        ["Broker A", "$5"],
        ["Broker B", "$10"],
        ["Broker C", "$0"],
      ]
    );
    const lines = capturedBlobContent.trim().split("\n");
    // 1 header + 3 data rows
    expect(lines).toHaveLength(4);
    expect(capturedBlobContent).toContain("Broker A");
    expect(capturedBlobContent).toContain("Broker B");
    expect(capturedBlobContent).toContain("Broker C");
  });

  it("handles empty rows array (header only)", () => {
    downloadCSV("test.csv", ["Name", "Fee"], []);
    const lines = capturedBlobContent.trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(capturedBlobContent).toContain("Name");
  });

  it("handles multiple headers", () => {
    downloadCSV("test.csv", ["A", "B", "C", "D"], [["1", "2", "3", "4"]]);
    const headerLine = capturedBlobContent.split("\n")[0];
    expect(headerLine).toBe("A,B,C,D");
  });

  it("creates a Blob and object URL", () => {
    downloadCSV("test.csv", ["A"], [["1"]]);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
});
