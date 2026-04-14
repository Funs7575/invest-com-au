import { describe, it, expect } from "vitest";
import {
  classifyBrokerDataChange,
  classifyChangeSet,
} from "@/lib/broker-data-change-classifier";

describe("classifyBrokerDataChange", () => {
  it("classifies description as auto_apply", () => {
    expect(classifyBrokerDataChange({ field: "description", old_value: "a", new_value: "b" }).tier).toBe("auto_apply");
  });

  it("classifies logo_url as auto_apply", () => {
    expect(classifyBrokerDataChange({ field: "logo_url", old_value: null, new_value: "url" }).tier).toBe("auto_apply");
  });

  it("classifies asx_fee as require_admin", () => {
    expect(classifyBrokerDataChange({ field: "asx_fee", old_value: 5, new_value: 3 }).tier).toBe("require_admin");
  });

  it("classifies affiliate_url as require_admin", () => {
    expect(classifyBrokerDataChange({ field: "affiliate_url", old_value: null, new_value: "url" }).tier).toBe("require_admin");
  });

  it("classifies platform_type as auto_apply_reviewable", () => {
    expect(classifyBrokerDataChange({ field: "platform_type", old_value: "a", new_value: "b" }).tier).toBe("auto_apply_reviewable");
  });

  it("classifies unknown field as require_admin (conservative)", () => {
    expect(classifyBrokerDataChange({ field: "some_new_field", old_value: null, new_value: "x" }).tier).toBe("require_admin");
  });
});

describe("classifyChangeSet", () => {
  it("returns auto_apply when all fields are cosmetic", () => {
    const r = classifyChangeSet([
      { field: "description", old_value: "a", new_value: "b" },
      { field: "logo_url", old_value: null, new_value: "url" },
      { field: "linkedin_url", old_value: null, new_value: "url" },
    ]);
    expect(r.overallTier).toBe("auto_apply");
  });

  it("returns auto_apply_reviewable when mid-risk present", () => {
    const r = classifyChangeSet([
      { field: "description", old_value: "a", new_value: "b" },
      { field: "platform_type", old_value: "a", new_value: "b" },
    ]);
    expect(r.overallTier).toBe("auto_apply_reviewable");
  });

  it("returns require_admin when ANY field is high-risk", () => {
    const r = classifyChangeSet([
      { field: "description", old_value: "a", new_value: "b" },
      { field: "logo_url", old_value: null, new_value: "url" },
      { field: "asx_fee", old_value: 5, new_value: 3 }, // one bad apple
    ]);
    expect(r.overallTier).toBe("require_admin");
  });

  it("returns per-field classification for admin visibility", () => {
    const r = classifyChangeSet([
      { field: "description", old_value: "a", new_value: "b" },
      { field: "asx_fee", old_value: 5, new_value: 3 },
    ]);
    expect(r.perField).toHaveLength(2);
    expect(r.perField[0].tier).toBe("auto_apply");
    expect(r.perField[1].tier).toBe("require_admin");
  });
});
