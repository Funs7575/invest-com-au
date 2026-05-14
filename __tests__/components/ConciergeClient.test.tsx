import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "../components/setup";
import ConciergeClient from "@/app/concierge/ConciergeClient";

vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

function fakeStreamResponse(payloads: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const p of payloads) {
        controller.enqueue(encoder.encode(`data: ${p}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("ConciergeClient — sessionStorage seed + handoff", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    fetchSpy.mockReset();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does NOT show the booking handoff before any assistant reply", async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ messages: [] })));
    render(<ConciergeClient />);
    expect(screen.queryByTestId("concierge-booking-handoff")).not.toBeInTheDocument();
  });

  it("auto-fires the pending prompt from sessionStorage and clears it", async () => {
    sessionStorage.setItem("ic_concierge_pending_prompt_v1", "what is SMSF?");

    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.startsWith("/api/concierge") && (!init || init.method !== "POST")) {
        return Promise.resolve(new Response(JSON.stringify({ messages: [] })));
      }
      // POST: stream a session + done payload back so the component
      // can settle without hanging on an unfinished stream.
      return Promise.resolve(
        fakeStreamResponse([
          JSON.stringify({ type: "session", session_id: "test-session-id" }),
          JSON.stringify({ type: "retrieved", docs: [] }),
          JSON.stringify({ type: "delta", text: "SMSF stands for…" }),
          JSON.stringify({ type: "done", tokens_in: 1, tokens_out: 2 }),
        ]),
      );
    });

    render(<ConciergeClient />);

    await waitFor(() => {
      const postCall = fetchSpy.mock.calls.find(
        (c) => c[0] === "/api/concierge" && c[1]?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body as string) as { message: string };
      expect(body.message).toBe("what is SMSF?");
    });

    // The seed is consumed exactly once.
    expect(sessionStorage.getItem("ic_concierge_pending_prompt_v1")).toBeNull();
  });

  it("shows the booking handoff once an assistant reply has streamed in", async () => {
    sessionStorage.setItem("ic_concierge_pending_prompt_v1", "hello");

    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.startsWith("/api/concierge") && (!init || init.method !== "POST")) {
        return Promise.resolve(new Response(JSON.stringify({ messages: [] })));
      }
      return Promise.resolve(
        fakeStreamResponse([
          JSON.stringify({ type: "session", session_id: "test-session-id" }),
          JSON.stringify({ type: "retrieved", docs: [] }),
          JSON.stringify({ type: "delta", text: "Hi! Here is some info." }),
          JSON.stringify({ type: "done", tokens_in: 1, tokens_out: 2 }),
        ]),
      );
    });

    render(<ConciergeClient />);

    await waitFor(() => {
      expect(screen.getByTestId("concierge-booking-handoff")).toBeInTheDocument();
    });

    const cta = screen.getByTestId("concierge-booking-handoff-cta");
    expect(cta.getAttribute("href")).toContain("source=concierge");
    expect(cta.getAttribute("href")).toContain("seed=hello");
  });
});
