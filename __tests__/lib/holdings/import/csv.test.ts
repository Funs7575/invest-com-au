import { describe, it, expect } from "vitest";
import {
  parseCsv,
  sniffDelimiter,
  stripBom,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
} from "@/lib/holdings/import/csv";

describe("stripBom", () => {
  it("removes a leading UTF-8 BOM", () => {
    expect(stripBom("﻿Code,Units")).toBe("Code,Units");
  });
  it("leaves BOM-free text untouched", () => {
    expect(stripBom("Code,Units")).toBe("Code,Units");
  });
});

describe("sniffDelimiter", () => {
  it("defaults to comma", () => {
    expect(sniffDelimiter("a,b,c\n1,2,3")).toBe(",");
  });
  it("detects semicolons (European Excel)", () => {
    expect(sniffDelimiter("a;b;c\n1;2;3")).toBe(";");
  });
  it("detects tabs", () => {
    expect(sniffDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });
  it("ignores delimiters inside quotes", () => {
    // The only commas are inside a quoted field; semicolons separate cells.
    expect(sniffDelimiter('"a,a";b;c\n"1,1";2;3')).toBe(";");
  });
});

describe("parseCsv", () => {
  it("returns [] for empty / whitespace-only input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("   \n  \n")).toEqual([]);
  });

  it("splits simple comma rows and trims cells", () => {
    const records = parseCsv("Code, Units , Price\nBHP,100,45.00");
    expect(records).toHaveLength(2);
    expect(records[0]?.cells).toEqual(["Code", "Units", "Price"]);
    expect(records[1]?.cells).toEqual(["BHP", "100", "45.00"]);
  });

  it("keeps commas inside double-quoted fields", () => {
    const records = parseCsv('Code,Comment\nBHP,"bought 100, sold 50"');
    expect(records[1]?.cells).toEqual(["BHP", "bought 100, sold 50"]);
  });

  it("handles RFC-4180 escaped double-quotes inside a quoted field", () => {
    const records = parseCsv('Code,Note\nBHP,"a ""quoted"" word"');
    expect(records[1]?.cells).toEqual(["BHP", 'a "quoted" word']);
  });

  it("handles newlines inside quoted fields without splitting the record", () => {
    const records = parseCsv('Code,Note\nBHP,"line one\nline two"\nCBA,ok');
    expect(records).toHaveLength(3);
    expect(records[1]?.cells).toEqual(["BHP", "line one\nline two"]);
    expect(records[2]?.cells).toEqual(["CBA", "ok"]);
  });

  it("handles CRLF line endings", () => {
    const records = parseCsv("Code,Units\r\nBHP,100\r\nCBA,50\r\n");
    expect(records).toHaveLength(3);
    expect(records[2]?.cells).toEqual(["CBA", "50"]);
  });

  it("handles bare CR line endings", () => {
    const records = parseCsv("Code,Units\rBHP,100\rCBA,50");
    expect(records).toHaveLength(3);
  });

  it("strips a BOM before tokenising", () => {
    const records = parseCsv("﻿Code,Units\nBHP,100");
    expect(records[0]?.cells).toEqual(["Code", "Units"]);
  });

  it("drops all-empty records (blank lines, trailing newline)", () => {
    const records = parseCsv("Code,Units\n\nBHP,100\n\n");
    expect(records).toHaveLength(2);
    expect(records[1]?.cells).toEqual(["BHP", "100"]);
  });

  it("tracks the 1-based physical source row, accounting for in-quote newlines", () => {
    const records = parseCsv('Code,Note\nBHP,"a\nb"\nCBA,ok');
    // header=line1, BHP record starts on line2, CBA record starts on line4
    expect(records[0]?.sourceRow).toBe(1);
    expect(records[1]?.sourceRow).toBe(2);
    expect(records[2]?.sourceRow).toBe(4);
  });

  it("parses a semicolon-delimited file end-to-end", () => {
    const records = parseCsv("Code;Units;Price\nBHP;100;45,00");
    expect(records[1]?.cells).toEqual(["BHP", "100", "45,00"]);
  });
});

describe("caps", () => {
  it("exposes the 1 MB file ceiling and 500-row cap", () => {
    expect(MAX_IMPORT_FILE_BYTES).toBe(1_000_000);
    expect(MAX_IMPORT_ROWS).toBe(500);
  });
});
