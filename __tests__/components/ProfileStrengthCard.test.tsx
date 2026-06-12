// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockCelebrateMilestone } = vi.hoisted(() => ({ mockCelebrateMilestone: vi.fn() }));
vi.mock("@/lib/celebrate", () => ({ celebrateMilestone: mockCelebrateMilestone }));

import ProfileStrengthCard from "@/components/account/ProfileStrengthCard";

describe("ProfileStrengthCard (D5)", () => {
  beforeEach(() => {
    mockCelebrateMilestone.mockClear();
  });

  it("renders the ring with the completeness percentage", () => {
    render(<ProfileStrengthCard completeness={60} missing={["portfolio_size", "interested_in"]} />);
    expect(screen.getByRole("img", { name: "Profile 60% complete" })).toBeTruthy();
    expect(screen.getByText("60%")).toBeTruthy();
  });

  it("states what each missing field unlocks, with an Add link", () => {
    render(<ProfileStrengthCard completeness={80} missing={["portfolio_size"]} />);
    expect(screen.getByText("Portfolio size")).toBeTruthy();
    expect(screen.getByText(/dollar figures sized to you/)).toBeTruthy();
    const add = screen.getByRole("link", { name: "Add →" });
    expect(add.getAttribute("href")).toBe("/account/profile");
  });

  it("renders nothing at 100% but fires the profile_complete milestone", () => {
    const { container } = render(<ProfileStrengthCard completeness={100} missing={[]} />);
    expect(container.firstChild).toBeNull();
    expect(mockCelebrateMilestone).toHaveBeenCalledWith("profile_complete");
  });

  it("does not fire the milestone below 100%", () => {
    render(<ProfileStrengthCard completeness={80} missing={["display_name"]} />);
    expect(mockCelebrateMilestone).not.toHaveBeenCalled();
  });
});
