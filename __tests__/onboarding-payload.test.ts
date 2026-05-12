import { describe, expect, it } from "vitest";
import {
  buildOnboardingProfilePayload,
  type OnboardingData,
} from "@/app/onboarding/onboarding-payload";

const baseForm: OnboardingData = {
  interested_in: ["shares"],
  investing_experience: "beginner",
  investment_goals: "growth",
  display_name: "Alex",
  portfolio_size: "under_10k",
  state: "NSW",
};

describe("buildOnboardingProfilePayload", () => {
  it("always marks onboarding as completed", () => {
    expect(buildOnboardingProfilePayload(baseForm)).toMatchObject({
      onboarding_completed: true,
    });
  });

  it("omits optional blank values from the final onboarding step", () => {
    const payload = buildOnboardingProfilePayload({
      ...baseForm,
      display_name: "   ",
      portfolio_size: "",
      state: "",
    });

    expect(payload).not.toHaveProperty("display_name");
    expect(payload).not.toHaveProperty("portfolio_size");
    expect(payload).not.toHaveProperty("state");
  });

  it("trims supplied text fields before sending them to the profile API", () => {
    expect(
      buildOnboardingProfilePayload({
        ...baseForm,
        display_name: "  Alex Investor  ",
      }),
    ).toMatchObject({
      display_name: "Alex Investor",
    });
  });
});
