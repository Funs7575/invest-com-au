# QQ-01 — Public AI Q&A Capture: Capability Audit

**Stream:** QQ — Public AI Q&A capture surface  
**Item:** QQ-01  
**Authored:** 2026-05-11 (iter 375)  
**Purpose:** Document the existing AI API surface, identify what is safe to expose
publicly, and list the admin-only assumptions that must be replaced for the
`/answers/<slug>` model.

---

## 1. Existing modules surveyed

| Module | LOC | Role |
|--------|-----|------|
| `lib/chatbot.ts` | 367 | Core RAG + provider dispatch + classifier |
| `lib/embeddings.ts` | 199 | Text embedding (OpenAI / stub) |
| `lib/ai-cost-caps.ts` | 343 | Per-subject + global daily spend caps |
| `app/api/chatbot/route.ts` | 105 | Admin/internal multi-turn chatbot |
| `app/api/concierge/route.ts` | ~430 | Public streaming concierge (feature-flagged) |
| `app/api/admin/ai-chat/route.ts` | n/a | Admin agent (cost-capped, admin-gated) |

---

## 2. Safe-to-expose-publicly subset

### 2.1 Pure functions — safe with no modification

| Export | Location | Why safe |
|--------|----------|----------|
| `classifyUserMessage(msg)` | `lib/chatbot.ts` | Pure: no I/O, no auth context, returns `{ flagged, reason }`. Already used by the public concierge. |
| `buildChatPrompt(inputs)` | `lib/chatbot.ts` | Pure: builds the Claude/OpenAI message array. No I/O. |
| `selectChatProvider()` | `lib/chatbot.ts` | Pure: reads env vars. |
| `embedText(text)` | `lib/embeddings.ts` | No auth context; reads only `OPENAI_API_KEY`. Falls back to stub. |
| `embedBatch(texts)` | `lib/embeddings.ts` | Same as above. |

### 2.2 Cost-cap infrastructure — must use, not modify

The concierge already models the correct pattern:

```
preCheckCaps(subjectId, cfg)   → verdict (allowed / rejected)
recordUsage({ subjectId, cfg, model, tokensIn, tokensOut })
capRejectionPayload(verdict, cfg)  → { status:429, body, headers }
```

The `RouteConfig.route` field is currently a union of `"concierge" | "admin_agent"`.
**QQ-02 must add `"qa_capture"` to this union** and add a new
`loadQaCaptureConfig()` function with separate env vars:
- `AI_QA_USER_DAILY_USD` (default: $2/day/IP — lower than concierge's $5)
- `AI_QA_GLOBAL_USD` (default: $50/day — separate budget line)

This keeps the QA spend isolated from the concierge spend in `ai_token_usage`.

---

## 3. Admin-only assumptions that break for public callers

### 3.1 `respondToMessage()` — do NOT call from public route

`respondToMessage()` in `lib/chatbot.ts` has three admin-only assumptions:

1. **Conversation history via admin client:** loads prior turns from
   `chatbot_conversations` using `createAdminClient()`. The QA surface is
   one-shot (question → answer page), not conversational — this assumption
   is irrelevant but the admin client call is still a problem.

2. **RAG retrieval via admin client:** `retrieveContext()` (unexported, lines
   173–197) calls `createAdminClient()` to query `search_embeddings_knn`. For
   the new public QA route, the retrieval must either:
   - Use the server (user) client if `search_embeddings` has an anon SELECT
     policy, **or**
   - Use admin client but only for the read-only `search_embeddings_knn` RPC
     (currently the only call here — defensible under the admin.ts scope rules
     for "public read tables with no anon SELECT policy").
   - **Action needed (QQ-02):** check `search_embeddings` RLS before choosing.

3. **`chatbot_conversations` table write:** The new public QA flow writes to
   `qa_answers` (QQ-02 migration), NOT to `chatbot_conversations`. The admin
   chatbot table stays admin-only.

### 3.2 Rate limiting — different key for public

- `/api/chatbot`: session-keyed, 20 req/min (token-bucket via `isAllowed`)
- `/api/concierge`: IP-keyed, 30 req/10min
- **New `/api/answers/ask`:** IP-keyed, 10 req/hour per IP per the QQ brief.
  Use `lib/rate-limit.ts` (DB-backed) or `lib/rate-limit-db.ts` (token-bucket).
  The concierge uses `ipKey(request)` — reuse that helper.

### 3.3 No Zod validation on `/api/chatbot`

`/api/chatbot/route.ts:23` reads `request.json()` without Zod. The new
`/api/answers/ask` route must use `withValidatedBody(Schema, ...)` per the
`CLAUDE.md` convention. Minimal schema:

```typescript
const AskSchema = z.object({
  question: z.string().min(10).max(4000),
  category: z.string().max(60).optional(),
  email: z.string().email().optional(),  // optional lead-capture
});
```

### 3.4 AFSL compliance block — mandatory on every answer page

Every answer page must include the `GENERAL_ADVICE_WARNING` from
`lib/compliance.ts`. The QA system prompt (QQ-03 scope) must mirror the
existing guardrails in `SYSTEM_PROMPT` in `lib/chatbot.ts`:

- Never give personal financial advice
- Answer from retrieved context only
- Always append the general advice disclaimer
- Refuse to answer off-topic questions

A snapshot test (QQ-07) must verify the compliance block renders on every
answer page — this is a QQ done-when condition.

---

## 4. What stays admin-only

| Surface | Reason |
|---------|--------|
| `app/api/chatbot/route.ts` | Multi-turn conversational; history loaded from `chatbot_conversations` via admin client. Not refactored in QQ scope. |
| `app/api/admin/ai-chat/route.ts` | Admin agent, email-gated, different cost caps. Out of scope. |
| `chatbot_conversations` table writes from public context | PII risk (free-form user messages stored indefinitely). QA surface writes to `qa_questions.submitted_email` (nullable, opt-in) and `qa_answers` only. |

---

## 5. New public-mode wrapper needed: `lib/qa-chatbot.ts`

The new route cannot call `respondToMessage()` directly. It needs a
purpose-built function:

```typescript
// lib/qa-chatbot.ts (QQ-03 scope)
export async function generateAnswer(
  question: string,
  category?: string,
): Promise<{
  answerMarkdown: string;
  model: string;
  costMicros: number;
  tokensIn: number;
  tokensOut: number;
  retrieved: RetrievedDoc[];
}>
```

Internal flow:
1. `classifyUserMessage(question)` — reuse from `lib/chatbot.ts`
2. `embedText(question)` — reuse from `lib/embeddings.ts`
3. Query `search_embeddings_knn` RPC (admin client acceptable per §3.1 note)
4. `buildChatPrompt(...)` with a QA-specific system prompt (stricter, no
   conversational turns)
5. `callClaude(messages)` — copy the private `callClaude()` or extract it
   to a shared helper in `lib/chatbot.ts` (QQ-03 decision)
6. Return structured result; caller writes to `qa_answers` table

---

## 6. Sub-task scope refinements (post-audit)

| Item | Refinement |
|------|------------|
| QQ-02 | Add `"qa_capture"` to `RouteConfig.route` union in `lib/ai-cost-caps.ts`. Check `search_embeddings` RLS before choosing retrieval client. |
| QQ-03 | Build `lib/qa-chatbot.ts`. Consider extracting `callClaude()` from `lib/chatbot.ts` to a shared `lib/ai-provider.ts` to avoid duplication. |
| QQ-05 | `/api/answers/ask` must use `withValidatedBody(AskSchema, ...)`. IP-keyed rate limit via `ipKey()`. Cost caps via `preCheckCaps` / `recordUsage` with `loadQaCaptureConfig()`. |
| QQ-08 | Compliance gate: the QA system prompt text + the AFSL disclaimer block on answer pages must be reviewed before the public route is live. Gate is a `docs/audits/qq-compliance-signoff.md` file committed by a human reviewer. |

---

## 7. Callers verified

All consumers of `lib/chatbot.ts` exports:

| File | Exports used | Client tier |
|------|-------------|-------------|
| `app/api/chatbot/route.ts` | `respondToMessage`, `ChatMessage` | admin-side internal |
| `app/api/concierge/route.ts` | `classifyUserMessage` only | public, IP-gated |

No other files import from `lib/chatbot.ts`. Safe to add new exports without
breaking existing callers.

All consumers of `lib/embeddings.ts`:

| File | Exports used | Client tier |
|------|-------------|-------------|
| `app/api/cron/embeddings-refresh/route.ts` | `embedBatch` | cron (service-role) |
| `app/api/search-semantic/route.ts` | `embedText` | public anon |
| `app/api/concierge/route.ts` | `embedText` | public IP-gated |

`embedText` is already used in public context — confirmed safe.

---

## 8. Idempotency / safety claim

This iteration only adds a documentation file (`docs/audits/qq-01-capability-audit.md`).
No source code changed. No migration. No regression risk.

## 9. Rollback

Delete this file. No other state was modified.
