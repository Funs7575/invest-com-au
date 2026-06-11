import { describe, it, expect } from "vitest";

import {
  classifySlaState,
  RESPONSE_SLA_HOURS,
  WARNING_AT_HOURS,
  type SlaInput,
} from "@/lib/briefs/sla";

const ACCEPTED_AT = "2026-06-10T00:00:00.000Z";

function hoursAfterAccept(hours: number): Date {
  return new Date(new Date(ACCEPTED_AT).getTime() + hours * 3_600_000);
}

function makeInput(overrides: Partial<SlaInput> = {}): SlaInput {
  return {
    acceptedAt: ACCEPTED_AT,
    now: hoursAfterAccept(1),
    hasProviderMessage: false,
    trackerStatus: "new",
    hasDispute: false,
    alreadyWarned: false,
    alreadyClawed: false,
    ...overrides,
  };
}

describe("classifySlaState", () => {
  it("is ok inside the warning window", () => {
    expect(classifySlaState(makeInput({ now: hoursAfterAccept(WARNING_AT_HOURS - 1) }))).toBe(
      "ok",
    );
  });

  it("warns once between the warning threshold and the SLA", () => {
    const at19h = makeInput({ now: hoursAfterAccept(WARNING_AT_HOURS + 1) });
    expect(classifySlaState(at19h)).toBe("warn");
    expect(classifySlaState({ ...at19h, alreadyWarned: true })).toBe("ok");
  });

  it("breaches at the SLA boundary regardless of prior warning", () => {
    const at24h = makeInput({
      now: hoursAfterAccept(RESPONSE_SLA_HOURS),
      alreadyWarned: true,
    });
    expect(classifySlaState(at24h)).toBe("breach");
  });

  it("a provider message exempts the brief", () => {
    expect(
      classifySlaState(
        makeInput({ now: hoursAfterAccept(30), hasProviderMessage: true }),
      ),
    ).toBe("exempt");
  });

  it("moving the tracker off 'new' exempts the brief (phone contact)", () => {
    expect(
      classifySlaState(
        makeInput({ now: hoursAfterAccept(30), trackerStatus: "contacted" }),
      ),
    ).toBe("exempt");
  });

  it("an open dispute exempts the brief — the dispute flow owns refunds", () => {
    expect(
      classifySlaState(makeInput({ now: hoursAfterAccept(30), hasDispute: true })),
    ).toBe("exempt");
  });

  it("never claws back twice", () => {
    expect(
      classifySlaState(makeInput({ now: hoursAfterAccept(48), alreadyClawed: true })),
    ).toBe("exempt");
  });
});
