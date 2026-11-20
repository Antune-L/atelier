import { APPLICATION_UPDATE_LABELS, APPLICATION_UPDATE_REASON_LABELS, applicationUpdateVerdict, availableApplicationVersion } from "@shared/applicationUpdate";
import type { ApplicationUpdateState } from "@shared/applicationUpdate";
import type { ProviderUpdates } from "@shared/providerUpdates";

const COMMIT_SHA = /^[a-f0-9]{40}$/;
const SHORT_SHA_LENGTH = 7;
const STATE_CLASSES: Record<ApplicationUpdateState, string> = {
  up_to_date: "text-success",
  update_available: "text-warning",
  unknown: "text-muted-foreground",
};

function VersionValue({ value }: { value: string | null }) {
  if (value === null) return <strong className="font-mono font-medium">Inconnue</strong>;
  if (COMMIT_SHA.test(value)) return <strong className="font-mono font-medium" title={value}>{value.slice(0, SHORT_SHA_LENGTH)}</strong>;
  return <strong className="font-mono font-medium">{value}</strong>;
}

export function ApplicationVersionStatus({ updates, available }: { updates: ProviderUpdates; available?: string | null }) {
  const availableVersion = available === undefined ? availableApplicationVersion(updates) : available;
  const verdict = applicationUpdateVerdict({ host: updates.host, simulated: updates.simulated, installed: updates.installed, available: availableVersion });
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border px-3 py-2.5">
      <span className="text-sm font-medium">Application Atelier</span>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <span>Installée <VersionValue value={updates.installed} /></span>
        <span className="text-muted-foreground">Disponible <VersionValue value={availableVersion} /></span>
        <span role="status" className={`font-medium ${STATE_CLASSES[verdict.state]}`}>{APPLICATION_UPDATE_LABELS[verdict.state]}</span>
      </div>
      {verdict.reason !== null && <p className="w-full text-xs text-muted-foreground">{APPLICATION_UPDATE_REASON_LABELS[verdict.reason]}</p>}
    </div>
  );
}
