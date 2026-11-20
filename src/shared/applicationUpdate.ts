import { compareAppVersions } from "./desktopUpdate.ts";
import { providerVersionSchema } from "./providerUpdates.ts";
import type { ProviderUpdates } from "./providerUpdates.ts";

export type ApplicationUpdateState = "up_to_date" | "update_available" | "unknown";
export type ApplicationUpdateReason = "simulated" | "installed_unknown" | "target_not_configured" | "target_unknown";
export interface ApplicationUpdateVerdict {
  state: ApplicationUpdateState;
  reason: ApplicationUpdateReason | null;
}

export const APPLICATION_UPDATE_LABELS: Record<ApplicationUpdateState, string> = {
  up_to_date: "À jour",
  update_available: "Mise à jour disponible",
  unknown: "Vérification impossible",
};
export const APPLICATION_UPDATE_REASON_LABELS: Record<ApplicationUpdateReason, string> = {
  simulated: "Mode simulation : la version disponible n'est pas consultée.",
  installed_unknown: "La version installée de l'application est inconnue.",
  target_not_configured: "Ce mode ne dispose d'aucune source de mise à jour configurée.",
  target_unknown: "La version disponible n'a pas pu être confirmée (hors ligne ou service de mise à jour indisponible).",
};

function unknown(reason: ApplicationUpdateReason): ApplicationUpdateVerdict {
  return { state: "unknown", reason };
}

export function availableApplicationVersion(updates: Pick<ProviderUpdates, "host" | "target">): string | null {
  if (updates.host === "browser" || updates.target === null) return null;
  return updates.host === "mac" ? updates.target.version : updates.target.id;
}

export function applicationUpdateVerdict(input: {
  host: ProviderUpdates["host"];
  simulated: boolean;
  installed: string | null;
  available: string | null;
}): ApplicationUpdateVerdict {
  const { host, installed, available } = input;
  if (input.simulated) return unknown("simulated");
  if (installed === null) return unknown("installed_unknown");
  if (host === "browser") return unknown("target_not_configured");
  if (available === null) return unknown("target_unknown");
  if (host !== "mac") return { state: installed === available ? "up_to_date" : "update_available", reason: null };
  if (!providerVersionSchema.safeParse(installed).success) return unknown("installed_unknown");
  if (!providerVersionSchema.safeParse(available).success) return unknown("target_unknown");
  return { state: compareAppVersions(installed, available) < 0 ? "update_available" : "up_to_date", reason: null };
}
