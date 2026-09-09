/**
 * Tiny structured logger for backend observability. Scoped per subsystem
 * (slot, coordinator, triage…), level-filtered via KANBAN_LOG (default info),
 * colored on a TTY. Side effects (git/tmux/gh) and pipeline transitions log
 * through here so an operator can see what the server is doing in real time.
 */

import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import type { WriteStream } from "node:fs";
import { join } from "node:path";

import { getErrorMessage } from "../shared/errors.ts";

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

const LOG_FILE_NAME = "server.log";
const MAX_LOG_FILE_BYTES = 32 * 1024 * 1024;
const LOG_FILE_HISTORY = 3;

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

function timestamp(iso: string): string {
  return iso.slice(11, 23);
}

let logStream: WriteStream | null = null;
let logFilePath: string | null = null;
let logFileBytes = 0;
let fileLoggingDisabled = false;

function disableFileLogging(reason: string): void {
  if (fileLoggingDisabled) return;
  fileLoggingDisabled = true;
  logStream = null;
  logFilePath = null;
  console.warn(`[logger] journalisation fichier désactivée, sortie console uniquement : ${reason}`);
}

function openLogStream(path: string): void {
  logFileBytes = existsSync(path) ? statSync(path).size : 0;
  const stream = createWriteStream(path, { flags: "a" });
  stream.on("error", (error: Error) => {
    disableFileLogging(error.message);
  });
  logStream = stream;
  logFilePath = path;
}

function rotateLogFile(): void {
  const path = logFilePath;
  if (path === null) return;
  logStream?.end();
  logStream = null;
  const oldest = `${path}.${LOG_FILE_HISTORY}`;
  if (existsSync(oldest)) rmSync(oldest, { force: true });
  for (let index = LOG_FILE_HISTORY - 1; index >= 1; index -= 1) {
    const source = `${path}.${index}`;
    if (existsSync(source)) renameSync(source, `${path}.${index + 1}`);
  }
  if (existsSync(path)) renameSync(path, `${path}.1`);
  openLogStream(path);
}

function appendToLogFile(line: string): void {
  if (fileLoggingDisabled || logStream === null) return;
  try {
    const payload = `${line}\n`;
    logStream.write(payload);
    logFileBytes += Buffer.byteLength(payload);
    if (logFileBytes >= MAX_LOG_FILE_BYTES) rotateLogFile();
  } catch (error) {
    disableFileLogging(getErrorMessage(error));
  }
}

/**
 * Point every subsequent log line at `<directory>/server.log` (rotated on size). Called once by
 * startServer; until then, and if the directory cannot be opened, the logger stays console-only.
 */
export function initLogFile(directory: string): string | null {
  if (fileLoggingDisabled || logStream !== null) return logFilePath;
  try {
    mkdirSync(directory, { recursive: true });
    openLogStream(join(directory, LOG_FILE_NAME));
    return logFilePath;
  } catch (error) {
    disableFileLogging(getErrorMessage(error));
    return null;
  }
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
    const iso = new Date().toISOString();
    const head = `${paint(ANSI.dim, timestamp(iso))} ${paint(ANSI[level], LEVEL_TAG[level])} ${paint(ANSI.dim, `[${this.scope}]`)} ${message}`;
    const tail = fields && Object.keys(fields).length > 0 ? ` ${serializeFields(fields)}` : "";
    const line = `${head}${tail}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
    appendToLogFile(`${iso} ${LEVEL_TAG[level]} [${this.scope}] ${message}${tail}`);
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
