import { describe, it, expect } from "vitest";
import { parseCommSecCsv } from "@/lib/holdings/csv-import/commsec";

const HEADER = "Date,Reference,Details,Debit($),Credit($),Balance($)";

describe("parseCommSecCsv", () => {
  it("parses three plain BUY rows", () => {
    const csv = [
      HEADER,
      '01/03/2026,T123,B 100 BHP @ 45.123,4512.30,,1234.56',
      '15/03/2026,T124,B 50 CBA @ 110.50,5525.00,,710.00',
      '20/04/2026,T125,BUY 25 NDQ @ 35.10,877.50,,3211.00',
    ].join("\n");

    const { rows, errors } = parseCommSecCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);

    const [r0, r1, r2] = rows;
    expect(r0?.ticker).toBe("BHP");
    expect(r0?.exchange).toBe("ASX");
    expect(r0?.shares).toBe(100);
    expect(r0?.cost_basis_per_share_cents).toBe(4512); // round(45.123 * 100)
    expect(r0?.acquired_at).toBe("2026-03-01");
    expect(r0?.broker_slug).toBe("commsec");

    expect(r1?.ticker).toBe("CBA");
    expect(r1?.cost_basis_per_share_cents).toBe(11050);

    expect(r2?.ticker).toBe("NDQ");
    expect(r2?.shares).toBe(25);
    expect(r2?.cost_basis_per_share_cents).toBe(3510);
  });

  it("tolerates a $ prefix on the price and extra whitespace", () => {
    const csv = [
      HEADER,
      '02/02/2026,T1,B  10  WBC @ $30.00,,300.00,1000.00',
    ].join("\n");
    const { rows, errors } = parseCommSecCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticker).toBe("WBC");
    expect(rows[0]?.cost_basis_per_share_cents).toBe(3000);
  });

  it("skips header gracefully and accepts an export without one", () => {
    const csv = [
      '01/03/2026,T1,B 100 BHP @ 45.00,4500.00,,0',
    ].join("\n");
    const { rows, errors } = parseCommSecCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("returns errors for SELL and dividend rows but keeps BUY rows", () => {
    const csv = [
      HEADER,
      '01/03/2026,T1,B 100 BHP @ 45.00,4500.00,,0',
      '02/03/2026,T2,S 50 CBA @ 110.00,,5500.00,5500',
      '03/03/2026,T3,DIV BHP $1.45 per share,,145.00,5645',
      '04/03/2026,T4,DRP NDQ 3 units allotted,,,5645',
    ].join("\n");
    const { rows, errors } = parseCommSecCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticker).toBe("BHP");
    expect(errors).toHaveLength(3);
    expect(errors[0]?.reason).toMatch(/SELL/);
    expect(errors[1]?.reason).toMatch(/dividend|DRP/);
    expect(errors[2]?.reason).toMatch(/dividend|DRP/);
  });

  it("rejects malformed date", () => {
    const csv = [
      HEADER,
      'NOT-A-DATE,T1,B 100 BHP @ 45.00,4500.00,,0',
      '31/02/2026,T2,B 50 CBA @ 110.00,5500.00,,0',
    ].join("\n");
    const { rows, errors } = parseCommSecCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]?.reason).toMatch(/date/);
    expect(errors[1]?.reason).toMatch(/date/);
  });

  it("rejects rows missing a ticker / with a non-BUY details cell", () => {
    const csv = [
      HEADER,
      '01/03/2026,T1,Some free-form note with no ticker,,,0',
      '02/03/2026,T2,FEE Brokerage adjustment,,5.00,5',
    ].join("\n");
    const { rows, errors } = parseCommSecCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]?.reason).toMatch(/no BUY pattern/);
  });

  it("flags rows with negative or zero shares", () => {
    // Force shares to 0 via "B 0 BHP @ 45". Regex still matches; the
    // numeric guard inside the parser rejects it.
    const csv = [
      HEADER,
      '01/03/2026,T1,B 0 BHP @ 45.00,0,,0',
    ].join("\n");
    const { rows, errors } = parseCommSecCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/shares/);
  });

  it("marks suffixed tickers (e.g. BHP.AX) as exchange=OTHER", () => {
    const csv = [
      HEADER,
      '01/03/2026,T1,B 10 BHP.AX @ 45.00,450.00,,0',
    ].join("\n");
    const { rows } = parseCommSecCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.exchange).toBe("OTHER");
  });

  it("returns a cap error when input exceeds 500 data rows", () => {
    const buyRow = "01/03/2026,T1,B 1 BHP @ 45.00,45.00,,0";
    const csv = [HEADER, ...new Array(501).fill(buyRow)].join("\n");
    const { rows, errors } = parseCommSecCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/max 500/);
  });

  it("tolerates blank lines and CRLF line endings", () => {
    const csv = [
      HEADER,
      "",
      '01/03/2026,T1,B 10 BHP @ 45.00,450.00,,0',
      "",
    ].join("\r\n");
    const { rows, errors } = parseCommSecCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("returns an explicit empty error for empty input", () => {
    const { rows, errors } = parseCommSecCsv("");
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});
