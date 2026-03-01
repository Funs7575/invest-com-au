"use client";

import { useState, useEffect, useRef } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";

interface Ticket {
  id: number;
  broker_slug: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: number;
  ticket_id: number;
  sender_type: string;
  sender_name: string | null;
  message: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting_reply: "bg-amber-100 text-amber-800",
  resolved: "bg-slate-100 text-slate-700",
  closed: "bg-slate-100 text-slate-500",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-50 text-slate-600",
  normal: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

const STATUS_OPTIONS = ["open", "in_progress", "waiting_reply", "resolved", "closed"];

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // Ticket detail
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .order("updated_at", { ascending: false });
      setTickets((data || []) as Ticket[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = tickets.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const openCount = tickets.filter((t) => t.status === "open").length;
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length;
  const avgResponseMs = 0; // Would need message data for real SLA tracking

  const openTicket = async (ticket: Ticket) => {
    setActiveTicket(ticket);
    const supabase = createClient();
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages((data || []) as Message[]);
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
        sender_type: "admin",
        sender_name: "Support Team",
        message: reply.trim(),
      })
      .select("*")
      .single();

    if (msg) {
      setMessages((prev) => [...prev, msg as Message]);

      // Update ticket status to waiting_reply
      await supabase
        .from("support_tickets")
        .update({ status: "waiting_reply", updated_at: new Date().toISOString() })
        .eq("id", activeTicket.id);

      setActiveTicket({ ...activeTicket, status: "waiting_reply" });
      setTickets((prev) =>
        prev.map((t) => (t.id === activeTicket.id ? { ...t, status: "waiting_reply" } : t))
      );

      // Send notification to broker
      await supabase.from("broker_notifications").insert({
        broker_slug: activeTicket.broker_slug,
        type: "support_reply",
        title: "Support Reply",
        message: `We've replied to your ticket: "${activeTicket.subject}"`,
        link: "/broker-portal/support",
        is_read: false,
        email_sent: false,
      });
    }

    setReply("");
    setSending(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const updateTicketStatus = async (newStatus: string) => {
    if (!activeTicket) return;
    setUpdatingStatus(true);
    const supabase = createClient();

    await supabase
      .from("support_tickets")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", activeTicket.id);

    setActiveTicket({ ...activeTicket, status: newStatus });
    setTickets((prev) =>
      prev.map((t) => (t.id === activeTicket.id ? { ...t, status: newStatus } : t))
    );

    // Notify broker of status change
    if (newStatus === "resolved" || newStatus === "closed") {
      await supabase.from("broker_notifications").insert({
        broker_slug: activeTicket.broker_slug,
        type: "support_reply",
        title: newStatus === "resolved" ? "Ticket Resolved" : "Ticket Closed",
        message: `Your support ticket "${activeTicket.subject}" has been ${newStatus}.`,
        link: "/broker-portal/support",
        is_read: false,
        email_sent: false,
      });
    }

    setUpdatingStatus(false);
  };

  // Ticket detail view
  if (activeTicket) {
    return (
      <AdminShell>
        <div className="max-w-3xl space-y-4">
          <button
            onClick={() => setActiveTicket(null)}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Back to tickets
          </button>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{activeTicket.subject}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[activeTicket.status]}`}>
                    {activeTicket.status.replace(/_/g, " ")}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[activeTicket.priority]}`}>
                    {activeTicket.priority}
                  </span>
                  <span className="text-xs text-slate-400">
                    #{activeTicket.id} · {activeTicket.broker_slug} · {activeTicket.category}
                  </span>
                </div>
              </div>

              {/* Status controls */}
              <div className="flex gap-2 shrink-0">
                <select
                  value={activeTicket.status}
                  onChange={(e) => updateTicketStatus(e.target.value)}
                  disabled={updatingStatus}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-3 mt-4 max-h-[50vh] overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 ${
                      m.sender_type === "admin" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p className={`text-xs font-medium mb-1 ${m.sender_type === "admin" ? "text-blue-200" : "text-slate-500"}`}>
                      {m.sender_name || (m.sender_type === "admin" ? "Support Team" : "Broker")}
                      <span className="ml-2 font-normal">
                        {new Date(m.created_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                  placeholder="Type your reply..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                />
                <button
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 self-end"
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
            )}
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Support Tickets</h1>
          <p className="text-sm text-slate-500">Support tickets from broker partners. Track and resolve issues.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Tickets</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{tickets.length}</p>
          </div>
          <div className={`rounded-xl border p-4 ${openCount > 0 ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Open</p>
            <p className={`text-2xl font-extrabold mt-1 ${openCount > 0 ? "text-emerald-700" : "text-slate-900"}`}>{openCount}</p>
          </div>
          <div className={`rounded-xl border p-4 ${urgentCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Urgent</p>
            <p className={`text-2xl font-extrabold mt-1 ${urgentCount > 0 ? "text-red-700" : "text-slate-900"}`}>{urgentCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Resolved</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {tickets.filter((t) => t.status === "resolved" || t.status === "closed").length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/30"
            >
              <option value="all">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Priority:</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/30"
            >
              <option value="all">All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
          <span className="text-xs text-slate-400">{filtered.length} ticket(s)</span>
        </div>

        {/* Tickets table */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-500">No tickets found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Broker</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => openTicket(ticket)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      ticket.priority === "urgent" && ticket.status === "open" ? "bg-red-50/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{ticket.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-xs truncate">{ticket.subject}</td>
                    <td className="px-4 py-3 text-slate-600">{ticket.broker_slug}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{ticket.category}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[ticket.status]}`}>
                        {ticket.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">
                      {new Date(ticket.updated_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
