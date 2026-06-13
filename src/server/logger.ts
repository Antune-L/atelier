/**
 * Tiny structured logger for backend observability. Scoped per subsystem
 * (slot, coordinator, triage…), level-filtered via KANBAN_LOG (default info),
 * colored on a TTY. Side effects (git/tmux/gh) and pipeline transitions log
 * through here so an operator can see what the server is doing in real time.
 */

const LEVEL_ORDER = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVEL_ORDER;

function isLevel(value: string): value is Level {
  return value in LEVEL_ORDER;
}

function resolveThreshold(): Level {
  const raw = (process.env.KANBAN_LOG ?? "info").toLowerCase();
  return isLevel(raw) ? raw : "info";
}

const THRESHOLD = resolveThreshold();
const COLOR_ENABLED = Boolean(process.stdout.isTTY);

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
} as const;

const LEVEL_TAG: Record<Level, string> = {
  debug: "DBG",
  info: "INF",
  warn: "WRN",
  error: "ERR",
};

function paint(color: string, text: string): string {
  return COLOR_ENABLED ? `${color}${text}${ANSI.reset}` : text;
}

function serializeFields(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" ");
}

function timestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(scope: string): Logger;
}

class ScopedLogger implements Logger {
  constructor(private readonly scope: string) {}

  private emit(level: Level, message: string, fields?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[THRESHOLD]) return;
    const head = `${paint(ANSI.dim, timestamp())} ${paint(ANSI[level], LEVEL_TAG[level])} ${paint(ANSI.dim, `[${this.scope}]`)} ${message}`;
    const line = fields && Object.keys(fields).length > 0 ? `${head} ${serializeFields(fields)}` : head;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  debug(message: string, fields?: Record<string, unknown>): void {
    this.emit("debug", message, fields);
  }
  info(message: string, fields?: Record<string, unknown>): void {
    this.emit("info", message, fields);
  }
  warn(message: string, fields?: Record<string, unknown>): void {
    this.emit("warn", message, fields);
  }
  error(message: string, fields?: Record<string, unknown>): void {
    this.emit("error", message, fields);
  }

  child(scope: string): Logger {
    return new ScopedLogger(`${this.scope}:${scope}`);
  }
}

export function createLogger(scope: string): Logger {
  return new ScopedLogger(scope);
}
