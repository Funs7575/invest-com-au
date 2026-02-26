"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import type { SupportTicket, SupportMessage } from "@/lib/types";

const CATEGORIES = [
  { value: "billing", label: "Billing & Payments" },
  { value: "campaigns", label: "Campaigns" },
  { value: "technical", label: "Technical Issue" },
  { value: "account", label: "Account" },
  { value: "general", label: "General Inquiry" },
] as const;

const STATUS_STYLES: Record<string, { bg: string; icon: string }> = {
  open: { bg: "bg-green-100 text-green-800", icon: "alert-circle" },
  in_progress: { bg: "bg-blue-100 text-blue-800", icon: "clock" },
  waiting_reply: { bg: "bg-amber-100 text-amber-800", icon: "message-circle" },
  resolved: { bg: "bg-slate-100 text-slate-700", icon: "check-circle" },
  closed: { bg: "bg-slate-100 text-slate-500", icon: "x-circle" },
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-50 text-slate-600",
  normal: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [brokerSlug, setBrokerSlug] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const { toast } = useToast();

  // Create ticket
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [priority, setPriority] = useState<string>("normal");
  const [initialMessage, setInitialMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // View ticket
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug, full_name, company_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!account) return;

      setBrokerSlug(account.broker_slug);
      setBrokerName(account.full_name || account.company_name || "");

      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("broker_slug", account.broker_slug)
        .order("updated_at", { ascending: false });

      setTickets((data || []) as SupportTicket[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim()) return;
    setSaving(true);

    const supabase = createClient();

    // Create ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .insert({
        broker_slug: brokerSlug,
        subject: subject.trim(),
        category,
        priority,
        status: "open",
      })
      .select("*")
      .single();

    if (ticketErr || !ticket) {
      toast("Failed to create ticket", "error");
      setSaving(false);
      return;
    }

    // Add initial message
    await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      sender_type: "broker",
      sender_name: brokerName,
      message: initialMessage.trim(),
    });

    toast("Ticket created — we'll respond within 24 hours", "success");
    setTickets(prev => [ticket as SupportTicket, ...prev]);
    setShowCreate(false);
    setSubject("");
    setInitialMessage("");
    setSaving(false);
  };

  const openTicket = async (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    const supabase = createClient();
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages((data || []) as SupportMessage[]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendReply = async () => {
    if (!reply.trim() || !activeTicket) return;
    setSending(true);

    const supabase = createClient();
    const { data: msg } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: activeTicket.id,
        sender_type: "broker",
        sender_name: brokerName,
        message: reply.trim(),
      })
      .select("*")
      .single();

    if (msg) {
      setMessages(prev => [...prev, msg as SupportMessage]);

      // If resolved, reopen the ticket; if waiting_reply, mark as in_progress (broker replied)
      if (activeTicket.status === "resolved") {
        await supabase
          .from("support_tickets")
          .update({ status: "open", updated_at: new Date().toISOString() })
          .eq("id", activeTicket.id);
        setActiveTicket({ ...activeTicket, status: "open" });
        setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, status: "open" as const } : t));
      } else if (activeTicket.status === "waiting_reply") {
        await supabase
          .from("support_tickets")
          .update({ status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", activeTicket.id);
        setActiveTicket({ ...activeTicket, status: "in_progress" });
        setTickets(prev => prev.map(t => t.id === activeTicket.id ? { ...t, status: "in_progress" as const } : t));
      }
    }

    setReply("");
    setSending(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  if (loading) return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;

  // Ticket detail view
  if (activeTicket) {
    return (
      <div className="max-w-2xl space-y-4">
        <button onClick={() => setActiveTicket(null)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <Icon name="arrow-left" size={14} /> Back to tickets
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{activeTicket.subject}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[activeTicket.status]?.bg}`}>
                  <Icon name={STATUS_STYLES[activeTicket.status]?.icon || "info"} size={11} />
                  {activeTicket.status.replace(/_/g, " ")}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[activeTicket.priority]}`}>
                  {activeTicket.priority}
                </span>
                <span className="text-xs text-slate-400">
                  #{activeTicket.id} · {CATEGORIES.find(c => c.value === activeTicket.category)?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3 mt-4 max-h-[50vh] overflow-y-auto">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender_type === "broker" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  m.sender_type === "broker"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}>
                  <p className={`text-xs font-medium mb-1 ${m.sender_type === "broker" ? "text-slate-300" : "text-slate-500"}`}>
                    {m.sender_name || (m.sender_type === "broker" ? "You" : "Support Team")}
                    <span className="ml-2 font-normal">
                      {new Date(m.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply */}
          {activeTicket.status !== "closed" && (
            <div className="mt-4 flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 resize-none"
                placeholder="Type your message..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
              />
              <button onClick={sendReply} disabled={!reply.trim() || sending}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 self-end">
                {sending ? "..." : "Send"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const openCount = tickets.filter(t => t.status === "open" || t.status === "in_progress" || t.status === "waiting_reply").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Support</h1>
          <p className="text-sm text-slate-500">Get help from our partner support team</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
          <Icon name="plus" size={14} />
          New Ticket
        </button>
      </div>

      {/* KPI Cards */}
      {tickets.length > 0 && (
        <div className="grid grid-cols-3 gap-4 portal-stagger">
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Icon name="message-circle" size={14} className="text-amber-600" />
              </div>
              <span className="text-xs font-medium text-slate-500">Open</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900">{openCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                <Icon name="check-circle" size={14} className="text-green-600" />
              </div>
              <span className="text-xs font-medium text-slate-500">Resolved</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900">{resolvedCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon name="bar-chart" size={14} className="text-blue-600" />
              </div>
              <span className="text-xs font-medium text-slate-500">Total</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900">{tickets.length}</p>
          </div>
        </div>
      )}

      {/* Create ticket form */}
      {showCreate && (
        <form onSubmit={handleCreateTicket} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4" style={{ animation: "resultCardIn 0.3s ease-out" }}>
          <h3 className="font-bold text-slate-900">Submit a Support Ticket</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
              placeholder="Brief description of your issue" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 bg-white">
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 bg-white">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
            <textarea value={initialMessage} onChange={(e) => setInitialMessage(e.target.value)} required
              rows={4}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 resize-none"
              placeholder="Describe your issue in detail..." />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
              {saving ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      )}

      {/* Tickets list */}
      {tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <Icon name="message-circle" size={20} className="text-blue-500" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">No support tickets</p>
          <p className="text-xs text-slate-400 mb-4">
            Need help? Create a ticket and we&apos;ll respond within 24 hours.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 portal-stagger">
          {tickets.map(ticket => (
            <button key={ticket.id} onClick={() => openTicket(ticket)}
              className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-50 transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">{ticket.subject}</p>
                  <span className={`inline-flex items-center gap-1 text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[ticket.status]?.bg}`}>
                    <Icon name={STATUS_STYLES[ticket.status]?.icon || "info"} size={10} />
                    {ticket.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  #{ticket.id} · {CATEGORIES.find(c => c.value === ticket.category)?.label} · {new Date(ticket.updated_at).toLocaleDateString("en-AU")}
                </p>
              </div>
              <Icon name="chevron-right" size={16} className="text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
