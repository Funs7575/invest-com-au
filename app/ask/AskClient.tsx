"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface Retrieved {
  source: string;
  title?: string;
  url?: string;
  snippet?: string;
}

interface AskResponse {
  reply: string;
  retrieved: Retrieved[];
  flagged?: boolean;
  flaggedReason?: string;
}

interface Props {
  suggestedQuestions: string[];
}

// FIN_NOTEBOOK Revenue #7 — public Q&A client widget. Wraps the
// existing /api/chatbot route (which is already rate-limited via
// lib/rate-limit-db) and adds the suggested-question chips so the
// page has internal-link CTR even for visitors who don't type.
export default function AskClient({ suggestedQuestions }: Props) {
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [retrieved, setRetrieved] = useState<Retrieved[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replyRegionRef = useRef<HTMLDivElement | null>(null);

  const send = useCallback(
    async (message: string) => {
      if (!message.trim() || sending) return;
      setSending(true);
      setError(null);
      setTurns((prev) => [...prev, { role: "user", content: message }]);

      try {
        const res = await fetch("/api/chatbot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            message,
          }),
        });
        if (res.status === 429) {
          throw new Error("You're sending too fast. Wait a moment and try again.");
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const body = (await res.json()) as AskResponse;
        setTurns((prev) => [...prev, { role: "assistant", content: body.reply }]);
        setRetrieved(body.retrieved || []);
        if (body.flagged) {
          setError(
            `Heads up: ${body.flaggedReason || "your question was flagged for review"}. The assistant kept it general.`,
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
        setTurns((prev) => prev.slice(0, -1));
      } finally {
        setSending(false);
      }
    },
    [sessionId, sending],
  );

  useEffect(() => {
    if (turns.length > 0 && replyRegionRef.current) {
      replyRegionRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [turns.length]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {turns.length === 0 ? (
        <>
          <p className="text-sm font-semibold text-slate-900 mb-2">Try a question:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestedQuestions.slice(0, 6).map((q) => (
              <button
                key={q}
                onClick={() => {
                  setInput(q);
                  void send(q);
                }}
                disabled={sending}
                className="text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 px-3 py-1.5 rounded-full"
              >
                {q}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div
          ref={replyRegionRef}
          aria-live="polite"
          className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto"
        >
          {turns.map((t, i) => (
            <div
              key={i}
              className={`rounded-xl px-4 py-3 text-sm ${
                t.role === "user"
                  ? "bg-emerald-50 text-emerald-900 ml-6"
                  : "bg-slate-50 text-slate-900 mr-6 whitespace-pre-wrap"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-1">
                {t.role === "user" ? "You" : "Assistant"}
              </p>
              <p>{t.content}</p>
            </div>
          ))}
          {sending && (
            <div className="rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-500 mr-6 italic">
              Thinking…
            </div>
          )}
          {retrieved.length > 0 && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-900">
              <p className="font-semibold mb-1">References used:</p>
              <ul className="space-y-1">
                {retrieved.slice(0, 5).map((r, i) => (
                  <li key={i}>
                    {r.url ? (
                      <a href={r.url} className="underline" target="_blank" rel="noopener noreferrer">
                        {r.title || r.source}
                      </a>
                    ) : (
                      <span>{r.title || r.source}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
          setInput("");
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          maxLength={500}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Ask
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
