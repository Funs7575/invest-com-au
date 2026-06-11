import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, userEvent, mockUseUser } from "../setup";

// "@/lib/hooks/useUser" and "@/lib/tracking" are mocked by ../setup
// (mockUseUser is the overridable handle; trackEvent is already a vi.fn).
vi.mock("@/lib/session", () => ({
  getSessionId: vi.fn().mockReturnValue("sess-123"),
}));

import LotSaveButton from "@/components/invest/lot/LotSaveButton";
import { trackEvent } from "@/lib/tracking";

const mockTrackEvent = vi.mocked(trackEvent);

const PROPS = {
  slug: "riverina-aggregation-412ha",
  title: "Riverina Aggregation",
  vertical: "farmland",
};

function mockFetch(impl?: (url: string, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn(
    impl ??
      (async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("LotSaveButton", () => {
  beforeEach(() => {
    localStorage.clear();
    mockTrackEvent.mockClear();
    mockUseUser.mockReturnValue({ user: null, loading: false });
  });

  it("saves optimistically for anonymous users and mirrors to localStorage", async () => {
    const fetchFn = mockFetch();
    render(<LotSaveButton {...PROPS} />);

    const button = screen.getByRole("button", { name: /save/i });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("Saved");

    await waitFor(() => {
      const cached = JSON.parse(localStorage.getItem("inv_anon_saves") ?? "[]");
      expect(cached).toContainEqual({ type: "listing", ref: PROPS.slug });
    });

    const post = fetchFn.mock.calls.find(([, init]) => init?.method === "POST");
    expect(post).toBeTruthy();
    const body = JSON.parse(String(post?.[1]?.body));
    expect(body.type).toBe("listing");
    expect(body.ref).toBe(PROPS.slug);
    expect(body.session_id).toBe("sess-123");

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "listing_save",
      expect.objectContaining({ ref: PROPS.slug, vertical: "farmland", authed: false }),
    );
  });

  it("does NOT revert the anonymous saved state when the server write fails", async () => {
    mockFetch(async () => {
      throw new Error("network");
    });
    render(<LotSaveButton {...PROPS} />);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    const button = screen.getByRole("button");
    await waitFor(() => expect(button).toHaveAttribute("aria-busy", "false"));
    // localStorage holds the anon truth; the star stays filled.
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("writes the localStorage mirror BEFORE the network call so a failed save survives reload", async () => {
    mockFetch(async () => {
      throw new Error("offline");
    });
    render(<LotSaveButton {...PROPS} />);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "false"),
    );

    // The pressed button's promise ("saved on this device") must hold even
    // though the POST never landed.
    const cached = JSON.parse(localStorage.getItem("inv_anon_saves") ?? "[]");
    expect(cached).toContainEqual({ type: "listing", ref: PROPS.slug });
  });

  it("deletes the anonymous server row on unsave (claim-on-signup must not resurrect it)", async () => {
    localStorage.setItem(
      "inv_anon_saves",
      JSON.stringify([{ type: "listing", ref: PROPS.slug }]),
    );
    const fetchFn = mockFetch();
    render(<LotSaveButton {...PROPS} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-busy", "false"));

    expect(button).toHaveAttribute("aria-pressed", "false");
    const del = fetchFn.mock.calls.find(([, init]) => init?.method === "DELETE");
    expect(del).toBeTruthy();
    const body = JSON.parse(String(del?.[1]?.body));
    expect(body).toMatchObject({ type: "listing", ref: PROPS.slug, session_id: "sess-123" });

    const cached = JSON.parse(localStorage.getItem("inv_anon_saves") ?? "[]");
    expect(cached).not.toContainEqual({ type: "listing", ref: PROPS.slug });
  });

  it("keeps sibling instances for the same slug in sync (header pill + sticky bar)", async () => {
    const fetchFn = mockFetch();
    render(
      <>
        <LotSaveButton {...PROPS} />
        <LotSaveButton {...PROPS} variant="bar" />
      </>,
    );

    const [pill, bar] = screen.getAllByRole("button");
    expect(pill).toHaveAttribute("aria-pressed", "false");
    expect(bar).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(pill!);
    await waitFor(() => expect(pill).toHaveAttribute("aria-busy", "false"));

    // The sibling reflects the save without its own interaction…
    expect(pill).toHaveAttribute("aria-pressed", "true");
    expect(bar).toHaveAttribute("aria-pressed", "true");

    // …and toggling from the sibling unsaves (DELETE) instead of re-saving.
    await userEvent.click(bar!);
    await waitFor(() => expect(bar).toHaveAttribute("aria-busy", "false"));
    expect(pill).toHaveAttribute("aria-pressed", "false");
    expect(bar).toHaveAttribute("aria-pressed", "false");

    const methods = fetchFn.mock.calls.map(([, init]) => init?.method);
    expect(methods.filter((m) => m === "POST")).toHaveLength(1);
    expect(methods.filter((m) => m === "DELETE")).toHaveLength(1);
  });

  it("shows the first-save hint once, and not on later mounts", async () => {
    mockFetch();
    const first = render(<LotSaveButton {...PROPS} />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/saved on this device/i);
    expect(localStorage.getItem("inv_lot_first_save_seen")).toBe("1");
    first.unmount();

    // A different lot, fresh mount: saving again must not re-show the hint.
    render(<LotSaveButton {...PROPS} slug="another-lot" title="Another Lot" />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true"),
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("hydrates saved state from localStorage for anonymous visitors", () => {
    localStorage.setItem(
      "inv_anon_saves",
      JSON.stringify([{ type: "listing", ref: PROPS.slug }]),
    );
    mockFetch();
    render(<LotSaveButton {...PROPS} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("hydrates from the bookmarks API and deletes server-side for authed users", async () => {
    mockUseUser.mockReturnValue({ user: { id: "user-1" }, loading: false });
    const fetchFn = mockFetch(async (url, init) => {
      if (!init?.method || init.method === "GET") {
        return new Response(
          JSON.stringify({ items: [{ bookmark_type: "listing", ref: PROPS.slug }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    render(<LotSaveButton {...PROPS} />);
    const button = screen.getByRole("button");
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));

    await userEvent.click(button);
    await waitFor(() => {
      const del = fetchFn.mock.calls.find(([, init]) => init?.method === "DELETE");
      expect(del).toBeTruthy();
    });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "listing_unsave",
      expect.objectContaining({ authed: true }),
    );
  });
});
