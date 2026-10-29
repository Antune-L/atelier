/**
 * In-app `claude auth login` flow: run the CLI without a TTY, surface the authorization URL it prints,
 * then pipe the code the user pasted back to its stdin. One flow at a time.
 *
 * Secrets: the pasted code, the CLI output and the resulting credentials are never logged nor returned;
 * every reported message is a fixed French string.
 */

import { CLAUDE_LOGIN_TIMEOUT_MS, isClaudeLoginActive } from "../../shared/claudeLogin.ts";
import type { ClaudeLoginState, ClaudeLoginStatus } from "../../shared/claudeLogin.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import { createLogger } from "../logger.ts";

const log = createLogger("claude-login");

/** Kept output tail used to find a URL split across chunks; never logged. */
const OUTPUT_BUFFER_CHARS = 16_384;
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b\[[0-9;?]*[A-Za-z]|\u001b\][^\u0007]*\u0007/g;
/** First https URL followed by whitespace, so a URL still being streamed is not taken truncated. */
const URL_PATTERN = /https:\/\/[^\s"'<>`]+(?=\s)/;

const MESSAGES = {
  starting: "Démarrage de la connexion Claude…",
  awaiting: "Ouvre le lien, autorise l'accès puis colle le code affiché",
  submitting: "Vérification du code…",
  success: "Claude est connecté",
  successRestart:
    "Claude est connecté, mais CLAUDE_CODE_OAUTH_TOKEN reste défini : commente-le dans /etc/kanban/kanban.env puis redémarre le service",
  failed: "La connexion Claude a échoué : réessaie",
  noUrl: "La commande claude auth login s'est arrêtée sans fournir de lien",
  spawnFailed: "Impossible de lancer claude auth login",
  noBinary: "Binaire claude introuvable",
  expired: "Délai de connexion dépassé : relance la connexion",
  cancelled: "Connexion annulée",
} as const;

export interface ClaudeLoginProcess {
  writeStdin(text: string): void;
  kill(): void;
  /** Exit code of the child. */
  exited: Promise<number>;
}

export interface ClaudeLoginSpawnHandlers {
  /** Text chunk from stdout or stderr. */
  onOutput(chunk: string): void;
}

export interface ClaudeLoginDependencies {
  environment: Record<string, string | undefined>;
  /** Resolved `claude` executable; throws or returns null when absent. */
  resolveBinary(): string | null;
  spawn(binary: string, args: string[], env: Record<string, string>, handlers: ClaudeLoginSpawnHandlers): ClaudeLoginProcess;
  now?: () => number;
  /** Schedule a callback; returns its cancel function. */
  setTimer?: (callback: () => void, ms: number) => () => void;
  timeoutMs?: number;
}

/**
 * Child environment: the service environment without CLAUDE_CODE_OAUTH_TOKEN, so the CLI performs a real
 * login instead of reusing the setup token. ANTHROPIC_API_KEY is deliberately kept: the ticket only mandates
 * removing the OAuth token, and an API key there is reported separately as not_applicable.
 */
export function claudeLoginEnvironment(environment: Record<string, string | undefined>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(environment)) {
    if (value !== undefined && key !== "CLAUDE_CODE_OAUTH_TOKEN") env[key] = value;
  }
  return env;
}

/** Extract the first complete authorization URL from CLI output (ANSI-tolerant); null when none yet. */
export function parseClaudeLoginUrl(output: string): string | null {
  const match = URL_PATTERN.exec(output.replace(ANSI_PATTERN, ""));
  return match ? match[0] : null;
}

/** Real spawn through Bun, stdout and stderr decoded as text chunks. */
export function spawnClaudeLoginProcess(
  binary: string,
  args: string[],
  env: Record<string, string>,
  handlers: ClaudeLoginSpawnHandlers,
): ClaudeLoginProcess {
  const child = Bun.spawn([binary, ...args], { env, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const pump = async (stream: ReadableStream<Uint8Array>): Promise<void> => {
    const decoder = new TextDecoder();
    const reader = stream.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        handlers.onOutput(decoder.decode(value, { stream: true }));
      }
    } catch {
      // The stream ends abruptly when the child is killed.
    }
  };
  void pump(child.stdout);
  void pump(child.stderr);
  return {
    writeStdin: (text) => {
      child.stdin.write(text);
      void child.stdin.flush();
    },
    kill: () => child.kill(),
    exited: child.exited,
  };
}

interface ActiveFlow {
  id: number;
  process: ClaudeLoginProcess | null;
  output: string;
  cancelTimer: () => void;
}

export class ClaudeLoginManager {
  private readonly dependencies: ClaudeLoginDependencies;
  private readonly now: () => number;
  private readonly setTimer: (callback: () => void, ms: number) => () => void;
  private readonly timeoutMs: number;
  private state: ClaudeLoginState = "idle";
  private url: string | null = null;
  private expiresAt: number | null = null;
  private message: string | null = null;
  private restartRequired = false;
  private flow: ActiveFlow | null = null;
  private nextId = 1;

  constructor(dependencies: ClaudeLoginDependencies) {
    this.dependencies = dependencies;
    this.now = dependencies.now ?? Date.now;
    this.setTimer =
      dependencies.setTimer ??
      ((callback, ms) => {
        const timer = setTimeout(callback, ms);
        return () => clearTimeout(timer);
      });
    this.timeoutMs = dependencies.timeoutMs ?? CLAUDE_LOGIN_TIMEOUT_MS;
  }

  status(): ClaudeLoginStatus {
    return {
      state: this.state,
      url: this.url,
      expiresAt: this.expiresAt,
      message: this.message,
      oauthTokenEnvSet: this.oauthTokenEnvSet(),
      restartRequired: this.restartRequired,
    };
  }

  /** Start a flow; a running one is reused as is, a terminal state is replaced. */
  start(): ClaudeLoginStatus {
    if (isClaudeLoginActive(this.state)) return this.status();
    const id = this.nextId++;
    this.url = null;
    this.restartRequired = false;
    this.expiresAt = this.now() + this.timeoutMs;
    this.setState("starting", MESSAGES.starting);
    const flow: ActiveFlow = { id, process: null, output: "", cancelTimer: () => {} };
    this.flow = flow;
    flow.cancelTimer = this.setTimer(() => this.finish(id, "expired", MESSAGES.expired, true), this.timeoutMs);

    let binary: string | null;
    try {
      binary = this.dependencies.resolveBinary();
    } catch (error) {
      log.warn("binaire claude introuvable pour la connexion", { reason: getErrorMessage(error) });
      binary = null;
    }
    if (!binary) {
      this.finish(id, "failed", MESSAGES.noBinary, false);
      return this.status();
    }
    try {
      const env = claudeLoginEnvironment(this.dependencies.environment);
      flow.process = this.dependencies.spawn(binary, ["auth", "login"], env, { onOutput: (chunk) => this.onOutput(id, chunk) });
    } catch (error) {
      log.warn("lancement de claude auth login impossible", { reason: getErrorMessage(error) });
      this.finish(id, "failed", MESSAGES.spawnFailed, false);
      return this.status();
    }
    const child = flow.process;
    child.exited.then(
      (code) => this.onExit(id, code),
      () => this.onExit(id, -1),
    );
    return this.status();
  }

  /** Pipe the pasted code to the CLI; ignored unless a URL is awaiting its code. */
  submitCode(code: string): ClaudeLoginStatus {
    const flow = this.flow;
    const trimmed = code.trim();
    if (this.state !== "awaiting_code" || !flow?.process || trimmed.length === 0) return this.status();
    this.setState("submitting", MESSAGES.submitting);
    try {
      flow.process.writeStdin(`${trimmed}\n`);
    } catch {
      this.finish(flow.id, "failed", MESSAGES.failed, true);
    }
    return this.status();
  }

  cancel(): ClaudeLoginStatus {
    if (this.flow && isClaudeLoginActive(this.state)) this.finish(this.flow.id, "cancelled", MESSAGES.cancelled, true);
    return this.status();
  }

  private oauthTokenEnvSet(): boolean {
    return Boolean(this.dependencies.environment.CLAUDE_CODE_OAUTH_TOKEN);
  }

  private setState(state: ClaudeLoginState, message: string): void {
    this.state = state;
    this.message = message;
  }

  private onOutput(id: number, chunk: string): void {
    const flow = this.flow;
    if (!flow || flow.id !== id || this.state !== "starting") return;
    flow.output = `${flow.output}${chunk}`.slice(-OUTPUT_BUFFER_CHARS);
    const url = parseClaudeLoginUrl(flow.output);
    if (!url) return;
    flow.output = "";
    this.url = url;
    this.setState("awaiting_code", MESSAGES.awaiting);
  }

  private onExit(id: number, code: number): void {
    if (!this.flow || this.flow.id !== id || !isClaudeLoginActive(this.state)) return;
    if (code === 0 && this.state !== "starting") {
      this.restartRequired = this.oauthTokenEnvSet();
      this.finish(id, "success", this.restartRequired ? MESSAGES.successRestart : MESSAGES.success, false);
      return;
    }
    this.finish(id, "failed", this.state === "starting" ? MESSAGES.noUrl : MESSAGES.failed, false);
  }

  private finish(id: number, state: ClaudeLoginState, message: string, kill: boolean): void {
    const flow = this.flow;
    if (!flow || flow.id !== id) return;
    this.flow = null;
    flow.cancelTimer();
    if (kill) {
      try {
        flow.process?.kill();
      } catch {
        // Already exited.
      }
    }
    this.expiresAt = null;
    this.url = null;
    this.setState(state, message);
    log.info("connexion claude terminée", { state });
  }
}
