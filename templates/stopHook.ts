/**
 * Stop hook. Fires when the Claude session ends a turn. POSTs to the backend
 * so it can detect "turn ended without a protocol tool" and auto-nudge / stall.
 * Reads session_id from stdin payload (stored for an eventual --resume), and
 * aggregates the session transcript's token usage by model for cost tracking.
 */

const BACKEND_HTTP = process.env.BACKEND_HTTP ?? "";
const TICKET_ID = process.env.TICKET_ID ?? "";

interface StopHookInput {
  session_id?: string;
  transcript_path?: string;
}

/** One model's four billable token buckets, as recorded in `message.usage`. */
interface ModelUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

type UsageByModel = Record<string, ModelUsage>;

function readStdin(): Promise<string> {
  return new Response(Bun.stdin.stream()).text();
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Sum `message.usage` per model across the transcript, counting each distinct `message.id` exactly
 * once. A single assistant API response is written across several JSONL lines (streaming chunks,
 * tool_use entries) that repeat the identical `usage` object, so summing per line over-counts;
 * `usage` is per-API-call, so we dedup by message id. Includes isSidechain lines so sub-agents
 * (argus, figma, …) — which carry their own message ids — are still counted once each. Fully
 * defensive: any read/parse error or malformed line is skipped; an unreadable transcript yields
 * undefined (usage omitted from POST).
 */
async function aggregateUsage(transcriptPath: string): Promise<UsageByModel | undefined> {
  let text: string;
  try {
    text = await Bun.file(transcriptPath).text();
  } catch {
    return undefined;
  }
  const byModel: UsageByModel = {};
  const seenMessageIds = new Set<string>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: unknown;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!entry || typeof entry !== "object" || !("message" in entry)) continue;
    const message = entry.message;
    if (!message || typeof message !== "object" || !("usage" in message) || !("model" in message)) continue;
    const model = message.model;
    const usage = message.usage;
    if (typeof model !== "string" || !usage || typeof usage !== "object") continue;
    // Dedup by message id: the same usage object recurs across a message's streamed lines.
    // Id-less lines (rare) fall through and are counted, since they can't be deduped.
    if ("id" in message && typeof message.id === "string") {
      if (seenMessageIds.has(message.id)) continue;
      seenMessageIds.add(message.id);
    }
    const bucket = (byModel[model] ??= {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    });
    const u: Record<string, unknown> = usage;
    bucket.input_tokens += num(u.input_tokens);
    bucket.output_tokens += num(u.output_tokens);
    bucket.cache_creation_input_tokens += num(u.cache_creation_input_tokens);
    bucket.cache_read_input_tokens += num(u.cache_read_input_tokens);
  }
  return Object.keys(byModel).length > 0 ? byModel : undefined;
}

const raw = await readStdin();
let sessionId: string | null = null;
let usageByModel: UsageByModel | undefined;
try {
  const parsed: StopHookInput = JSON.parse(raw);
  sessionId = parsed.session_id ?? null;
  if (parsed.transcript_path) {
    usageByModel = await aggregateUsage(parsed.transcript_path);
  }
} catch {
  sessionId = null;
}

if (BACKEND_HTTP && TICKET_ID) {
  try {
    await fetch(`${BACKEND_HTTP}/api/internal/stop`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticketId: TICKET_ID, sessionId, usageByModel }),
    });
  } catch {
    // Backend may be momentarily down; the worker WS reconnection covers recovery.
  }
}

process.exit(0);
