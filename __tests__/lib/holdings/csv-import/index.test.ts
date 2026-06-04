import { describe, it, expect } from "vitest";

import {
  getCsvImportParser,
  SUPPORTED_BROKER_SLUGS,
  CSV_IMPORT_PARSERS,
} from "@/lib/holdings/csv-import";

// Parser-agnostic barrel/registry coverage. Per-broker parsing behaviour
// is covered by the individual __tests__/lib/holdings/csv-import/<broker>
// suites — we deliberately do not duplicate those assertions here.

describe("csv-import registry", () => {
  it("supports exactly the five known broker slugs", () => {
    expect([...SUPPORTED_BROKER_SLUGS].sort()).toEqual(
      ["commsec", "ibkr", "nabtrade", "selfwealth", "stake"]
    );
  });

  it("registers a function parser for every supported slug", () => {
    for (const slug of SUPPORTED_BROKER_SLUGS) {
      expect(typeof CSV_IMPORT_PARSERS[slug]).toBe("function");
    }
  });

  it("getCsvImportParser returns the registry entry for a slug", () => {
    for (const slug of SUPPORTED_BROKER_SLUGS) {
      expect(getCsvImportParser(slug)).toBe(CSV_IMPORT_PARSERS[slug]);
    }
  });

  it("a resolved parser returns a CsvParseResult shape on empty input without throwing", () => {
    const parse = getCsvImportParser("commsec");
    const result = parse("");
    expect(Array.isArray(result.rows)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
