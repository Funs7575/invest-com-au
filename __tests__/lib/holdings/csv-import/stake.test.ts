import { describe, it, expect } from "vitest";
import { parseStakeCsv } from "@/lib/holdings/csv-import/stake";

const HEADER = "Date,Reference,Activity,Symbol,Description,Quantity,Price,Total,Currency";

describe("parseStakeCsv", () => {
  it("parses three BUY rows and infers exchange", () => {
    const csv = [
      HEADER,
      "2026-03-01,T1,Buy,AAPL,Apple Inc.,10,150.25,1502.50,USD",
      "2026-03-15,T2,Buy,MSFT,Microsoft Corp.,5,310.00,1550.00,USD",
      "2026-04-20,T3,Buy,JNJ,Johnson & Johnson,7,160.00,1120.00,USD",
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);

    const [r0, r1, r2] = rows;
    expect(r0?.ticker).toBe("AAPL");
    expect(r0?.exchange).toBe("NASDAQ");
    expect(r0?.shares).toBe(10);
    expect(r0?.cost_basis_per_share_cents).toBe(15025);
    expect(r0?.acquired_at).toBe("2026-03-01");
    expect(r0?.broker_slug).toBe("stake");

    expect(r1?.ticker).toBe("MSFT");
    expect(r1?.exchange).toBe("NASDAQ");

    expect(r2?.ticker).toBe("JNJ");
    // JNJ is in the NYSE allowlist
    expect(r2?.exchange).toBe("NYSE");
  });

  it("skips non-BUY activities and surfaces them as errors", () => {
    const csv = [
      HEADER,
      "2026-03-01,T1,Buy,AAPL,Apple,10,150.00,1500.00,USD",
      "2026-03-02,T2,Sell,AAPL,Apple,5,160.00,800.00,USD",
      "2026-03-03,T3,Dividend,AAPL,Apple dividend,0,0,5.50,USD",
      "2026-03-04,T4,Cash Deposit,,,0,0,1000.00,USD",
    ].join("\n");
    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticker).toBe("AAPL");
    expect(errors).toHaveLength(3);
    expect(errors.every((e) => /non-BUY/.test(e.reason))).toBe(true);
  });

  it("tolerates $ prefix and thousands-separators on price/qty", () => {
    const csv = [
      HEADER,
      '2026-03-01,T1,Buy,GOOG,"Alphabet Inc.","1,000","$2,750.50","2,750,500.00",USD',
    ].join("\n");
    const { rows, errors } = parseStakeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.shares).toBe(1000);
    expect(rows[0]?.cost_basis_per_share_cents).toBe(275050);
  });

  it("rejects malformed dates and invalid tickers", () => {
    const csv = [
      HEADER,
      "NOT-A-DATE,T1,Buy,AAPL,Apple,10,150.00,1500.00,USD",
      "2026-03-02,T2,Buy,LONGTICKERZZ,Bad,1,1.00,1.00,USD",
    ].join("\n");
    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]?.reason).toMatch(/ticker|date/);
    expect(errors[1]?.reason).toMatch(/ticker/);
  });

  it("returns an error if the header row is missing", () => {
    const csv = "2026-03-01,T1,Buy,AAPL,Apple,10,150.00,1500.00,USD";
    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/header/);
  });

  it("accepts AU-style DD/MM/YYYY dates as a fallback", () => {
    const csv = [
      HEADER,
      "01/03/2026,T1,Buy,AAPL,Apple,10,150.00,1500.00,USD",
    ].join("\n");
    const { rows, errors } = parseStakeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]?.acquired_at).toBe("2026-03-01");
  });

  it("returns a cap error when input exceeds 500 data rows", () => {
    const buyRow = "2026-03-01,T1,Buy,AAPL,Apple,1,150.00,150.00,USD";
    const csv = [HEADER, ...new Array(501).fill(buyRow)].join("\n");
    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/max 500/);
  });

  it("returns an explicit empty error for empty input", () => {
    const { rows, errors } = parseStakeCsv("");
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});
