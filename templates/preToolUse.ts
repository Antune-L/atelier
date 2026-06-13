/**
 * PreToolUse hook (Bash matcher). Claude Code passes the tool input on stdin.
 * The static allowlist in settings.json already permits known-safe commands;
 * this hook is the explicit deny net for the `--no-verify` footgun and any
 * command that slips through, telling the agent to escalate via ask_user.
 */

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
