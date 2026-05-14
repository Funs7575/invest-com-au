export interface OnboardingData {
  interested_in: string[];
  investing_experience: string;
  investment_goals: string;
  display_name: string;
  portfolio_size: string;
  state: string;
}

export type OnboardingProfilePayload = Partial<OnboardingData> & {
  onboarding_completed: true;
};

/**
 * Builds the profile API payload for finishing onboarding.
 *
 * The final onboarding step is optional, so the UI keeps blank strings for
 * unselected values. Sending those blank strings through the profile API can
 * trigger enum/check-constraint failures in production. Only send fields the
 * user actually supplied, plus the required completion flag.
 */
export function buildOnboardingProfilePayload(
  form: OnboardingData,
): OnboardingProfilePayload {
  const payload: OnboardingProfilePayload = {
    onboarding_completed: true,
  };

  if (form.interested_in.length > 0) {
    payload.interested_in = form.interested_in;
  }

  const investingExperience = form.investing_experience.trim();
  if (investingExperience) {
    payload.investing_experience = investingExperience;
  }

  const investmentGoals = form.investment_goals.trim();
  if (investmentGoals) {
    payload.investment_goals = investmentGoals;
  }

  const displayName = form.display_name.trim();
  if (displayName) {
    payload.display_name = displayName;
  }

  const portfolioSize = form.portfolio_size.trim();
  if (portfolioSize) {
    payload.portfolio_size = portfolioSize;
  }

  const state = form.state.trim();
  if (state) {
    payload.state = state;
  }

  return payload;
}
