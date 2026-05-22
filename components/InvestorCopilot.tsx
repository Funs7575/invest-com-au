"use client";

import { useState, useRef, useEffect } from "react";
import Icon from "@/components/Icon";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "What's a good savings account rate right now?",
  "How do term deposits work?",
  "What's the difference between savings accounts and term deposits?",
];

export default function InvestorCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && messages.length === 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/investor/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (res.status === 429) {
        setError("You're sending messages too quickly. Please wait a moment.");
        setMessages(messages);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        setMessages(messages);
        setLoading(false);
        return;
      }

      const data = (await res.json()) as { reply?: string; error?: string };
      if (data.reply) {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } else {
        setError("No response received. Please try again.");
        setMessages(messages);
      }
    } catch {
      setError("Connection error. Please try again.");
      setMessages(messages);
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        aria-label={open ? "Close assistant" : "Ask a question"}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        style={{ height: 52, width: 52 }}
      >
        <Icon name={open ? "x" : "message-circle"} size={22} />
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-40 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[380px]"
          style={{ maxHeight: "min(520px, calc(100vh - 100px))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                <Icon name="zap" size={14} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">Invest Assistant</p>
                <p className="text-[0.6rem] text-white/50 mt-0.5">General info only — not advice</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Close"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 text-center py-2">
                  Ask me anything about Australian savings rates and deposits.
                </p>
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => send(p)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-slate-900 text-white rounded-br-sm"
                      : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1 items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-3 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about rates, accounts…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0 disabled:opacity-50"
              style={{ maxHeight: 80 }}
            />
            <button
              type="button"
              disabled={!input.trim() || loading}
              onClick={() => send(input)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-colors disabled:opacity-40"
              aria-label="Send"
            >
              <Icon name="send" size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
