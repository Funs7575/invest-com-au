/**
 * @vitest-environment jsdom
 *
 * Privacy regression test for app/office-hours/[id]/page.tsx.
 *
 * The office-hours session page must NOT serialize an anonymous asker's
 * display_name into the props handed to the OfficeHoursLiveStream client
 * component. Client-component props ship to the browser in the RSC/HTML
 * payload, so forwarding the raw display_name for is_anonymous questions
 * deanonymises the asker even though the UI renders "Anonymous".
 *
 * Finding: "Office-hours detail page forwards anonymous asker display_name to
 * the client" (Tier A).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "../components/setup";

const { mockFrom, capturedProps } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  capturedProps: { current: null as Record<string, unknown> | null },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

vi.mock("@/lib/seo", () => ({
  absoluteUrl: (p: string) => `https://invest.com.au${p}`,
  breadcrumbJsonLd: () => ({}),
  SITE_URL: "https://invest.com.au",
}));

vi.mock("@/lib/compliance", () => ({
  GENERAL_ADVICE_WARNING: "advice warning",
}));

vi.mock("@/components/RsvpButton", () => ({
  default: () => null,
}));

// Capture the props the page hands across the client boundary.
vi.mock("@/components/OfficeHoursLiveStream", () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps.current = props;
    return null;
  },
}));

const SESSION_ROW = {
  id: 1,
  title: "Live Q&A",
  description: "Ask anything",
  scheduled_at: "2026-06-10T03:00:00.000Z",
  ends_at: null,
  status: "transcript",
  max_questions: 50,
  rsvp_count: 0,
  is_published: true,
  advisor_id: 9,
  professionals: {
    id: 9,
    name: "Jane Advisor",
    slug: "jane-advisor",
    type: "financial-adviser",
    firm_name: "Acme",
    headshot_url: null,
  },
};

const NAMED_QUESTION = {
  id: 100,
  session_id: 1,
  display_name: "Public Asker",
  question: "What is an ETF?",
  is_anonymous: false,
  answer: "A fund.",
  answered_at: "2026-06-10T03:05:00.000Z",
  upvote_count: 2,
  created_at: "2026-06-10T03:01:00.000Z",
};

const SECRET_NAME = "Secret Real Name";
const ANON_QUESTION = {
  id: 101,
  session_id: 1,
  display_name: SECRET_NAME,
  question: "How do I avoid tax?",
  is_anonymous: true,
  answer: null,
  answered_at: null,
  upvote_count: 5,
  created_at: "2026-06-10T03:02:00.000Z",
};

function makeFrom() {
  return (table: string) => {
    if (table === "advisor_office_hours") {
      const single = vi.fn().mockResolvedValue({ data: SESSION_ROW });
      const eq2 = vi.fn().mockReturnValue({ single });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
      const select = vi.fn().mockReturnValue({ eq: eq1 });
      return { select };
    }
    if (table === "office_hour_questions") {
      const limit = vi
        .fn()
        .mockResolvedValue({ data: [NAMED_QUESTION, ANON_QUESTION] });
      const order2 = vi.fn().mockReturnValue({ limit });
      const order1 = vi.fn().mockReturnValue({ order: order2 });
      const eq2 = vi.fn().mockReturnValue({ order: order1 });
      const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
      const select = vi.fn().mockReturnValue({ eq: eq1 });
      return { select };
    }
    throw new Error(`unexpected table ${table}`);
  };
}

import OfficeHoursSessionPage from "@/app/office-hours/[id]/page";

async function renderPage() {
  render(await OfficeHoursSessionPage({ params: Promise.resolve({ id: "1" }) }));
}

describe("OfficeHoursSessionPage anonymous display_name serialization", () => {
  beforeEach(() => {
    capturedProps.current = null;
    mockFrom.mockImplementation(makeFrom());
  });

  it("does NOT forward an anonymous asker's display_name to the client", async () => {
    await renderPage();

    const props = capturedProps.current;
    expect(props).not.toBeNull();

    // The secret real name must never appear in the serialized payload.
    expect(JSON.stringify(props)).not.toContain(SECRET_NAME);

    const questions = props!.initialQuestions as Record<string, unknown>[];
    const anon = questions.find((q) => q.id === 101)!;
    expect(anon.display_name).toBe("");
    // The anonymity flag itself is still forwarded so the UI can label it.
    expect(anon.is_anonymous).toBe(true);
  });

  it("still forwards the display_name for non-anonymous questions", async () => {
    await renderPage();

    const props = capturedProps.current!;
    const questions = props.initialQuestions as Record<string, unknown>[];
    const named = questions.find((q) => q.id === 100)!;
    expect(named.display_name).toBe("Public Asker");
    expect(named.is_anonymous).toBe(false);
  });
});
