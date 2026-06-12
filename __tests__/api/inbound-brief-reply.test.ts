import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockVerify, mockExtract, mockIsAllowed, mockSendMessage, mockOnTeam, mockAdminFrom } =
  vi.hoisted(() => ({
    mockVerify: vi.fn<(...args: unknown[]) => boolean>(),
    mockExtract: vi.fn(),
    mockIsAllowed: vi.fn(async () => true),
    mockSendMessage: vi.fn(),
    mockOnTeam: vi.fn(async () => false),
    mockAdminFrom: vi.fn(),
  }));

vi.mock("@/lib/resend-webhook-verify", () => ({
  verifyResendSignature: (...args: unknown[]) => mockVerify(...args),
  extractSvixHeaders: (...args: unknown[]) => mockExtract(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
}));

vi.mock("@/lib/brief-messages", () => {
  class BriefMessageError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
      this.name = "BriefMessageError";
    }
  }
  return {
    BRIEF_MESSAGE_MAX_BODY_LENGTH: 4000,
    BriefMessageError,
    sendMessage: mockSendMessage,
  };
});

vi.mock("@/lib/expert-teams", () => ({
  isProfessionalOnTeam: mockOnTeam,
}));

import { POST } from "@/app/api/inbound/brief-reply/route";
import { buildBriefReplyAddress } from "@/lib/briefs/reply-address";
import { BriefMessageError } from "@/lib/brief-messages";

// ── Fixtures / helpers ─────────────────────────────────────────────────

const SVIX_HEADERS = {
  svixId: "msg_inbound_001",
  svixTimestamp: "1700000000",
  svixSignature: "v1,abc123",
};

const BRIEF_ID = 42;

const OPEN_BRIEF = {
  id: BRIEF_ID,
  slug: "smsf-setup-42",
  status: "open",
  contact_email: "Consumer@Example.com",
  accepted_at: "2026-06-10T01:00:00Z",
  accepted_by_professional_id: 7,
  accepted_by_team_id: null as number | null,
};

const ACCEPTED_PRO = { id: 7, email: "pro@firm.example.com" };

interface TableResults {
  advisor_auctions?: { data: unknown };
  professionals_single?: { data: unknown };
  professionals_list?: { data: unknown };
  expert_team_members?: { data: unknown };
  brief_messages?: { data: unknown };
}

/**
 * Chainable, thenable query stub. `.maybeSingle()` resolves the "single"
 * result; awaiting the chain itself (list queries: `.limit()`, `.in()`,
 * trailing `.eq()`) resolves the "list" result.
 */
function makeChain(single: { data: unknown }, list: { data: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = vi.fn(() => chain);
  for (const m of ["select", "eq", "gte", "in", "limit", "order"]) chain[m] = self;
  chain.maybeSingle = vi.fn(async () => single);
  chain.then = (resolve: (v: unknown) => void) => resolve(list);
  return chain;
}

function configureDb(results: TableResults = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "advisor_auctions") {
      return makeChain(results.advisor_auctions ?? { data: OPEN_BRIEF }, { data: [] });
    }
    if (table === "professionals") {
      return makeChain(
        results.professionals_single ?? { data: ACCEPTED_PRO },
        results.professionals_list ?? { data: [] },
      );
    }
    if (table === "expert_team_members") {
      return makeChain({ data: null }, results.expert_team_members ?? { data: [] });
    }
    if (table === "brief_messages") {
      return makeChain({ data: null }, results.brief_messages ?? { data: [] });
    }
    return makeChain({ data: null }, { data: [] });
  });
}

function replyAddress(briefId = BRIEF_ID): string {
  const address = buildBriefReplyAddress(briefId);
  if (!address) throw new Error("test env missing BRIEF_REPLY_SECRET stub");
  return address;
}

function inboundEvent(overrides: Record<string, unknown> = {}, type = "email.received") {
  return {
    type,
    data: {
      from: "Tom Consumer <consumer@example.com>",
      to: [replyAddress()],
      subject: "Re: A provider accepted your Match Request",
      text: "Sounds great, let's talk Tuesday.\n\nOn Tue, 9 Jun 2026 at 14:02, Pro <pro@firm.example.com> wrote:\n> Hi Tom",
      html: null,
      email_id: "11111111-2222-3333-4444-555555555555",
      ...overrides,
    },
  };
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/inbound/brief-reply", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "svix-id": SVIX_HEADERS.svixId,
      "svix-timestamp": SVIX_HEADERS.svixTimestamp,
      "svix-signature": SVIX_HEADERS.svixSignature,
    },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("POST /api/inbound/brief-reply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_INBOUND_WEBHOOK_SECRET", "whsec_inbound_test");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_fallback_test");
    vi.stubEnv("BRIEF_REPLY_SECRET", "route-test-reply-secret");
    vi.stubEnv("BRIEF_REPLY_DOMAIN", "reply.test.invest.com.au");
    mockExtract.mockReturnValue(SVIX_HEADERS);
    mockVerify.mockReturnValue(true);
    mockIsAllowed.mockResolvedValue(true);
    mockOnTeam.mockResolvedValue(false);
    mockSendMessage.mockResolvedValue({ id: 9001, brief_id: BRIEF_ID });
    configureDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ─── Transport security ──────────────────────────────────────────

  it("returns 500 when no webhook secret is configured", async () => {
    vi.stubEnv("RESEND_INBOUND_WEBHOOK_SECRET", "");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    const res = await POST(makePost(inboundEvent()));
    expect(res.status).toBe(500);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("falls back to RESEND_WEBHOOK_SECRET when the inbound secret is unset", async () => {
    vi.stubEnv("RESEND_INBOUND_WEBHOOK_SECRET", "");
    const res = await POST(makePost(inboundEvent()));
    expect(res.status).toBe(200);
    expect(mockVerify).toHaveBeenCalledWith(
      "whsec_fallback_test",
      expect.any(String),
      SVIX_HEADERS,
    );
  });

  it("returns 401 on an invalid Svix signature and touches nothing", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(makePost(inboundEvent()));
    expect(res.status).toBe(401);
    expect(mockAdminFrom).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("returns 400 for signed-but-malformed JSON without throwing", async () => {
    const res = await POST(makePost("this is not json"));
    expect(res.status).toBe(400);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("ignores (200) events that are not email.received", async () => {
    const res = await POST(makePost(inboundEvent({}, "email.bounced")));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("not_email_received");
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("ignores (200) a payload with an unrecognised shape", async () => {
    const res = await POST(makePost({ type: "email.received" }));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("unrecognised_payload");
  });

  // ─── HMAC reply-address gate ─────────────────────────────────────

  it("ignores (200) mail with no brief reply address among recipients", async () => {
    const res = await POST(
      makePost(inboundEvent({ to: ["hello@invest.com.au"], cc: ["other@x.com"] })),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("no_reply_address");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("ignores (200) a tampered HMAC token and never queries the brief", async () => {
    const forged = replyAddress().replace(`brief+${BRIEF_ID}.`, `brief+${BRIEF_ID + 1}.`);
    const res = await POST(makePost(inboundEvent({ to: [forged] })));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("bad_signature");
    expect(mockAdminFrom).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("ignores (200) everything when BRIEF_REPLY_SECRET is unset (fail closed)", async () => {
    const event = inboundEvent(); // build while the secret is still stubbed
    vi.stubEnv("BRIEF_REPLY_SECRET", "");
    const res = await POST(makePost(event));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("no_secret");
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("accepts the reply address arriving via cc", async () => {
    const res = await POST(
      makePost(inboundEvent({ to: ["someone@else.com"], cc: [replyAddress()] })),
    );
    expect(res.status).toBe(200);
    expect(mockSendMessage).toHaveBeenCalledOnce();
  });

  // ─── Rate limiting ───────────────────────────────────────────────

  it("returns 429 when the per-brief bucket is exhausted, before any DB read", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(inboundEvent()));
    expect(res.status).toBe(429);
    expect(mockIsAllowed).toHaveBeenCalledWith(
      "brief_reply_inbound",
      String(BRIEF_ID),
      expect.objectContaining({ max: expect.any(Number) }),
    );
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  // ─── Brief state gates ───────────────────────────────────────────

  it("ignores (200) a valid token whose brief no longer exists", async () => {
    configureDb({ advisor_auctions: { data: null } });
    const res = await POST(makePost(inboundEvent()));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("brief_not_found");
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("rejects a replayed token for a closed brief (200, no insert)", async () => {
    configureDb({ advisor_auctions: { data: { ...OPEN_BRIEF, status: "closed" } } });
    const res = await POST(makePost(inboundEvent()));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("brief_closed");
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("rejects a replayed token for an expired brief (200, no insert)", async () => {
    configureDb({ advisor_auctions: { data: { ...OPEN_BRIEF, status: "expired" } } });
    const res = await POST(makePost(inboundEvent()));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("brief_closed");
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("ignores (200) replies to a brief that has not been accepted yet", async () => {
    configureDb({
      advisor_auctions: {
        data: { ...OPEN_BRIEF, accepted_at: null, accepted_by_professional_id: null },
      },
    });
    const res = await POST(makePost(inboundEvent()));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("brief_not_accepted");
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  // ─── Sender gates ────────────────────────────────────────────────

  it("ignores (200) senders who are not a party to the brief", async () => {
    const res = await POST(
      makePost(inboundEvent({ from: "Attacker <attacker@evil.example.com>" })),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("sender_not_party");
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("ignores (200) mail without a parseable From address", async () => {
    const res = await POST(makePost(inboundEvent({ from: "no address here" })));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("no_sender");
  });

  // ─── Happy paths ─────────────────────────────────────────────────

  it("bridges a consumer reply: case-insensitive match, quoted history stripped", async () => {
    const res = await POST(
      makePost(inboundEvent({ from: "Tom Consumer <CONSUMER@example.COM>" })),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).messageId).toBe(9001);
    expect(mockSendMessage).toHaveBeenCalledWith({
      briefId: BRIEF_ID,
      senderKind: "consumer",
      senderUserId: null,
      senderProfessionalId: null,
      senderTeamId: null,
      body: "Sounds great, let's talk Tuesday.",
    });
  });

  it("bridges an accepted professional's reply as sender_kind professional", async () => {
    const res = await POST(
      makePost(
        inboundEvent({
          from: "Pro <pro@firm.example.com>",
          text: "Hi Tom, I can do Tuesday 2pm.\n\nSent from my iPhone",
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(mockSendMessage).toHaveBeenCalledWith({
      briefId: BRIEF_ID,
      senderKind: "professional",
      senderUserId: null,
      senderProfessionalId: 7,
      senderTeamId: null,
      body: "Hi Tom, I can do Tuesday 2pm.",
    });
  });

  it("bridges the accepted pro as 'team' when they accepted for a team they are on", async () => {
    configureDb({
      advisor_auctions: { data: { ...OPEN_BRIEF, accepted_by_team_id: 5 } },
    });
    mockOnTeam.mockResolvedValue(true);
    const res = await POST(
      makePost(inboundEvent({ from: "Pro <pro@firm.example.com>", text: "On it." })),
    );
    expect(res.status).toBe(200);
    expect(mockOnTeam).toHaveBeenCalledWith(5, 7);
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderKind: "team", senderProfessionalId: 7, senderTeamId: 5 }),
    );
  });

  it("bridges an active team member (not the accepted pro) as 'team'", async () => {
    configureDb({
      advisor_auctions: { data: { ...OPEN_BRIEF, accepted_by_team_id: 5 } },
      expert_team_members: { data: [{ professional_id: 11 }, { professional_id: 12 }] },
      professionals_list: {
        data: [
          { id: 11, email: "colleague@firm.example.com" },
          { id: 12, email: "other@firm.example.com" },
        ],
      },
    });
    const res = await POST(
      makePost(
        inboundEvent({ from: "Colleague <Colleague@firm.example.com>", text: "Taking this one." }),
      ),
    );
    expect(res.status).toBe(200);
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderKind: "team", senderProfessionalId: 11, senderTeamId: 5 }),
    );
  });

  // ─── Body handling ───────────────────────────────────────────────

  it("caps an oversized reply at the chat max body length", async () => {
    const res = await POST(makePost(inboundEvent({ text: "z".repeat(12_000) })));
    expect(res.status).toBe(200);
    const sent = mockSendMessage.mock.calls[0]?.[0] as { body: string };
    expect(sent.body.length).toBe(4000);
  });

  it("ignores (200) replies that are empty after stripping quotes", async () => {
    const res = await POST(
      makePost(inboundEvent({ text: "> just quoted text\n> nothing fresh" })),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("empty_reply");
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("skips webhook redeliveries when an identical recent message exists", async () => {
    configureDb({ brief_messages: { data: [{ id: 8999 }] } });
    const res = await POST(makePost(inboundEvent()));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("duplicate");
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  // ─── Failure containment ─────────────────────────────────────────

  it("answers 200 (not 500) when the insert rejects the message body", async () => {
    mockSendMessage.mockRejectedValue(new BriefMessageError("Message cannot be empty.", 400));
    const res = await POST(makePost(inboundEvent()));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("message_rejected");
  });

  it("returns 500 on unexpected errors so Resend retries transient outages", async () => {
    mockSendMessage.mockRejectedValue(new Error("connection reset"));
    const res = await POST(makePost(inboundEvent()));
    expect(res.status).toBe(500);
  });
});
