import type { PreviewRecord } from "@shared/preview";

export const PREVIEW_POLL_INTERVAL_MS = 5_000;

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
