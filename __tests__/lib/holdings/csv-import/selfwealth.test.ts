import { describe, it, expect } from "vitest";
import { parseSelfWealthCsv } from "@/lib/holdings/csv-import/selfwealth";

const HEADER =
  "Trade Date,Settlement Date,Account,Code,Order Type,Quantity,Price,Brokerage,Consideration,Net Value";

describe("parseSelfWealthCsv", () => {
  it("parses three BUY rows on ASX", () => {
    const csv = [
      HEADER,
      "01/03/2026,03/03/2026,Trading,BHP,BUY,100,45.50,9.50,4550.00,4559.50",
      "15/03/2026,17/03/2026,Trading,CBA,BUY,50,110.00,9.50,5500.00,5509.50",
      "20/04/2026,22/04/2026,Trading,WBC,BUY,30,30.20,9.50,906.00,915.50",
    ].join("\n");

    const { rows, errors } = parseSelfWealthCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);

    const [r0, r1, r2] = rows;
    expect(r0?.ticker).toBe("BHP");
    expect(r0?.exchange).toBe("ASX");
    expect(r0?.shares).toBe(100);
    expect(r0?.cost_basis_per_share_cents).toBe(4550);
    expect(r0?.acquired_at).toBe("2026-03-01");
    expect(r0?.broker_slug).toBe("selfwealth");

    expect(r1?.ticker).toBe("CBA");
    expect(r2?.cost_basis_per_share_cents).toBe(3020);
  });

  it("surfaces SELL rows as skipped errors", () => {
    const csv = [
      HEADER,
      "01/03/2026,03/03/2026,Trading,BHP,BUY,100,45.50,9.50,4550.00,4559.50",
      "02/03/2026,04/03/2026,Trading,CBA,SELL,50,111.00,9.50,5550.00,5540.50",
    ].join("\n");
    const { rows, errors } = parseSelfWealthCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticker).toBe("BHP");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/non-BUY/);
  });

  it("marks non-ASX-shaped codes as OTHER", () => {
    const csv = [
      HEADER,
      "01/03/2026,03/03/2026,Trading,AAPL.US,BUY,10,150.00,9.50,1500.00,1509.50",
    ].join("\n");
    const { rows, errors } = parseSelfWealthCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]?.exchange).toBe("OTHER");
  });

  it("rejects invalid quantity / price / date", () => {
    const csv = [
      HEADER,
      "01/03/2026,03/03/2026,Trading,BHP,BUY,0,45.50,9.50,0,9.50",
      "01/03/2026,03/03/2026,Trading,BHP,BUY,10,-5.00,9.50,-50.00,-40.50",
      "BAD-DATE,03/03/2026,Trading,BHP,BUY,10,45.50,9.50,455.00,464.50",
    ].join("\n");
    const { rows, errors } = parseSelfWealthCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(3);
    expect(errors[0]?.reason).toMatch(/quantity/);
    expect(errors[1]?.reason).toMatch(/price/);
    expect(errors[2]?.reason).toMatch(/date/);
  });

  it("returns an error if the header is missing", () => {
    const csv = "01/03/2026,03/03/2026,Trading,BHP,BUY,100,45.50,9.50,4550.00,4559.50";
    const { rows, errors } = parseSelfWealthCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0]?.reason).toMatch(/header/);
  });

  it("returns a cap error when input exceeds 500 data rows", () => {
    const row = "01/03/2026,03/03/2026,Trading,BHP,BUY,1,45.50,9.50,45.50,55.00";
    const csv = [HEADER, ...new Array(501).fill(row)].join("\n");
    const { rows, errors } = parseSelfWealthCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0]?.reason).toMatch(/max 500/);
  });

  it("tolerates blank lines and CRLF line endings", () => {
    const csv = [
      HEADER,
      "",
      "01/03/2026,03/03/2026,Trading,BHP,BUY,100,45.50,9.50,4550.00,4559.50",
      "",
    ].join("\r\n");
    const { rows, errors } = parseSelfWealthCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("returns an explicit empty error for empty input", () => {
    const { rows, errors } = parseSelfWealthCsv("");
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});
