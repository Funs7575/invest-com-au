import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "./setup";
import userEvent from "@testing-library/user-event";
import FollowAdvisorButton from "@/components/FollowAdvisorButton";

const { mockPush } = await import("./setup");

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function okResponse() {
  return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
}

function unauthorizedResponse() {
  return Promise.resolve(new Response(JSON.stringify({ error: "Sign in" }), { status: 401, headers: { "Content-Type": "application/json" } }));
}

describe("FollowAdvisorButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(okResponse);
  });

  it("renders 'Follow' when not following", () => {
    render(<FollowAdvisorButton professionalId={1} initialFollowing={false} />);
    expect(screen.getByRole("button", { name: /follow this advisor/i })).toBeInTheDocument();
    expect(screen.getByText("Follow")).toBeInTheDocument();
  });

  it("renders 'Following' when already following", () => {
    render(<FollowAdvisorButton professionalId={1} initialFollowing={true} />);
    expect(screen.getByRole("button", { name: /unfollow this advisor/i })).toBeInTheDocument();
    expect(screen.getByText("Following")).toBeInTheDocument();
  });

  it("displays follower count when provided", () => {
    render(<FollowAdvisorButton professionalId={1} initialFollowing={false} followerCount={42} />);
    expect(screen.getByText(/42 followers/)).toBeInTheDocument();
  });

  it("displays singular 'follower' when count is 1", () => {
    render(<FollowAdvisorButton professionalId={1} initialFollowing={false} followerCount={1} />);
    expect(screen.getByText("1 follower")).toBeInTheDocument();
  });

  it("hides follower count when count is 0", () => {
    render(<FollowAdvisorButton professionalId={1} initialFollowing={false} followerCount={0} />);
    expect(screen.queryByText(/follower/)).not.toBeInTheDocument();
  });

  it("optimistically toggles to 'Following' when clicked (unfollow → follow)", async () => {
    const user = userEvent.setup();
    render(<FollowAdvisorButton professionalId={5} initialFollowing={false} followerCount={10} />);

    await act(async () => {
      await user.click(screen.getByRole("button"));
    });

    // After optimistic update
    expect(screen.getByText("Following")).toBeInTheDocument();
  });

  it("calls fetch POST when following", async () => {
    const user = userEvent.setup();
    render(<FollowAdvisorButton professionalId={7} initialFollowing={false} />);

    await act(async () => {
      await user.click(screen.getByRole("button"));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/follows/advisor",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ professionalId: 7 }) })
    );
  });

  it("calls fetch DELETE when unfollowing", async () => {
    const user = userEvent.setup();
    render(<FollowAdvisorButton professionalId={3} initialFollowing={true} />);

    await act(async () => {
      await user.click(screen.getByRole("button"));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/follows/advisor",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("redirects to /auth/login (with a next param) when API returns 401", async () => {
    mockFetch.mockImplementation(unauthorizedResponse);
    const user = userEvent.setup();
    render(<FollowAdvisorButton professionalId={2} initialFollowing={false} />);

    await act(async () => {
      await user.click(screen.getByRole("button"));
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/auth/login?next="),
      );
    });
  });

  it("reverts optimistic update on 401 response", async () => {
    mockFetch.mockImplementation(unauthorizedResponse);
    const user = userEvent.setup();
    render(<FollowAdvisorButton professionalId={2} initialFollowing={false} />);

    await act(async () => {
      await user.click(screen.getByRole("button"));
    });

    await waitFor(() => {
      expect(screen.getByText("Follow")).toBeInTheDocument();
    });
  });

  it("has aria-pressed=true when following", () => {
    render(<FollowAdvisorButton professionalId={1} initialFollowing={true} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("has aria-pressed=false when not following", () => {
    render(<FollowAdvisorButton professionalId={1} initialFollowing={false} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });
});
