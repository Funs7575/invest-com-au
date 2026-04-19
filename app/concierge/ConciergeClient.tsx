"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * Full-page concierge chat UI.
 *
 * Streams responses from /api/concierge via SSE. Persists session_id
 * to localStorage so a page refresh preserves the conversation.
 *
 * The UI deliberately surfaces a "not financial advice" reminder and
 * steers readers to /advisors for personal questions.
 */

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const STARTERS = [
  "Find me a broker for SMSF with $500k",
  "Compare CommSec vs Stake for US shares",
  "What's the best ETF for beginners?",
  "Explain Significant Investor Visa (SIV)",
  "How does franking work for non-residents?",
];

const SESSION_KEY = "ic_concierge_session_v1";

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
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Restore session id on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored && stored.length <= 120) setSessionId(stored);
    } catch {
      // localStorage blocked — fine, we'll generate server-side.
    }
  }, []);

  // Scroll to bottom on new content.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  const send = useCallback(
    async (message: string) => {
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

      try {
        const res = await fetch("/api/concierge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: clean,
            session_id: sessionId ?? undefined,
            history,
          }),
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
        setError(
          err instanceof Error
            ? err.message
            : "Unexpected error — please try again",
        );
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setStreaming(false);
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    },
    [streaming, messages, sessionId],
  );

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
          <h1 className="text-2xl md:text-3xl font-extrabold mb-1">
            Investment concierge
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-2xl">
            Ask anything about Australian investing — platforms, funds,
            advisors, SMSF, FIRB, foreign investor rules. Educational only,
            not personal financial advice.
          </p>
        </div>
      </section>

      <section className="flex-1">
        <div className="container-custom max-w-4xl py-5 md:py-8">
          {/* Messages */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 min-h-[320px] mb-4">
            {messages.length === 0 ? (
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
                        <p className="whitespace-pre-wrap">
                          {renderContent(m.content)}
                        </p>
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
            <button
              type="submit"
              disabled={!canSend}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2 rounded-lg"
            >
              {streaming ? "Thinking…" : "Send"}
              <Icon name="arrow-right" size={12} />
            </button>
          </form>

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
