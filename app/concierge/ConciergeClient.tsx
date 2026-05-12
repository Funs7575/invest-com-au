"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import { trackEvent } from "@/lib/tracking";
import { lookupSeed, isFinderKey } from "@/lib/concierge-seeds";
import ConciergeBookingHandoff from "@/components/ConciergeBookingHandoff";

/**
 * Full-page concierge chat UI.
 *
 * Streams responses from /api/concierge via SSE. Persists session_id
 * to localStorage so a page refresh preserves the conversation.
 *
 * The UI deliberately surfaces a "not financial advice" reminder and
 * steers readers to /advisors for personal questions.
 */

interface Citation {
  type: string;
  id: string;
  title: string;
  score: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
  citations?: Citation[];
}

function citationHref(c: Citation): string {
  switch (c.type) {
    case "article":
      return `/article/${c.id}`;
    case "broker":
      return `/broker/${c.id}`;
    case "advisor":
      return `/advisor/${c.id}`;
    case "qa":
      return `/q/${c.id}`;
    default:
      return "#";
  }
}

const STARTERS = [
  "Find me a broker for SMSF with $500k",
  "Compare CommSec vs Stake for US shares",
  "What's the best ETF for beginners?",
  "Explain Significant Investor Visa (SIV)",
  "How does franking work for non-residents?",
];

const SESSION_KEY = "ic_concierge_session_v1";
const PENDING_PROMPT_KEY = "ic_concierge_pending_prompt_v1";
const MAX_PENDING_PROMPT_LEN = 200;

function readPendingPrompt(): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_PROMPT_KEY);
    const clean = raw.replace(/\s+/g, " ").trim().slice(0, MAX_PENDING_PROMPT_LEN);
    return clean || null;
  } catch {
    return null;
  }
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Parse concierge markdown-style links `[label](/href)` into
 * clickable React elements. Deliberately minimal — full markdown
 * parsing would require shipping a library. This covers the
 * primary case the system prompt instructs the model to use.
 */
function renderContent(content: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > lastIndex) {
      parts.push(content.slice(lastIndex, m.index));
    }
    parts.push(
      <Link
        key={`${m.index}-${m[2]}`}
        href={m[2] ?? "/"}
        className="font-bold text-amber-700 underline hover:text-amber-800"
      >
        {m[1]}
      </Link>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return parts;
}


export default function ConciergeClient() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const searchParams = useSearchParams();
  const seedFiredRef = useRef(false);

  // Restore session id on mount and fetch stored history.
  useEffect(() => {
    let cancelled = false;
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored && stored.length <= 120) {
        setSessionId(stored);
        setHydrating(true);
        (async () => {
          try {
            const r = await fetch(
              `/api/concierge?session_id=${encodeURIComponent(stored)}`,
              { cache: "no-store" },
            );
            if (!r.ok) return;
            const json = (await r.json()) as {
              messages?: Array<{ role: "user" | "assistant"; content: string }>;
            };
            if (cancelled || !json.messages?.length) return;
            setMessages(
              json.messages.map((m) => ({ ...m, id: genId() })),
            );
          } catch {
            // offline / blocked — fine, session starts fresh
          } finally {
            if (!cancelled) setHydrating(false);
          }
        })();
      }
    } catch {
      // localStorage blocked — fine, we'll generate server-side.
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Scroll to bottom on new content.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  const send = useCallback(
    async (message: string, opts?: { finder?: string }) => {
      const clean = message.trim();
      if (!clean || streaming) return;
      setError(null);

      const userMsg: Message = {
        role: "user",
        content: clean,
        id: genId(),
      };
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setStreaming(true);

      // Placeholder assistant message that accumulates streamed text.
      const assistantId = genId();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", id: assistantId },
      ]);

      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch("/api/concierge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: clean,
            session_id: sessionId ?? undefined,
            history,
            finder: opts?.finder,
          }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          const body = (await res
            .json()
            .catch(() => ({ error: "Unknown error" }))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const block of events) {
            const line = block.trim();
            if (!line.startsWith("data:")) continue;
            try {
              const json = JSON.parse(line.slice(5).trim()) as
                | { type: "session"; session_id: string }
                | { type: "retrieved"; docs: Citation[] }
                | { type: "delta"; text: string }
                | { type: "done"; tokens_in: number; tokens_out: number }
                | { type: "error"; message: string };

              if (json.type === "session") {
                setSessionId(json.session_id);
                try {
                  localStorage.setItem(SESSION_KEY, json.session_id);
                } catch {
                  // ignore
                }
              } else if (json.type === "retrieved") {
                // Attach the citations to the in-flight assistant
                // message so they render under the reply.
                const docs = Array.isArray(json.docs) ? json.docs.slice(0, 4) : [];
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, citations: docs } : m,
                  ),
                );
              } else if (json.type === "delta") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + json.text }
                      : m,
                  ),
                );
              } else if (json.type === "error") {
                setError(json.message);
              }
            } catch {
              // malformed line — skip
            }
          }
        }
      } catch (err) {
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        if (!aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unexpected error — please try again",
          );
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && m.content.length === 0
                ? { ...m, content: "_(stopped)_" }
                : m,
            ),
          );
        }
      } finally {
        abortRef.current = null;
        setStreaming(false);
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    },
    [streaming, messages, sessionId],
  );

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Auto-fire on first mount when starting fresh. Two sources, in priority order:
  //   1. sessionStorage `ic_concierge_pending_prompt_v1` — the homepage
  //      concierge entry component writes the visitor's free-text question
  //      here, then navigates to /concierge. Same-origin only, so this can't
  //      be planted by a crafted URL.
  //   2. URL `?finder=<key>` — allowlisted starter prompt from deep-links
  //      in /advisors, /advisors/search, post-quiz drop-offs, etc.
  useEffect(() => {
    if (seedFiredRef.current) return;
    if (hydrating) return;
    if (messages.length > 0) return;

    const pending = readPendingPrompt();
    if (pending) {
      seedFiredRef.current = true;
      trackEvent("concierge_seed_fired", {
        finder: null,
        source: "homepage-entry",
        prompt_length: pending.length,
      });
      void send(pending);
      return;
    }

    const finderRaw = searchParams?.get("finder") ?? "";
    if (!isFinderKey(finderRaw)) return;
    const seed = lookupSeed(finderRaw);
    if (!seed) return;
    seedFiredRef.current = true;
    trackEvent("concierge_seed_fired", { finder: finderRaw, source: "auto" });
    void send(seed.prompt, { finder: finderRaw });
    // Intentionally omit `send` from deps — it changes when streaming
    // flips, and seedFiredRef already guards against double-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrating, messages.length, searchParams]);

  const clearSession = useCallback(async () => {
    if (streaming) return;
    const sid = sessionId;
    setMessages([]);
    setError(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setSessionId(null);
    if (sid) {
      try {
        await fetch(`/api/concierge?session_id=${encodeURIComponent(sid)}`, {
          method: "DELETE",
        });
      } catch {
        // server-side deletion best-effort
      }
    }
  }, [streaming, sessionId]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  const canSend = useMemo(
    () => input.trim().length > 0 && !streaming,
    [input, streaming],
  );

  const showHandoff = useMemo(
    () =>
      messages.some(
        (m) => m.role === "assistant" && m.content.trim().length > 0,
      ),
    [messages],
  );
  const firstUserMessage = useMemo(
    () => messages.find((m) => m.role === "user")?.content ?? null,
    [messages],
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-slate-900 text-white py-6 md:py-8">
        <div className="container-custom max-w-4xl">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-400 mb-3"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium">Concierge</span>
          </nav>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold mb-1">
                Investment concierge
              </h1>
              <p className="text-xs md:text-sm text-slate-400 max-w-2xl">
                Ask anything about Australian investing — platforms, funds,
                advisors, SMSF, FIRB, foreign investor rules. Educational
                only, not personal financial advice.
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => void clearSession()}
                disabled={streaming}
                className="text-[11px] font-semibold text-slate-300 hover:text-white disabled:opacity-40 border border-slate-700 hover:border-slate-500 rounded-full px-3 py-1 transition-colors"
              >
                Clear conversation
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="flex-1">
        <div className="container-custom max-w-4xl py-5 md:py-8">
          {/* Messages */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 min-h-[320px] mb-4">
            {hydrating && messages.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                Restoring your last conversation…
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
                  <Icon name="message-circle" size={20} className="text-amber-600" />
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Start with one of these, or ask anything:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 hover:bg-amber-50 hover:text-amber-700 border border-slate-200 hover:border-amber-200 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="space-y-4">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "assistant" && (
                      <div className="w-8 h-8 shrink-0 rounded-full bg-amber-100 flex items-center justify-center">
                        <Icon
                          name="message-circle"
                          size={14}
                          className="text-amber-700"
                        />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-50 border border-slate-200 text-slate-800"
                      }`}
                    >
                      {m.role === "assistant" && m.content.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:300ms]" />
                        </span>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap">
                            {renderContent(m.content)}
                          </p>
                          {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200 text-[0.65rem] text-slate-500">
                              <span className="font-semibold">Sources:</span>{" "}
                              {m.citations.map((c, idx) => (
                                <span key={`${c.type}-${c.id}`}>
                                  {idx > 0 && " · "}
                                  <Link
                                    href={citationHref(c)}
                                    className="underline hover:text-slate-700"
                                  >
                                    {c.title.slice(0, 40) || c.id}
                                  </Link>
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div
              role="alert"
              className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 mb-3"
            >
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about brokers, funds, SMSF, FIRB, ETFs…"
              rows={3}
              maxLength={4000}
              className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 pr-24 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none resize-none"
              disabled={streaming}
            />
            {streaming ? (
              <button
                type="button"
                onClick={stopStream}
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg"
              >
                Stop
                <Icon name="x-circle" size={12} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2 rounded-lg"
              >
                Send
                <Icon name="arrow-right" size={12} />
              </button>
            )}
          </form>

          {showHandoff && (
            <ConciergeBookingHandoff
              firstUserMessage={firstUserMessage}
              sessionId={sessionId}
              messagesCount={messages.length}
            />
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed mt-3">
            <strong>General information only.</strong> The concierge is an AI
            model and may be wrong. Always verify against the source material
            and seek personal advice from a licensed AFSL-authorised adviser
            for any investment decision. Conversations are logged for quality
            review.
          </p>
        </div>
      </section>
    </div>
  );
}
