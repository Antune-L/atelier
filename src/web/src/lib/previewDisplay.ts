import type { PreviewGithubSourceResolution, PreviewReadiness, PreviewRecord, PreviewSettings } from "@shared/preview";

export const PREVIEW_POLL_INTERVAL_MS = 5_000;
export const PREVIEW_CLEANUP_WATCH_LABEL = "Ressources supprimées · surveillance d’arrêt en cours";
export const PREVIEW_GITHUB_SOURCE_ERROR = "Impossible de vérifier l'accès au dépôt. Vérifiez la connexion Coolify et l'accès GitHub du projet, puis réessayez.";

export const PREVIEW_GITHUB_SOURCE_LABELS: Record<PreviewGithubSourceResolution['status'], string> = {
  resolved: "Accès au dépôt vérifié.",
  choice_required: "Plusieurs connexions ont accès à ce dépôt. Choisissez celle à utiliser pour ce projet, puis enregistrez.",
  no_match: "Aucune connexion vérifiée n'a accès à ce dépôt. Vérifiez les accès dans Coolify. Si une connexion est imposée, revenez au choix automatique, enregistrez puis vérifiez à nouveau.",
  incomplete: "L'accès au dépôt n'a pas pu être entièrement vérifié. Vérifiez la connexion Coolify et l'accès GitHub du projet, puis réessayez.",
  unsupported: "Ce dépôt n'est pas compatible avec les prévisualisations GitHub.",
};

export const PREVIEW_STATUS_LABELS: Record<PreviewRecord['status'], string> = {
  queued: "En attente",
  provisioning: "Préparation",
  building: "Construction",
  deploying: "Déploiement",
  ready: "Disponible",
  stopping: "Suppression",
  stopped: "Supprimée",
  failed: "Échec",
  interrupted: "Interrompue",
};

export const PREVIEW_CLEANUP_LABELS: Record<PreviewRecord['cleanupStatus'], string> = {
  pending: "Nettoyage en attente",
  complete: "Nettoyage terminé",
  failed: "Nettoyage incomplet",
};

export const PREVIEW_REVISION_LABEL_LENGTH = 8;
export const PREVIEW_READINESS_LABELS: Record<PreviewReadiness["status"], string> = {
  ready: "Projet prêt pour Coolify",
  not_ready: "Préparation du projet nécessaire",
  check_error: "Vérification du projet indisponible",
};

export const PREVIEW_HISTORY_LIMIT = 10;
const PREVIEW_INACTIVE_STATUSES: ReadonlySet<PreviewRecord['status']> = new Set(["failed", "interrupted", "stopping", "stopped"]);

function previewIsLive(preview: PreviewRecord): boolean {
  return preview.desiredState === "running" && !PREVIEW_INACTIVE_STATUSES.has(preview.status);
}

export function sortPreviewHistory(previews: PreviewRecord[]): PreviewRecord[] {
  return [...previews].sort((left, right) => {
    const leftLive = previewIsLive(left);
    if (leftLive !== previewIsLive(right)) return leftLive ? -1 : 1;
    if (left.createdAt !== right.createdAt) return right.createdAt - left.createdAt;
    return right.updatedAt - left.updatedAt;
  });
}

export function previewConnectionReady(settings: PreviewSettings | null): boolean {
  return settings !== null && settings.tokenConfigured && settings.previewAuthConfigured &&
    settings.baseUrl !== null && settings.serverUuid !== null && settings.projectUuid !== null &&
    settings.domainBase !== null;
}
