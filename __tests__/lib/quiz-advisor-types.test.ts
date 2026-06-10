import { describe, it, expect } from "vitest";
import {
  QUIZ_ADVISOR_TYPES,
  dbTypeForNeed,
  labelForNeed,
  hrefForNeed,
} from "@/lib/quiz-advisor-types";
import { isAdvisorType } from "@/lib/advisor-types";

describe("quiz advisor-type registry", () => {
  it("every dbType (except the not-sure passthrough) is a canonical advisor type", () => {
    for (const [need, meta] of Object.entries(QUIZ_ADVISOR_TYPES)) {
      if (meta.dbType === "") {
        expect(need).toBe("not-sure");
      } else {
        expect(isAdvisorType(meta.dbType)).toBe(true);
      }
    }
  });

  it("maps the formerly-stranded types to their real directories + DB types", () => {
    expect(dbTypeForNeed("conveyancer")).toBe("conveyancer");
    expect(hrefForNeed("conveyancer")).toBe("/advisors/conveyancers");
    expect(dbTypeForNeed("commercial-property-agent")).toBe("commercial_property_agent");
    expect(hrefForNeed("commercial-property-agent")).toBe("/advisors/commercial-property-agents");
    expect(dbTypeForNeed("estate-planner")).toBe("estate_planner");
    expect(hrefForNeed("estate-planner")).toBe("/advisors/estate-planners");
    expect(dbTypeForNeed("aged-care-advisor")).toBe("aged_care_advisor");
    expect(hrefForNeed("aged-care-advisor")).toBe("/advisors/aged-care-advisors");
    expect(dbTypeForNeed("debt-counsellor")).toBe("debt_counsellor");
    expect(hrefForNeed("debt-counsellor")).toBe("/advisors/debt-counsellors");
  });

  it("falls back gracefully for unknown / not-sure", () => {
    expect(dbTypeForNeed("not-sure")).toBe("");
    expect(dbTypeForNeed("totally-unknown")).toBe("");
    expect(labelForNeed("totally-unknown")).toBe("Financial Advisor");
    expect(hrefForNeed("not-sure")).toBe("/find-advisor");
  });
});
