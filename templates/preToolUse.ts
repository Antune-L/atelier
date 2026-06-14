/**
 * PreToolUse hook (all tools). Claude Code passes the tool input on stdin.
 * The static allowlist in settings.json already permits known-safe commands;
 * this hook is the explicit deny net for the `--no-verify` footgun and any
 * command that slips through, telling the agent to escalate via ask_user.
 *
 * Additionally, fires a one-time POST to /api/internal/active on the first
 * tool call so the backend can detect a live session before the first protocol
 * tool call (contract ack). Guarded by a .claude/.agent-active marker file.
 */

const BACKEND_HTTP = process.env.BACKEND_HTTP ?? "";
const TICKET_ID = process.env.TICKET_ID ?? "";
const AGENT_ACTIVE_MARKER = ".claude/.agent-active";

const DENY_PATTERNS = [
  /--no-verify/,
  /\brm\s+-rf\b/,
  /\bgit\s+push\b.*--force(?!-with-lease)/,
  /\bsudo\b/,
  /\bcurl\b.*\|\s*(sh|bash)\b/,
];

const DENY_MESSAGE =
  "Commande non autorisée. N'utilise jamais --no-verify ni de commande destructive. Si c'est indispensable, utilise le tool ask_user.";

interface HookInput {
  tool_input?: { command?: string };
}

function readStdin(): Promise<string> {
  return new Response(Bun.stdin.stream()).text();
}

// Fire-once agent-active ping: signals that the session is alive before the first protocol tool.
if (BACKEND_HTTP && TICKET_ID && !(await Bun.file(AGENT_ACTIVE_MARKER).exists())) {
  try {
    await Bun.write(AGENT_ACTIVE_MARKER, "");
    await fetch(`${BACKEND_HTTP}/api/internal/active`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticketId: TICKET_ID }),
    });
  } catch {
    // Backend may be momentarily down; marker already written so no retry storm.
  }
}

const raw = await readStdin();
let command = "";
try {
  const parsed: HookInput = JSON.parse(raw);
  command = parsed.tool_input?.command ?? "";
} catch {
  command = "";
}

const denied = DENY_PATTERNS.some((pattern) => pattern.test(command));

if (denied) {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: DENY_MESSAGE,
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

process.exit(0);
