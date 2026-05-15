import { describe, it, expect } from "vitest";
import { parseStakeCsv } from "@/lib/holdings/csv-import/stake";

const AUS_HEADER =
  "Trade Date,Settle Date,Order ID,Side,Currency,Symbol,Quantity,Price,Value,Brokerage,Total";
const US_HEADER =
  "Trade Date,Settle Date,Order ID,Side,Currency,Symbol,Quantity,Price,Value,Brokerage,Total";

describe("parseStakeCsv", () => {
  it("parses AUS BUY rows with AUD → ASX exchange", () => {
    const csv = [
      AUS_HEADER,
      "01/03/2026,03/03/2026,STK1,BUY,AUD,BHP,100,45.123,4512.30,3.00,4515.30",
      "15/03/2026,17/03/2026,STK2,BUY,AUD,CBA,50,110.50,5525.00,3.00,5528.00",
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);

    const [r0, r1] = rows;
    expect(r0?.ticker).toBe("BHP");
    expect(r0?.exchange).toBe("ASX");
    expect(r0?.shares).toBe(100);
    expect(r0?.cost_basis_per_share_cents).toBe(4512);
    expect(r0?.acquired_at).toBe("2026-03-01");
    expect(r0?.broker_slug).toBe("stake");

    expect(r1?.ticker).toBe("CBA");
    expect(r1?.cost_basis_per_share_cents).toBe(11050);
  });

  it("parses Wall St BUY rows with USD → NASDAQ exchange", () => {
    const csv = [
      US_HEADER,
      "03/15/2026,03/17/2026,STK3,BUY,USD,AAPL,10,175.25,1752.50,0,1752.50",
      "04/20/2026,04/22/2026,STK4,Bought,USD,MSFT,5,420.00,2100.00,0,2100.00",
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.ticker).toBe("AAPL");
    expect(rows[0]?.exchange).toBe("NASDAQ");
    expect(rows[0]?.acquired_at).toBe("2026-03-15");
    expect(rows[1]?.ticker).toBe("MSFT");
    expect(rows[1]?.cost_basis_per_share_cents).toBe(42000);
  });

  it("skips SELL / dividend / fee rows but surfaces them as errors", () => {
    const csv = [
      AUS_HEADER,
      "01/03/2026,03/03/2026,1,BUY,AUD,BHP,10,45.00,450.00,3.00,453.00",
      "02/03/2026,04/03/2026,2,SELL,AUD,CBA,5,110.00,550.00,3.00,547.00",
      "03/03/2026,05/03/2026,3,DIV,AUD,BHP,0,1.45,14.50,0,14.50",
      "04/03/2026,06/03/2026,4,FEE,AUD,,0,0,5.00,5.00,5.00",
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticker).toBe("BHP");
    expect(errors).toHaveLength(3);
    expect(errors[0]?.reason).toMatch(/SELL/);
    expect(errors[1]?.reason).toMatch(/dividend|DRP/);
    expect(errors[2]?.reason).toMatch(/fee/i);
  });

  it("tolerates older variants — Type column, Ticker column, ISO dates", () => {
    const csv = [
      "Effective Date,Type,Ticker,Qty,Unit Price,Currency",
      "2026-03-01,Buy,VAS,12,95.50,AUD",
      "2026-04-15,B,VTS,7,310.25,USD",
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.ticker).toBe("VAS");
    expect(rows[0]?.exchange).toBe("ASX");
    expect(rows[0]?.acquired_at).toBe("2026-03-01");
    expect(rows[1]?.ticker).toBe("VTS");
    expect(rows[1]?.exchange).toBe("NASDAQ");
    expect(rows[1]?.cost_basis_per_share_cents).toBe(31025);
  });

  it("strips $ and commas from price and quantity", () => {
    const csv = [
      AUS_HEADER,
      '01/03/2026,03/03/2026,1,BUY,AUD,BHP,"1,000","$45.50",45500.00,3.00,45503.00',
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.shares).toBe(1000);
    expect(rows[0]?.cost_basis_per_share_cents).toBe(4550);
  });

  it("maps unusual currencies — GBP→LSE, HKD→HKEX, JPY→TYO, unknown→OTHER", () => {
    const csv = [
      AUS_HEADER,
      "01/03/2026,03/03/2026,1,BUY,GBP,VOD,10,1.05,10.50,0,10.50",
      "02/03/2026,04/03/2026,2,BUY,HKD,9988,10,250.00,2500.00,0,2500.00",
      "03/03/2026,05/03/2026,3,BUY,JPY,7203,10,2500.00,25000.00,0,25000.00",
      "04/03/2026,06/03/2026,4,BUY,XYZ,FOO,1,1.00,1.00,0,1.00",
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(4);
    expect(rows[0]?.exchange).toBe("LSE");
    expect(rows[1]?.exchange).toBe("HKEX");
    expect(rows[2]?.exchange).toBe("TYO");
    expect(rows[3]?.exchange).toBe("OTHER");
  });

  it("defaults exchange to ASX when currency column is absent", () => {
    const csv = [
      "Trade Date,Side,Symbol,Quantity,Price",
      "01/03/2026,BUY,BHP,10,45.00",
      "02/03/2026,BUY,AAPL,5,175.00",
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.exchange).toBe("ASX");
    expect(rows[1]?.exchange).toBe("ASX");
  });

  it("flags zero / negative quantities", () => {
    const csv = [
      AUS_HEADER,
      "01/03/2026,03/03/2026,1,BUY,AUD,BHP,0,45.00,0,0,0",
      "02/03/2026,04/03/2026,2,BUY,AUD,CBA,-5,110.00,-550.00,0,-550",
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]?.reason).toMatch(/quantity/);
    expect(errors[1]?.reason).toMatch(/quantity/);
  });

  it("flags unparseable dates", () => {
    const csv = [
      AUS_HEADER,
      "NOT-A-DATE,03/03/2026,1,BUY,AUD,BHP,10,45.00,450.00,0,450",
      "32/13/2026,03/03/2026,2,BUY,AUD,CBA,5,110.00,550.00,0,550",
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]?.reason).toMatch(/date/);
    expect(errors[1]?.reason).toMatch(/date/);
  });

  it("rejects CSV without a recognisable header", () => {
    const csv = [
      "01/03/2026,3,BUY,BHP,10,45.00",
      "02/03/2026,4,BUY,CBA,5,110.00",
    ].join("\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/header not recognised/i);
  });

  it("returns explicit empty-error for empty input", () => {
    const { rows, errors } = parseStakeCsv("");
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/empty/i);
  });

  it("returns a cap error when input exceeds 500 data rows", () => {
    const row = "01/03/2026,03/03/2026,1,BUY,AUD,BHP,1,45.00,45.00,0,45";
    const csv = [AUS_HEADER, ...new Array(501).fill(row)].join("\n");
    const { rows, errors } = parseStakeCsv(csv);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/max 500/);
  });

  it("tolerates blank lines + CRLF + header not on first line", () => {
    const csv = [
      "",
      "# Exported 2026-03-15",
      AUS_HEADER,
      "",
      "01/03/2026,03/03/2026,1,BUY,AUD,BHP,10,45.00,450.00,0,450",
    ].join("\r\n");

    const { rows, errors } = parseStakeCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticker).toBe("BHP");
  });
});
