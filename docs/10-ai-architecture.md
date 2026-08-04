# Fatoora Lite Pro — AI Architecture (Providers, RAG, Tool Calling)

AI is a core architectural layer of Fatoora Lite Pro, not a bolt-on chat widget. This
document describes the three pillars — the **provider-agnostic model layer**, the
**RAG retrieval stack**, and **application-wide tool calling** — and exactly how to
switch from free development models to enterprise providers (Anthropic / OpenAI).

---

## 1. Provider-agnostic model layer

**Design goal:** development runs on OpenRouter free models; production for Gulf
clients can switch to Anthropic or OpenAI by changing environment variables only —
zero code changes at call sites.

### Layout

```
fatooralite/lib/ai/
  provider.ts            # ChatProvider interface + factory + stable wrappers
  providers/
    openai-compat.ts     # generic OpenAI-compatible adapter (fetch-based)
    openrouter.ts        # OpenRouter instance (models-array routing, free-model tuning)
    openai.ts            # OpenAI instance
    anthropic.ts         # official @anthropic-ai/sdk adapter (Messages API)
  embeddings.ts          # EmbeddingProvider factory (local | openai | voyage)
  vector-store.ts        # pgvector store (upsert / retrieve / clear)
  tenant-ingest.ts       # company-data summarization -> chunks
  tools.ts               # tool registry (schema + zod + RBAC + confirm + handler)
```

### The interface (`lib/ai/provider.ts`)

```ts
interface ChatProvider {
  name: string;
  isConfigured(): boolean;
  chatWithTools(messages, tools, opts): Promise<AssistantMessage>; // tool-calling turn
  chatText(messages, opts): Promise<string>;                       // plain completion
  chatStream(messages, opts): Promise<ReadableStream<Uint8Array>>; // token stream
}
```

The internal wire format is OpenAI-style (`role`, `tool_calls` with JSON-string
arguments) because the tool registry already speaks it. Adapters translate:

- **OpenRouter / OpenAI** share `providers/openai-compat.ts` (same protocol).
  OpenRouter adds its `models: [primary, fallback]` routing and
  `reasoning: {effort: "low"}` tuning for free reasoning models.
- **Anthropic** (`providers/anthropic.ts`, official SDK) maps:
  - `system` messages → the `system` parameter
  - assistant `tool_calls` → `tool_use` content blocks
  - `role:"tool"` results → `tool_result` blocks, batched into **one** user turn
    (the Messages API requires all results of a turn together)
  - tool schemas → `{name, description, input_schema}`
  - `toolChoice:"required"` → `tool_choice:{type:"any"}`

### Switching providers

| Scenario | Env change |
|---|---|
| Development (default) | `AI_PROVIDER=openrouter`, `OPENROUTER_API_KEY=…` |
| Enterprise — Anthropic | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=…`, optionally `AI_MODEL=claude-opus-4-8` |
| Enterprise — OpenAI | `AI_PROVIDER=openai`, `OPENAI_API_KEY=…`, optionally `AI_MODEL=…` |

That is the entire migration. Call sites (`/api/ai`, `/api/ai/agent`,
`/api/ai/insights`) import only `lib/ai/provider`.

---

## 2. RAG (Retrieval-Augmented Generation)

### Why two databases

The **relational schema** (Prisma/Postgres) is the source of truth for structured
application data — invoices, customers, certificates. The **vector index** answers a
different question: *"which pieces of knowledge are semantically relevant to this
message?"*. Fatoora Lite Pro keeps both in one Postgres instance — pgvector provides the
vector database capability without operating a second system — but they are separate
concerns with separate access paths:

- Structured reads/writes go through Prisma models.
- Vector search goes through raw SQL over `KnowledgeChunk.embedding` (`vector`
  column) using the cosine operator `<=>`, executed **in the database**.

### The store (`lib/ai/vector-store.ts`)

`KnowledgeChunk` rows carry `scope`:

| Scope | Contents | Visibility |
|---|---|---|
| `global` | ZATCA regulation corpus (`lib/ai/zatca-corpus.ts`) | all tenants |
| `company` | per-tenant summaries (invoices, customers, products, aggregates) | that tenant only — retrieval filters `companyId` server-side |

The `embedding` column is deliberately **dimension-agnostic** (`vector`, not
`vector(384)`): rows from different embedding models can coexist during a provider
migration, and retrieval filters `vector_dims(embedding) = <query dims>` so a query
only ever compares against compatible vectors. Exact search is used (no index);
appropriate for the corpus size — add an HNSW index and a fixed dimension when a
tenant's corpus grows past ~50k chunks.

### Embeddings (`lib/ai/embeddings.ts`)

| `EMBEDDING_PROVIDER` | Model | Dim | Notes |
|---|---|---|---|
| `local` (default) | MiniLM-L6-v2, in-process | 384 | no key, no per-call cost; cold-start on first use |
| `openai` | text-embedding-3-small | 1536 | pairs with `AI_PROVIDER=openai` |
| `voyage` | voyage-3.5-lite | 1024 | Anthropic-recommended pairing |

**Switching embedding providers requires re-ingesting** both scopes
(`POST /api/ai/ingest`, then `{"scope":"company"}`) — old-dimension vectors simply
stop matching (they are filtered out, never wrongly compared).

### Ingestion

- **Global:** `POST /api/ai/ingest` re-embeds the ZATCA corpus (idempotent).
- **Tenant:** `lib/ai/tenant-ingest.ts` summarizes the company's recent invoices,
  customers, products and an aggregate stats chunk into `scope=company` rows.
  Triggered automatically (debounced 15 s) after invoice/customer/product mutations —
  both from API routes and from AI tool writes — and manually via
  `POST /api/ai/ingest {"scope":"company"}`.

### Retrieval flow (both chat endpoints)

1. Embed the latest user message.
2. `SELECT … 1 - (embedding <=> $query) AS score … WHERE scope='global' OR
   (scope='company' AND companyId=$session.companyId) ORDER BY embedding <=> $query LIMIT k`.
3. Chunks above the similarity floor are injected into the system prompt as
   numbered context; the model is instructed to cite `[n]`.

---

## 3. Application-wide tool calling (the agent)

The assistant dock (bottom-right, every page) is a **do-anything agent**, not a chat
box. `POST /api/ai/agent` runs a tool loop (max 5 rounds):

1. System prompt = ZATCA knowledge + retrieved RAG context + tool-use rules.
2. The model may call tools; each call is dispatched through
   `lib/ai/tools.ts::executeTool`.
3. Results feed back; the loop continues until the model answers in natural language.

### The tool registry (`lib/ai/tools.ts`)

Each tool declares: JSON schema (for the model), a **zod schema** (server-side
validation), a **permission** (RBAC — checked against the caller's effective
permissions, which include DB-backed custom roles), and the handler. Tools are
tenant-scoped by construction: `companyId` always comes from the session, never from
model output.

| Tool | Kind | Permission |
|---|---|---|
| listInvoices / listCustomers / listProducts / findInvoice / getComplianceStats / getReport | read | `audit:view` |
| addCustomer / addProduct | write | `invoice:create` |
| createInvoice | write + **confirm** | `invoice:create` |
| submitInvoice | write + **confirm** | `invoice:clear` |
| navigate | UI | `audit:view` |

### Confirm-before-write

Financial/irreversible tools carry a `confirm` summarizer. When the model requests
one, the route **does not execute it** — it returns a `pendingAction`
(`{name, arguments, summary}`); the dock renders a confirmation card; on approval the
client posts `confirmedAction` back, and the route executes it with zod + RBAC
re-enforced. Declining costs nothing.

### Adding a new tool

1. Add an entry to `TOOLS` in `lib/ai/tools.ts` (schema + zod + permission +
   handler; add `confirm` if the action moves money or files with ZATCA).
2. Nothing else — the schemas are auto-published to the model each turn.

### Known limitation (documented deliberately)

The agent's final answer is returned as a complete JSON message, not a token
stream: streaming through the tool loop requires parsing streamed tool-call deltas
in all three provider adapters. The dedicated Q&A endpoint (`POST /api/ai`) does
stream tokens. Revisit if dock latency becomes a complaint.
