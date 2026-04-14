"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getOrCreateSessionId } from "@/lib/form-tracking";

/**
 * Public-facing AI concierge widget.
 *
 * Wave 9 shipped the /api/chatbot endpoint (Claude/OpenAI/stub
 * fallback, RAG over search_embeddings, prompt-injection
 * classifier, persists every turn to chatbot_conversations).
 * This widget is the client counterpart — a floating chat bubble
 * that opens a small chat panel.
 *
 * Behaviour:
 *   - Dismissed position stored in localStorage so a user who
 *     closes it isn't nagged on every page
 *   - Conversation history lives client-side per session_id —
 *     the API is stateless and loads the last N turns on every
 *     call via chatbot_conversations
 *   - Shows retrieval citations under each assistant reply so
 *     users can see what article/broker fed the answer
 *   - Refusal / flagged replies (from the prompt-injection
 *     classifier) render with a distinct amber style
 *
 * Gating: mounted in LayoutShell only when the `chatbot_widget`
 * feature flag is enabled (server-side check via SSR layout).
 */

const SUGGESTED_PROMPTS = [
  "What's a CHESS-sponsored broker?",
  "How do ASX and US trade fees compare?",
  "Do advisors have to be licensed in Australia?",
];

interface Citation {
  type: string;
  id: string;
  title: string;
  score: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  flagged?: boolean;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore dismissed state once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem("chat_dismissed") === "1") {
        setDismissed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-scroll to the latest message when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setSending(true);
      setError(null);
      const userMsg: Message = { role: "user", content: text };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      try {
        const res = await fetch("/api/chatbot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: getOrCreateSessionId(),
            message: text,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.reply || "",
            citations: Array.isArray(data.retrieved)
              ? data.retrieved.slice(0, 3).map(
                  (r: {
                    type: string;
                    id: string;
                    title: string;
                    score: number;
                  }) => ({
                    type: r.type,
                    id: r.id,
                    title: r.title,
                    score: r.score,
                  }),
                )
              : [],
            flagged: !!data.flagged,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't reach the concierge");
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "I ran into a problem reaching the concierge. Please try again in a moment — or explore the compare page, 60-second quiz, or fee calculator. This is general information only, not personal financial advice.",
            flagged: true,
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      send(input);
    },
    [input, send],
  );

  const handleDismiss = useCallback(() => {
    setOpen(false);
    setDismissed(true);
    try {
      window.localStorage.setItem("chat_dismissed", "1");
    } catch {
      // ignore
    }
  }, []);

  if (dismissed && !open) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[9998] w-14 h-14 rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 flex items-center justify-center print:hidden"
          aria-label="Open AI concierge"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="sr-only">Chat</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="chat-heading"
          className="fixed bottom-4 right-4 z-[9998] w-[min(400px,calc(100vw-2rem))] h-[min(620px,calc(100vh-4rem))] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col print:hidden"
        >
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <h2 id="chat-heading" className="text-sm font-bold text-slate-900">
                Invest.com.au concierge
              </h2>
              <p className="text-[0.65rem] text-slate-500">
                General information only — not personal advice
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMessages([])}
                className="text-[0.65rem] text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
                aria-label="Clear conversation"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Minimize chat"
              >
                −
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Dismiss chat"
              >
                ×
              </button>
            </div>
          </header>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            aria-live="polite"
            aria-busy={sending}
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Hi — I&apos;m an AI concierge trained on
                  Invest.com.au&apos;s broker and advisor data. Ask
                  me how something works or what to look for. I
                  don&apos;t give personal advice.
                </p>
                <div className="space-y-1">
                  <p className="text-[0.65rem] text-slate-500 uppercase tracking-wider font-semibold">
                    Try asking:
                  </p>
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => send(prompt)}
                      className="block w-full text-left text-xs px-3 py-2 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-slate-900 text-white"
                      : m.flagged
                        ? "bg-amber-50 text-amber-900 border border-amber-200"
                        : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-[0.65rem] text-slate-500">
                      <span className="font-semibold">Sources:</span>{" "}
                      {m.citations.map((c, idx) => (
                        <span key={idx}>
                          {idx > 0 && " · "}
                          <a
                            href={citationHref(c)}
                            className="underline hover:text-slate-700"
                          >
                            {c.title.slice(0, 40) || c.id}
                          </a>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-500 rounded-2xl px-3 py-2 text-sm">
                  …
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-slate-100 p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about brokers, advisors, fees…"
              maxLength={2000}
              disabled={sending}
              className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none disabled:opacity-50"
              aria-label="Your question"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-3 py-2 rounded bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
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
