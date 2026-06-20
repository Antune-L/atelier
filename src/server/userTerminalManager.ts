import type { TerminalDescriptor } from "../shared/schemas.ts";

import { getProject } from "./config.ts";
import { createLogger } from "./logger.ts";
import type { SystemAdapter } from "./system/index.ts";

const log = createLogger("user-terminal");

/** Prefix of every user terminal's tmux session name; keeps them distinct from agent/triage sessions. */
const SESSION_PREFIX = "user-term";

/**
 * Owns the user-facing interactive terminals (CMUX view): a Map of in-memory descriptors, each backed
 * by a detached zsh tmux session rooted at the project's repoPath. Session names are derived
 * server-side (never client-supplied); the client only ever holds the opaque `id`, which the WS
 * stream resolves back to a session name.
 */
export class UserTerminalManager {
  private readonly terminals = new Map<string, TerminalDescriptor>();
  private nextId = 1;

  constructor(private readonly system: SystemAdapter) {}

  async create(projectKey: string): Promise<TerminalDescriptor> {
    const cwd = getProject(projectKey).repoPath;
    const id = String(this.nextId++);
    const sessionName = `${SESSION_PREFIX}-${projectKey}-${id}`;
    await this.system.spawnShellSession({ sessionName, cwd });
    const descriptor: TerminalDescriptor = { id, projectKey, sessionName, cwd, createdAt: Date.now() };
    this.terminals.set(id, descriptor);
    log.info("terminal utilisateur créé", { id, projectKey, sessionName });
    return descriptor;
  }

  async close(id: string): Promise<void> {
    const descriptor = this.terminals.get(id);
    if (!descriptor) return;
    this.terminals.delete(id);
    await this.system.killSession(descriptor.sessionName);
    log.info("terminal utilisateur fermé", { id, sessionName: descriptor.sessionName });
  }

  /** Live descriptors, pruning sessions whose tmux pane has died (e.g. after a backend restart). */
  async list(projectKey?: string): Promise<TerminalDescriptor[]> {
    const result: TerminalDescriptor[] = [];
    for (const descriptor of this.terminals.values()) {
      if (!(await this.system.hasSession(descriptor.sessionName))) {
        this.terminals.delete(descriptor.id);
        continue;
      }
      if (projectKey === undefined || descriptor.projectKey === projectKey) result.push(descriptor);
    }
    return result;
  }

  /** terminalId → tmux session name, or null when no such live terminal exists. */
  resolveSession(terminalId: string): string | null {
    return this.terminals.get(terminalId)?.sessionName ?? null;
  }
}
