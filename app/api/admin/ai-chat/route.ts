import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VERCEL_PROJECT_ID = "prj_miPLXyjwXbqNnGLOFijBHbjXWESY";

const SYSTEM_PROMPT = `You are an AI operations assistant for invest.com.au — an Australian investment platform that helps users compare brokers (ETF, share trading, super), find financial advisors, access educational content, and manage investments.

You have direct access to:
- **Supabase database** (brokers, articles, subscribers, clicks, advisors, reviews, etc.)
- **Vercel** (deployments, environment variables, redeployment)
- **Stripe** (subscriptions, revenue — when keys are configured)
- **Resend** (email — when keys are configured)

You help the admin:
- Answer questions about site data ("how many brokers do we have?", "show me recent clicks")
- Monitor deployments and site health
- Manage content pipeline (pending articles, reviews, advisors)
- Track revenue and subscribers
- Trigger deploys or config changes
- Run queries to debug issues

Always be concise and actionable. When querying data, summarise the key insights rather than dumping raw data. If a tool fails due to missing credentials, explain what env var is needed.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_site_stats",
    description: "Get key site metrics: broker count, articles, total clicks, subscribers, advisors, pro members, marketplace revenue.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "query_table",
    description: "Query a Supabase table with optional filters. Use for detailed lookups.",
    input_schema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Table name (e.g. brokers, articles, affiliate_clicks, email_captures, professionals, user_reviews, advisor_articles, campaigns)",
        },
        select: { type: "string", description: "Columns to select (default: *). Use count for counting." },
        filters: {
          type: "array",
          description: "Array of filter conditions",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              operator: { type: "string", enum: ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in"] },
              value: {},
            },
            required: ["column", "operator", "value"],
          },
        },
        order_by: { type: "string", description: "Column to order by" },
        order_desc: { type: "boolean", description: "Order descending (default true)" },
        limit: { type: "number", description: "Max rows to return (default 20, max 100)" },
      },
      required: ["table"],
    },
  },
  {
    name: "get_pending_moderation",
    description: "Get all items awaiting moderation: articles, reviews, switch stories, advisor applications, advisor reviews.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_vercel_status",
    description: "Get recent Vercel deployments and current production status.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of deployments to fetch (default 5)" },
      },
      required: [],
    },
  },
  {
    name: "get_vercel_env_vars",
    description: "List environment variables configured in Vercel (values are masked).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "trigger_redeploy",
    description: "Trigger a new Vercel production deployment from the latest commit.",
    input_schema: {
      type: "object",
      properties: {
        confirm: { type: "boolean", description: "Must be true to confirm the redeploy" },
      },
      required: ["confirm"],
    },
  },
  {
    name: "get_stripe_overview",
    description: "Get Stripe revenue and subscription overview.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_recent_activity",
    description: "Get recent site activity: clicks, new subscribers, new reviews, recent articles.",
    input_schema: {
      type: "object",
      properties: {
        hours: { type: "number", description: "Lookback window in hours (default 24)" },
      },
      required: [],
    },
  },
];

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const supabase = createAdminClient();

  try {
    switch (name) {
      case "get_site_stats": {
        const [brokers, articles, clicks, emails, advisors, proSubs, campaigns] = await Promise.all([
          supabase.from("brokers").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }),
          supabase.from("email_captures").select("id", { count: "exact", head: true }),
          supabase.from("professionals").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.rpc("get_active_pro_count").then(r => r, () => ({ data: 0 })),
          supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
        ]);

        const todayStart = new Date().toISOString().split("T")[0];
        const { count: clicksToday } = await supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true })
          .gte("clicked_at", todayStart);

        return JSON.stringify({
          active_brokers: brokers.count,
          published_articles: articles.count,
          total_clicks: clicks.count,
          clicks_today: clicksToday,
          email_subscribers: emails.count,
          active_advisors: advisors.count,
          pro_members: proSubs.data ?? 0,
          active_campaigns: campaigns.count,
        });
      }

      case "query_table": {
        const { table, select = "*", filters = [], order_by, order_desc = true, limit = 20 } = input as {
          table: string; select?: string; filters?: { column: string; operator: string; value: unknown }[];
          order_by?: string; order_desc?: boolean; limit?: number;
        };

        const allowedTables = [
          "brokers", "articles", "affiliate_clicks", "email_captures", "professionals",
          "professional_leads", "user_reviews", "advisor_articles", "campaigns",
          "campaign_events", "scenarios", "quiz_questions", "fee_update_queue",
          "lead_disputes", "advisor_applications", "switch_stories", "analytics_events",
          "audit_log", "subscriptions",
        ];

        if (!allowedTables.includes(table)) {
          return `Error: Table "${table}" is not accessible. Allowed tables: ${allowedTables.join(", ")}`;
        }

        const clampedLimit = Math.min(limit, 100);
        let query = supabase.from(table).select(select, select.includes("count") ? { count: "exact" } : undefined);

        for (const f of filters) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = (query as any)[f.operator](f.column, f.value);
        }

        if (order_by) query = query.order(order_by, { ascending: !order_desc });
        query = query.limit(clampedLimit);

        const { data, count, error } = await query;
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ count, rows: data });
      }

      case "get_pending_moderation": {
        const [articles, reviews, stories, applications, advisorReviews, disputes, feeChanges] = await Promise.all([
          supabase.from("advisor_articles").select("id, title, author_name, created_at", { count: "exact" }).eq("status", "submitted").limit(10),
          supabase.from("user_reviews").select("id, display_name, broker_slug, rating, created_at", { count: "exact" }).eq("status", "pending").limit(10),
          supabase.from("switch_stories").select("id, name, from_broker, to_broker, created_at", { count: "exact" }).eq("status", "pending").limit(10),
          supabase.from("advisor_applications").select("id, full_name, email, created_at", { count: "exact" }).eq("status", "pending").limit(10),
          supabase.from("professional_reviews").select("id, reviewer_name, created_at", { count: "exact" }).eq("status", "pending").limit(5),
          supabase.from("lead_disputes").select("id, reason, created_at", { count: "exact" }).eq("status", "pending").limit(5),
          supabase.from("fee_update_queue").select("id, broker_name, created_at", { count: "exact" }).eq("status", "pending").limit(5),
        ]);

        return JSON.stringify({
          advisor_articles: { count: articles.count, items: articles.data },
          user_reviews: { count: reviews.count, items: reviews.data },
          switch_stories: { count: stories.count, items: stories.data },
          advisor_applications: { count: applications.count, items: applications.data },
          advisor_reviews: { count: advisorReviews.count, items: advisorReviews.data },
          lead_disputes: { count: disputes.count, items: disputes.data },
          fee_changes: { count: feeChanges.count, items: feeChanges.data },
        });
      }

      case "get_vercel_status": {
        const token = process.env.VERCEL_API_TOKEN;
        if (!token) return "Error: VERCEL_API_TOKEN env var not set.";

        const limit = (input.limit as number) ?? 5;
        const res = await fetch(
          `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=${limit}&target=production`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();

        if (!res.ok) return `Vercel API error: ${JSON.stringify(data)}`;

        const deployments = (data.deployments ?? []).map((d: { uid: string; state: string; createdAt: number; url: string; meta?: { githubCommitMessage?: string } }) => ({
          id: d.uid,
          state: d.state,
          created: new Date(d.createdAt).toISOString(),
          url: `https://${d.url}`,
          commit: d.meta?.githubCommitMessage ?? "—",
        }));

        return JSON.stringify({ deployments });
      }

      case "get_vercel_env_vars": {
        const token = process.env.VERCEL_API_TOKEN;
        if (!token) return "Error: VERCEL_API_TOKEN env var not set.";

        const res = await fetch(
          `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!res.ok) return `Vercel API error: ${JSON.stringify(data)}`;

        const envs = (data.envs ?? []).map((e: { key: string; type: string; target: string[] }) => ({
          key: e.key,
          type: e.type,
          target: e.target,
        }));

        return JSON.stringify({ total: envs.length, env_vars: envs });
      }

      case "trigger_redeploy": {
        if (!input.confirm) return "Redeploy cancelled — set confirm: true to proceed.";

        const token = process.env.VERCEL_API_TOKEN;
        if (!token) return "Error: VERCEL_API_TOKEN env var not set.";

        // Get latest deployment to redeploy from
        const listRes = await fetch(
          `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=1&target=production`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const listData = await listRes.json();
        const latestId = listData.deployments?.[0]?.uid;
        if (!latestId) return "Error: Could not find a deployment to redeploy from.";

        const res = await fetch("https://api.vercel.com/v13/deployments", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "invest-com-au", deploymentId: latestId, target: "production" }),
        });
        const data = await res.json();
        if (!res.ok) return `Vercel API error: ${JSON.stringify(data)}`;

        return JSON.stringify({ message: "Redeploy triggered", deploy_id: data.id, state: data.readyState, url: data.url });
      }

      case "get_stripe_overview": {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) return "Stripe is not configured yet. Set STRIPE_SECRET_KEY in Vercel environment variables.";

        const [balanceRes, subsRes] = await Promise.all([
          fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${key}` } }),
          fetch("https://api.stripe.com/v1/subscriptions?status=active&limit=1", { headers: { Authorization: `Bearer ${key}` } }),
        ]);

        const balance = await balanceRes.json();
        const subs = await subsRes.json();

        return JSON.stringify({
          available_aud: (balance.available?.find((b: { currency: string }) => b.currency === "aud")?.amount ?? 0) / 100,
          available_usd: (balance.available?.find((b: { currency: string }) => b.currency === "usd")?.amount ?? 0) / 100,
          active_subscriptions: subs.data?.length ? "see Stripe dashboard for full count" : 0,
        });
      }

      case "get_recent_activity": {
        const hours = (input.hours as number) ?? 24;
        const since = new Date(Date.now() - hours * 3600000).toISOString();

        const [clicks, emails, reviews] = await Promise.all([
          supabase.from("affiliate_clicks").select("broker_name, source, page, clicked_at").gte("clicked_at", since).order("clicked_at", { ascending: false }).limit(10),
          supabase.from("email_captures").select("email, source, captured_at").gte("captured_at", since).order("captured_at", { ascending: false }).limit(10),
          supabase.from("user_reviews").select("display_name, broker_slug, rating, status, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        ]);

        return JSON.stringify({
          window_hours: hours,
          affiliate_clicks: { count: clicks.data?.length, items: clicks.data },
          new_subscribers: { count: emails.data?.length, items: emails.data },
          new_reviews: { count: reviews.data?.length, items: reviews.data },
        });
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as { messages: Anthropic.MessageParam[] };

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let currentMessages = [...messages];

          // Agentic loop — keep going until end_turn
          for (let iteration = 0; iteration < 10; iteration++) {
            const response = await anthropic.messages.create({
              model: "claude-opus-4-6",
              max_tokens: 4096,
              thinking: { type: "adaptive" },
              system: SYSTEM_PROMPT,
              tools: TOOLS,
              messages: currentMessages,
              stream: true,
            });

            let stopReason = "end_turn";
            const contentBlocks: Anthropic.ContentBlock[] = [];
            let currentBlockIndex = -1;
            let currentBlockType = "";
            let accumulatedText = "";
            let accumulatedInput = "";

            for await (const event of response) {
              if (event.type === "content_block_start") {
                currentBlockIndex = event.index;
                currentBlockType = event.content_block.type;
                accumulatedText = "";
                accumulatedInput = "";

                if (event.content_block.type === "tool_use") {
                  send({ type: "tool_start", name: event.content_block.name, id: event.content_block.id });
                  contentBlocks[currentBlockIndex] = { ...event.content_block, input: {} };
                } else if (event.content_block.type === "text") {
                  contentBlocks[currentBlockIndex] = { type: "text", text: "", citations: [] };
                } else if (event.content_block.type === "thinking") {
                  contentBlocks[currentBlockIndex] = { type: "thinking", thinking: "", signature: "" };
                }
              }

              if (event.type === "content_block_delta") {
                if (event.delta.type === "text_delta") {
                  accumulatedText += event.delta.text;
                  (contentBlocks[currentBlockIndex] as Anthropic.TextBlock).text = accumulatedText;
                  send({ type: "text", delta: event.delta.text });
                } else if (event.delta.type === "input_json_delta") {
                  accumulatedInput += event.delta.partial_json;
                } else if (event.delta.type === "thinking_delta") {
                  (contentBlocks[currentBlockIndex] as Anthropic.ThinkingBlock).thinking += event.delta.thinking;
                } else if (event.delta.type === "signature_delta") {
                  (contentBlocks[currentBlockIndex] as Anthropic.ThinkingBlock).signature += event.delta.signature;
                }
              }

              if (event.type === "content_block_stop") {
                if (currentBlockType === "tool_use" && accumulatedInput) {
                  try {
                    (contentBlocks[currentBlockIndex] as Anthropic.ToolUseBlock).input = JSON.parse(accumulatedInput);
                  } catch {
                    (contentBlocks[currentBlockIndex] as Anthropic.ToolUseBlock).input = {};
                  }
                }
              }

              if (event.type === "message_delta") {
                stopReason = event.delta.stop_reason ?? "end_turn";
              }
            }

            // Filter out empty blocks
            const validBlocks = contentBlocks.filter(Boolean);

            if (stopReason !== "tool_use") {
              send({ type: "done" });
              controller.close();
              return;
            }

            // Execute tool calls
            currentMessages = [
              ...currentMessages,
              { role: "assistant", content: validBlocks },
            ];

            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of validBlocks) {
              if (block.type !== "tool_use") continue;

              send({ type: "tool_running", name: block.name });
              const result = await executeTool(block.name, block.input as Record<string, unknown>);
              send({ type: "tool_done", name: block.name });

              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: result,
              });
            }

            currentMessages.push({ role: "user", content: toolResults });
          }

          send({ type: "done" });
          controller.close();
        } catch (err) {
          send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
