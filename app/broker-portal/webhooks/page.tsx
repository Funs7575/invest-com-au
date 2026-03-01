"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";

export default function WebhooksPage() {
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookInput, setWebhookInput] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("postback_api_key, webhook_url")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (account?.postback_api_key) setApiKey(account.postback_api_key);
      if (account?.webhook_url) {
        setWebhookUrl(account.webhook_url);
        setWebhookInput(account.webhook_url);
      }
      setLoading(false);
    };
    load();
  }, []);

  const saveWebhookUrl = async () => {
    const trimmed = webhookInput.trim();
    if (trimmed && !trimmed.startsWith("https://")) {
      toast("Webhook URL must start with https://", "error");
      return;
    }
    setWebhookSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("broker_accounts")
      .update({ webhook_url: trimmed || null })
      .eq("auth_user_id", user.id);

    setWebhookUrl(trimmed);
    setWebhookSaving(false);
    setWebhookSaved(true);
    toast(trimmed ? "Webhook URL saved" : "Webhook URL removed", "success");
    setTimeout(() => setWebhookSaved(false), 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast("Copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const testEndpoint = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Just test that the API key is valid by making a test request
      const res = await fetch("/api/marketplace/postback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          click_id: "test-click-000",
          event_type: "opened",
        }),
      });

      if (res.status === 403) {
        setTestResult({ success: false, message: "API key is invalid or inactive" });
      } else if (res.status === 404) {
        setTestResult({ success: true, message: "API key is valid! (click_id not found — expected for test)" });
      } else if (res.status === 400) {
        setTestResult({ success: false, message: "Request format error — check your payload" });
      } else if (res.ok) {
        setTestResult({ success: true, message: "Conversion recorded successfully!" });
      } else {
        const data = await res.json();
        setTestResult({ success: false, message: data.error || `HTTP ${res.status}` });
      }
    } catch {
      setTestResult({ success: false, message: "Network error — could not reach endpoint" });
    }
    setTesting(false);
  };

  if (loading) return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://invest.com.au";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Conversion Webhooks</h1>
        <p className="text-sm text-slate-500 mt-1">Configure webhook endpoints to receive real-time notifications about clicks, conversions, and campaign events.</p>
      </div>

      {/* API Key */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <Icon name="key" size={14} className="text-amber-600" />
          </div>
          <h2 className="font-bold text-slate-900">Your API Key</h2>
          <InfoTip text="Include this key in your server-side code to authenticate postback requests. Never expose it client-side." />
        </div>
        <p className="text-xs text-slate-500 mb-3">Include this in the <code className="bg-slate-100 px-1 py-0.5 rounded text-[0.69rem]">X-API-Key</code> header of your postback requests.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-mono text-sm text-slate-700 overflow-x-auto">
            {showKey ? apiKey : "•".repeat(Math.min(apiKey.length, 32))}
          </div>
          <button onClick={() => setShowKey(!showKey)} className="px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <Icon name={showKey ? "eye-off" : "eye"} size={16} />
          </button>
          <button onClick={() => copyToClipboard(apiKey)} className="px-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Outbound Webhook URL */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon name="link" size={14} className="text-blue-600" />
            </div>
            <h2 className="font-bold text-slate-900">Outbound Webhook URL</h2>
            <InfoTip text="We send JSON POST requests to this URL when events occur. Must be a publicly accessible HTTPS endpoint." />
          </div>
          {webhookSaved && <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>}
        </div>
        <p className="text-xs text-slate-500 mb-3">
          When a conversion is recorded via postback, we&apos;ll automatically send a webhook notification to this URL.
          Failed deliveries retry with exponential backoff (up to 5 attempts).
        </p>
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={webhookInput}
            onChange={(e) => setWebhookInput(e.target.value)}
            placeholder="https://yoursite.com/webhooks/invest"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
          />
          <button
            onClick={saveWebhookUrl}
            disabled={webhookSaving || webhookInput === webhookUrl}
            className="px-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0"
          >
            {webhookSaving ? "Saving..." : "Save"}
          </button>
        </div>
        {webhookUrl && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
            <span className="text-xs text-emerald-700">Active — we&apos;ll POST conversion events to this URL</span>
          </div>
        )}
        {!webhookUrl && !webhookInput && (
          <p className="mt-2 text-xs text-slate-400">No webhook configured. Conversions will still be recorded but you won&apos;t receive real-time notifications.</p>
        )}

        {/* Webhook payload example */}
        <details className="mt-3">
          <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700">
            View webhook payload format
          </summary>
          <div className="mt-2 bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
            <pre>{`{
  "event": "conversion",
  "conversion_id": 456,
  "click_id": "uuid-from-redirect",
  "event_type": "funded",
  "conversion_value_cents": 5000,
  "metadata": {},
  "timestamp": "2026-02-25T12:00:00.000Z"
}`}</pre>
          </div>
        </details>
      </div>

      {/* Endpoint Documentation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Icon name="target" size={14} className="text-emerald-600" />
          </div>
          <h2 className="font-bold text-slate-900">Postback Endpoint</h2>
        </div>

        {/* Endpoint URL */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">URL</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">POST</span>
            <code className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 flex-1 overflow-x-auto">
              {baseUrl}/api/marketplace/postback
            </code>
            <button onClick={() => copyToClipboard(`${baseUrl}/api/marketplace/postback`)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Copy
            </button>
          </div>
        </div>

        {/* Headers */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Headers</p>
          <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs space-y-1">
            <div><span className="text-blue-600">Content-Type</span>: application/json</div>
            <div><span className="text-blue-600">X-API-Key</span>: <span className="text-amber-600">your_api_key_here</span></div>
          </div>
        </div>

        {/* Request Body */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Request Body</p>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
            <pre>{`{
  "click_id": "uuid-from-redirect",    // Required: UUID from /go/ redirect
  "event_type": "opened",              // Required: opened | funded | first_trade | custom
  "conversion_value_cents": 0,         // Optional: revenue value in cents
  "metadata": {}                       // Optional: any extra data
}`}</pre>
          </div>
        </div>

        {/* Event Types */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Event Types</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { type: "opened", label: "Account Opened", desc: "User completed account registration" },
              { type: "funded", label: "Account Funded", desc: "User made their first deposit" },
              { type: "first_trade", label: "First Trade", desc: "User executed their first trade" },
              { type: "custom", label: "Custom Event", desc: "Any other trackable event" },
            ].map((evt) => (
              <div key={evt.type} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">{evt.type}</code>
                  <span className="text-xs font-medium text-slate-700">{evt.label}</span>
                </div>
                <p className="text-[0.69rem] text-slate-500 mt-1">{evt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Response */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Response (Success)</p>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
            <pre>{`{
  "success": true,
  "conversion_id": 123,
  "created_at": "2026-02-25T12:00:00.000Z"
}`}</pre>
          </div>
        </div>

        {/* Error Codes */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Error Codes</p>
          <div className="space-y-1">
            {[
              { code: "401", reason: "Missing X-API-Key header" },
              { code: "403", reason: "Invalid or inactive API key / click doesn't belong to your broker" },
              { code: "400", reason: "Invalid JSON or missing required fields" },
              { code: "404", reason: "click_id not found in our system" },
              { code: "500", reason: "Server error — retry with exponential backoff" },
            ].map((err) => (
              <div key={err.code} className="flex items-center gap-2 text-xs">
                <span className="font-mono font-bold text-red-600 w-8">{err.code}</span>
                <span className="text-slate-600">{err.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How Click IDs Work */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
            <Icon name="hash" size={14} className="text-purple-600" />
          </div>
          <h2 className="font-bold text-slate-900">How Click IDs Work</h2>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            When a user clicks through to your site from Invest.com.au, we redirect them via our
            <code className="bg-slate-100 px-1 py-0.5 rounded text-[0.69rem] mx-1">/go/your-slug</code>
            endpoint. This generates a unique <strong>click_id</strong> (UUID).
          </p>
          <p>
            The click_id is appended to your destination URL as a query parameter:
          </p>
          <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
            https://yoursite.com/signup?<span className="text-blue-600">click_id</span>=<span className="text-amber-600">abc123-def456-...</span>
          </div>
          <p>
            Capture this click_id on your end. When a conversion event occurs (account opened, funded, etc.),
            send it back to our postback endpoint with the event details.
          </p>
        </div>
      </div>

      {/* Example Integration */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-2">Example: cURL</h2>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
          <pre>{`curl -X POST ${baseUrl}/api/marketplace/postback \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey ? apiKey.slice(0, 8) + "..." : "your_api_key"}" \\
  -d '{
    "click_id": "captured-click-uuid",
    "event_type": "opened",
    "conversion_value_cents": 0
  }'`}</pre>
        </div>
        <button onClick={() => copyToClipboard(`curl -X POST ${baseUrl}/api/marketplace/postback \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: ${apiKey}" \\\n  -d '{"click_id": "captured-click-uuid", "event_type": "opened"}'`)}
          className="mt-2 text-xs text-slate-500 hover:text-slate-700 transition-colors">
          Copy cURL command
        </button>
      </div>

      {/* Test Endpoint */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon name="zap" size={14} className="text-slate-600" />
          </div>
          <h2 className="font-bold text-slate-900">Test Your API Key</h2>
        </div>
        <p className="text-xs text-slate-500 mb-3">Send a test request to verify your API key is working.</p>
        <button
          onClick={testEndpoint}
          disabled={testing || !apiKey}
          className="px-4 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {testing ? "Testing..." : "Send Test Request"}
        </button>
        {testResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm flex items-center gap-2 ${testResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            <Icon name={testResult.success ? "check-circle" : "x-circle"} size={16} />
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
