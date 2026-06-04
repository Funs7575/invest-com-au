/**
 * @vitest-environment jsdom
 *
 * Privacy regression test for app/community/[category]/[threadId]/page.tsx.
 *
 * The thread-detail server component must NOT serialize author_id (a Supabase
 * auth.uid) into the props handed to the ThreadClient client component, because
 * client-component props are shipped to the browser in the RSC/HTML payload and
 * this deanonymises Investment Confessions authors. Instead it must compute
 * ownership/moderator state server-side and pass only booleans.
 *
 * Finding: "Forum thread-detail page serializes author_id to the client,
 * breaking confessions anonymity" (Tier B).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../components/setup";

const { mockFrom, mockGetUser, mockResolveAdvisorBadges, capturedProps } =
  vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockGetUser: vi.fn(),
    mockResolveAdvisorBadges: vi.fn(),
    capturedProps: { current: null as Record<string, unknown> | null },
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock("@/lib/forum-author-badges", () => ({
  resolveAdvisorBadges: mockResolveAdvisorBadges,
}));

vi.mock("@/lib/seo", () => ({
  absoluteUrl: (p: string) => `https://invest.com.au${p}`,
  breadcrumbJsonLd: () => ({}),
}));

vi.mock("@/lib/compliance", () => ({
  GENERAL_ADVICE_WARNING: "advice warning",
}));

// Capture the props the page passes across the client boundary so we can assert
// on the exact serialized payload.
vi.mock("@/app/community/[category]/[threadId]/ThreadClient", () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps.current = props;
    return null;
  },
}));

const AUTHOR_UUID = "11111111-1111-1111-1111-111111111111";
const POST_AUTHOR_UUID = "22222222-2222-2222-2222-222222222222";
const VIEWER_UUID = "33333333-3333-3333-3333-333333333333";

const CATEGORY = {
  id: "cat-1",
  slug: "shares-etfs",
  name: "Shares & ETFs",
  icon: "trending-up",
  color: "emerald",
};

const THREAD_ROW = {
  id: "thread-1",
  category_id: "cat-1",
  author_id: AUTHOR_UUID,
  author_name: "Anonymous Investor",
  title: "My confession",
  slug: "my-confession",
  body: "Line one\nLine two",
  is_pinned: false,
  is_locked: false,
  reply_count: 1,
  view_count: 10,
  vote_score: 3,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: null,
};

const POST_ROW = {
  id: "post-1",
  thread_id: "thread-1",
  parent_id: null,
  author_id: POST_AUTHOR_UUID,
  author_name: "Replier",
  body: "A reply",
  vote_score: 1,
  is_removed: false,
  created_at: "2026-01-02T00:00:00.000Z",
  updated_at: null,
};

/**
 * Builds a from() dispatcher that returns a query chain per table. Each leaf
 * (single / order / in / update) resolves with the appropriate fixture.
 */
function makeFrom(profiles: unknown[]) {
  return (table: string) => {
    if (table === "forum_categories") {
      const single = vi.fn().mockResolvedValue({ data: CATEGORY });
      const eq2 = vi.fn().mockReturnValue({ single });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
      const select = vi.fn().mockReturnValue({ eq: eq1 });
      return { select };
    }
    if (table === "forum_threads") {
      // forum_threads is used twice: a select(...).eq().eq().single() read and
      // an update(...).eq().then() fire-and-forget view-count bump.
      const single = vi.fn().mockResolvedValue({ data: THREAD_ROW });
      const eqRead2 = vi.fn().mockReturnValue({ single });
      const eqRead1 = vi.fn().mockReturnValue({ eq: eqRead2 });
      const select = vi.fn().mockReturnValue({ eq: eqRead1 });
      const eqUpdate = vi.fn().mockReturnValue({
        then: (cb: () => void) => cb(),
      });
      const update = vi.fn().mockReturnValue({ eq: eqUpdate });
      return { select, update };
    }
    if (table === "forum_posts") {
      const order = vi.fn().mockResolvedValue({ data: [POST_ROW] });
      const eq2 = vi.fn().mockReturnValue({ order });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
      const select = vi.fn().mockReturnValue({ eq: eq1 });
      return { select };
    }
    if (table === "forum_user_profiles") {
      const inFn = vi.fn().mockResolvedValue({ data: profiles });
      const select = vi.fn().mockReturnValue({ in: inFn });
      return { select };
    }
    throw new Error(`unexpected table ${table}`);
  };
}

import ThreadPage from "@/app/community/[category]/[threadId]/page";

async function renderPage() {
  render(
    await ThreadPage({
      params: Promise.resolve({
        category: "shares-etfs",
        threadId: "thread-1",
      }),
    })
  );
}

describe("ThreadPage author_id serialization", () => {
  beforeEach(() => {
    capturedProps.current = null;
    mockResolveAdvisorBadges.mockResolvedValue(new Map());
    mockFrom.mockImplementation(makeFrom([]));
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("does NOT include author_id anywhere in the serialized ThreadClient payload", async () => {
    await renderPage();

    const props = capturedProps.current;
    expect(props).not.toBeNull();

    // The whole serialized payload must be free of author_id and of the raw
    // author UUIDs themselves.
    const serialized = JSON.stringify(props);
    expect(serialized).not.toContain("author_id");
    expect(serialized).not.toContain(AUTHOR_UUID);
    expect(serialized).not.toContain(POST_AUTHOR_UUID);

    const thread = props!.thread as Record<string, unknown>;
    const posts = props!.posts as Record<string, unknown>[];
    expect(thread).not.toHaveProperty("author_id");
    expect(posts[0]).not.toHaveProperty("author_id");

    // The legitimate display field is still present.
    expect(thread.author_name).toBe("Anonymous Investor");
  });

  it("passes is_own=false / isModerator=false for an anonymous viewer", async () => {
    await renderPage();

    const props = capturedProps.current!;
    const thread = props.thread as Record<string, unknown>;
    const posts = props.posts as Record<string, unknown>[];

    expect(thread.is_own).toBe(false);
    expect(posts[0]?.is_own).toBe(false);
    expect(props.isModerator).toBe(false);
  });

  it("computes is_own=true for the viewer's own thread/post and isModerator from their profile", async () => {
    // Viewer authored the thread AND is a moderator per their forum profile.
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTHOR_UUID } } });
    mockFrom.mockImplementation(
      makeFrom([
        {
          user_id: AUTHOR_UUID,
          display_name: "Anonymous Investor",
          reputation: 100,
          badge: "moderator",
          is_moderator: true,
        },
      ])
    );

    await renderPage();

    const props = capturedProps.current!;
    const thread = props.thread as Record<string, unknown>;
    const posts = props.posts as Record<string, unknown>[];

    expect(thread.is_own).toBe(true); // viewer === thread author
    expect(posts[0]?.is_own).toBe(false); // viewer !== post author
    expect(props.isModerator).toBe(true);

    // Still no author_id leak even when ownership flags are true.
    expect(JSON.stringify(props)).not.toContain("author_id");
  });

  it("isModerator is false when the viewer's profile is not a moderator", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: VIEWER_UUID } } });
    mockFrom.mockImplementation(
      makeFrom([
        {
          user_id: VIEWER_UUID,
          display_name: "Regular",
          reputation: 5,
          badge: null,
          is_moderator: false,
        },
      ])
    );

    await renderPage();

    const props = capturedProps.current!;
    expect(props.isModerator).toBe(false);
    expect((props.thread as Record<string, unknown>).is_own).toBe(false);
  });
});
