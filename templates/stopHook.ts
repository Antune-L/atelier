/**
 * Stop hook. Fires when the Claude session ends a turn. POSTs to the backend
 * so it can detect "turn ended without a protocol tool" and auto-nudge / stall.
 * Reads session_id from stdin payload (stored for an eventual --resume).
 */

const BACKEND_HTTP = process.env.BACKEND_HTTP ?? "";
const TICKET_ID = process.env.TICKET_ID ?? "";

interface StopHookInput {
  session_id?: string;
}

function readStdin(): Promise<string> {
  return new Response(Bun.stdin.stream()).text();
}

const raw = await readStdin();
let sessionId: string | null = null;
try {
  const parsed: StopHookInput = JSON.parse(raw);
  sessionId = parsed.session_id ?? null;
} catch {
  sessionId = null;
}

if (BACKEND_HTTP && TICKET_ID) {
  try {
    await fetch(`${BACKEND_HTTP}/api/internal/stop`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticketId: TICKET_ID, sessionId }),
    });
  } catch {
    // Backend may be momentarily down; the worker WS reconnection covers recovery.
  }
}

process.exit(0);
