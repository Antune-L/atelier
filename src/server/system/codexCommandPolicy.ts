export const CODEX_BASH_DENIAL_REASON = "Commande Bash non autorisée. Utilise une commande directe de la liste permise, sans expansion, redirection ni wrapper.";
export const CODEX_SCOUT_DENIAL_REASON = "Les sous-agents de recherche ne peuvent utiliser ni Bash, ni apply_patch, ni spawn_agent.";
export const CODEX_DELEGATED_DENIAL_REASON = "Une session d'implémentation déléguée ne peut pas créer de sous-agent natif.";

export function matchesCodexBashAllowlist(command: string, patterns: readonly string[]): boolean {
  const UNSAFE_SHELL_CHARACTERS = new Set(["<", ">", "(", ")", "{", "}", "#"]);
  const segments: string[][] = [];
  let words: string[] = [];
  let word = "";
  let hasWord = false;
  let quote: "'" | '"' | null = null;
  let escaped = false;

  function finishWord(): void {
    if (!hasWord) return;
    words.push(word);
    word = "";
    hasWord = false;
  }

  function finishSegment(): boolean {
    finishWord();
    if (words.length === 0) return false;
    segments.push(words);
    words = [];
    return true;
  }

  const input = command.trim();
  if (input === "") return false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === undefined) return false;
    if (escaped) {
      if (character === "\n") return false;
      word += character;
      hasWord = true;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      hasWord = true;
      continue;
    }
    if (quote === "'") {
      if (character === "'") quote = null;
      else word += character;
      continue;
    }
    if (character === "$" || character === "`") return false;
    if (quote === '"') {
      if (character === '"') quote = null;
      else word += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      hasWord = true;
      continue;
    }
    if (UNSAFE_SHELL_CHARACTERS.has(character)) return false;
    if (character === ";" || character === "|" || character === "&" || character === "\n") {
      if (character === "&" && input[index + 1] !== "&") return false;
      if (character === "|" && input[index + 1] === "&") return false;
      if (!finishSegment()) return false;
      if (character === "&" || (character === "|" && input[index + 1] === "|")) index += 1;
      continue;
    }
    if (/\s/.test(character)) {
      finishWord();
      continue;
    }
    word += character;
    hasWord = true;
  }
  if (quote !== null || escaped || !finishSegment()) return false;

  return segments.every((segment) => {
    const normalized = segment.join(" ");
    return patterns.some((pattern) => {
      if (!pattern.startsWith("Bash(") || !pattern.endsWith(":*)")) return false;
      const prefix = pattern.slice(5, -3);
      return normalized === prefix || normalized.startsWith(`${prefix} `);
    });
  });
}

export function codexCommandPolicyScript(
  patterns: readonly string[] | undefined,
  scoutTypes: readonly string[],
  restrictAllSubagents: boolean,
  restrictNestedAgents: boolean,
): string {
  return `const matchesCodexBashAllowlist = ${matchesCodexBashAllowlist.toString()};
const patterns = ${JSON.stringify(patterns ?? null)};
const scoutTypes = new Set(${JSON.stringify(scoutTypes)});
const restrictAllSubagents = ${JSON.stringify(restrictAllSubagents)};
const restrictNestedAgents = ${JSON.stringify(restrictNestedAgents)};
let request;
try { request = JSON.parse(await Bun.stdin.text()); } catch { process.stdout.write("deny"); process.exit(0); }
const toolName = request?.tool_name;
const isScout = (typeof request?.agent_type === "string" && scoutTypes.has(request.agent_type))
  || (restrictAllSubagents && typeof request?.agent_id === "string" && request.agent_id.length > 0);
if (isScout && (toolName === "Bash" || toolName === "apply_patch" || toolName === "spawn_agent")) {
  process.stdout.write("scout");
} else if (restrictNestedAgents && toolName === "spawn_agent") {
  process.stdout.write("nested");
} else if (toolName === "Bash" && patterns !== null) {
  const command = request?.tool_input?.command ?? request?.tool_input?.cmd;
  process.stdout.write(typeof command === "string" && matchesCodexBashAllowlist(command, patterns) ? "allow" : "deny");
} else {
  process.stdout.write("allow");
}
`;
}
