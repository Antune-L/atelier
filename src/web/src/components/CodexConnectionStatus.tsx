import type { CodexRuntimeStatus } from "@shared/codexCapabilities";

import { refreshCapabilities, useCapabilities } from "@/hooks/useCapabilities";

const STATUS_LABELS: Record<CodexRuntimeStatus["status"], string> = {
  checking: "Vérification des capacités Codex…",
  ready: "Codex connecté",
  unauthenticated: "Connexion Codex requise",
  unavailable: "Runtime Codex indisponible",
  model_unavailable: "Modèles Codex indisponibles",
  temporarily_unavailable: "Service Codex temporairement indisponible",
  error: "Vérification Codex impossible",
};

/** Keep authentication refresh reachable even when Codex cannot currently be selected. */
export function CodexConnectionStatus() {
  const { codex } = useCapabilities();
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span role="status">{codex.message ?? STATUS_LABELS[codex.status]}</span>
      <button
        type="button"
        className="underline underline-offset-2 disabled:opacity-50"
        disabled={codex.status === "checking"}
        onClick={() => void refreshCapabilities()}
      >
        Vérifier à nouveau
      </button>
    </div>
  );
}
