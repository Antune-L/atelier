const GENERIC_ERROR = "Erreur";

/** Message of a thrown value, falling back to a caller-provided label for non-Error rejections. */
export function errorMessage(error: unknown, fallback: string = GENERIC_ERROR): string {
  return error instanceof Error ? error.message : fallback;
}
