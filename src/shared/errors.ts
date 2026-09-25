import type { ErrorDetails } from "./schemas.ts";

/**
 * Normalize an unknown thrown value into a human-readable message. Use at every
 * catch site instead of inlining `error instanceof Error ? error.message : ...`.
 *
 * @param fallback used when the value is not an Error; defaults to `String(error)`.
 */
export function getErrorMessage(error: unknown, fallback?: string): string {
  if (error instanceof Error) return error.message;
  return fallback ?? String(error);
}

/**
 * Normalize an unknown thrown value into the most detailed trace available. Use at catch sites that
 * log for diagnosis, instead of inlining `error instanceof Error ? error.stack ?? ... : ...`.
 */
export function getErrorStack(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

type ErrorDetailsContext = Omit<ErrorDetails, "message" | "stack" | "cause" | "at">;

function describeCause(cause: unknown): string | null {
  if (cause === undefined || cause === null) return null;
  if (cause instanceof Error) return cause.stack ?? cause.message;
  return String(cause);
}

export function buildErrorDetails(error: unknown, context: ErrorDetailsContext): ErrorDetails {
  const message = getErrorMessage(error);
  const at = Date.now();
  if (!(error instanceof Error)) return { ...context, message, stack: null, cause: null, at };
  return { ...context, message, stack: error.stack ?? null, cause: describeCause(error.cause), at };
}
