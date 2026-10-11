import type { VcsProvider } from "@shared/constants";
import type { VcsConnectionResult } from "@shared/schemas";

interface ConnectionHint {
  message: string;
  className: string;
}

export function connectionHint(testing: boolean, result: VcsConnectionResult | null, provider: VcsProvider): ConnectionHint {
  if (testing) return { message: "Test en cours…", className: "text-muted-foreground" };
  if (result === null) return { message: "", className: "text-muted-foreground" };
  return {
    message: result.ok && provider === "github"
      ? "Lecture des PR GitHub confirmée. Écritures (push, création de PR, publication de review) non vérifiées."
      : result.message,
    className: result.ok ? "text-success" : "text-destructive",
  };
}
