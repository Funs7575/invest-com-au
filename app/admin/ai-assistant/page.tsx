"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import AdminShell from "@/components/AdminShell";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: string[];
}

const SUGGESTIONS = [
  "What are today's key stats?",
  "Show me pending moderation items",
  "Approve all pending user reviews",
  "Which brokers are missing affiliate URLs?",
  "Disable the weekly-newsletter automation",
  "Unsubscribe user@example.com",
  "What's the latest Vercel deployment status?",
  "Publish article [id] to live",
];

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTools]);

  const toolLabel: Record<string, string> = {
    get_site_stats: "Fetching site stats",
    query_table: "Querying database",
    get_pending_moderation: "Checking moderation queue",
    get_vercel_status: "Checking Vercel deployments",
    get_vercel_env_vars: "Reading env vars",
    trigger_redeploy: "Triggering redeploy",
    get_stripe_overview: "Fetching Stripe data",
    get_recent_activity: "Loading recent activity",
    approve_moderation_item: "Moderating item",
    update_broker: "Updating broker",
    publish_article: "Publishing article",
    toggle_autopilot: "Toggling automation",
    manage_subscriber: "Managing subscriber",
  };

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setActiveTools([]);

    // Build API messages (exclude toolCalls metadata)
    const apiMessages = newMessages.map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/admin/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.error}` }]);
        return;
      }

      // Stream response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      const toolsUsed: string[] = [];

      setMessages((prev) => [...prev, { role: "assistant", content: "", toolCalls: [] }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "text") {
              assistantText += event.delta;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantText,
                  toolCalls: toolsUsed,
                };
                return updated;
              });
            }

            if (event.type === "tool_start") {
              const label = toolLabel[event.name] ?? event.name;
              setActiveTools((prev) => [...prev, label]);
            }

            if (event.type === "tool_done") {
              const label = toolLabel[event.name] ?? event.name;
              setActiveTools((prev) => prev.filter((t) => t !== label));
              if (!toolsUsed.includes(event.name)) toolsUsed.push(event.name);
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  toolCalls: [...toolsUsed],
                };
                return updated;
              });
            }

            if (event.type === "error") {
              assistantText += `\n\n⚠️ ${event.message}`;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantText, toolCalls: toolsUsed };
                return updated;
              });
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Connection error: ${err instanceof Error ? err.message : "Unknown error"}`,
      }]);
    } finally {
      setLoading(false);
      setActiveTools([]);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm">
            ✦
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">AI Assistant</h1>
            <p className="text-xs text-slate-500">Claude Opus · Access to Supabase, Vercel, Stripe &amp; Resend</p>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-center">
              <div>
                <div className="text-5xl mb-3">✦</div>
                <p className="text-slate-500 text-sm max-w-sm">
                  Ask me anything about your site — stats, deployments, content, revenue, or pending tasks.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left text-xs px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                      ✦
                    </div>
                  )}
                  <div className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {msg.toolCalls.map((t) => (
                          <span key={t} className="text-[0.6rem] px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-200 rounded-full">
                            {toolLabel[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-slate-900 text-white rounded-tr-sm"
                          : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
                      }`}
                    >
                      {msg.content || (loading && i === messages.length - 1 ? (
                        <span className="flex gap-1 items-center text-slate-400">
                          <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      ) : "…")}
                    </div>
                  </div>
                </div>
              ))}

              {/* Active tool indicators */}
              {activeTools.length > 0 && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 opacity-50">
                    ✦
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {activeTools.map((t) => (
                      <span key={t} className="text-xs px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-slate-200 pt-4">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-white placeholder-slate-400"
              style={{ minHeight: "42px", maxHeight: "120px" }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-[42px] w-[42px] flex items-center justify-center bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L14 8M14 8L9 3M14 8L9 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <p className="text-[0.6rem] text-slate-400 mt-1.5 text-center">
            Claude Opus 4.6 · Live access to Supabase + Vercel · Actions may have real effects
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
