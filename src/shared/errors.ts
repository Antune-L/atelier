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
