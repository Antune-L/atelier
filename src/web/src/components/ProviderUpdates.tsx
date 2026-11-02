import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { desktopUpdateStatusSchema } from "@shared/desktopUpdate";
import type { DesktopUpdateStatus } from "@shared/desktopUpdate";
import type { ProviderVersions } from "@shared/providerUpdates";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ProviderLogo } from "@/components/usage/ProviderLogo";
import { VpsUpdateDialog } from "@/components/VpsUpdateDialog";
import { refreshProviderUpdates, useProviderUpdates } from "@/hooks/useProviderUpdates";
import { request } from "@/lib/api";
import { formatDateTime } from "@/lib/display";

const ADOPTION_PHASE_LABELS = { "setup-required": "Configuration requise", queued: "En attente", preparation: "Préparation", qualification: "Vérification des fournisseurs", build: "Construction de l’application", publication: "Publication", ready: "Prêt à installer", failed: "Échec", unknown: "Vérification en attente", unchanged: "Déjà à jour", simulated: "Simulation" };
const PROVIDER_KEYS: Array<keyof ProviderVersions> = ["claude", "codex"];
const ADOPTION_REASON_MESSAGES: Record<string, string> = {
  "Configure the dedicated preparation token and publisher public key on the backend.": "La préparation automatique nécessite une configuration initiale sur cette installation.",
  "Dedicated preparation credentials or publisher public key missing.": "Les accès de préparation ou la clé de vérification ne sont pas configurés sur cette installation.",
  "Dispatch pending acknowledgement. Do not retry an unknown request.": "La demande attend sa confirmation. Une nouvelle préparation ne sera pas lancée tant que son état reste incertain.",
  "Preparation unavailable. Check the dedicated service configuration.": "La préparation est indisponible. Vérifiez sa configuration initiale.",
  "Preparation unavailable. Check dedicated credentials, workflow setup and the recorded request before retrying.": "La préparation n’a pas pu être confirmée. Vérifiez ses accès et son état avant de réessayer.",
  "Preparation failed or was cancelled. No candidate is approved for installation.": "La préparation a échoué ou a été annulée. Aucune nouvelle version n’est prête à installer.",
  "Exact preparation or signed qualification could not be verified. Installation remains disabled.": "La validation de cette version n’a pas pu être vérifiée. L’installation reste désactivée.",
};

const NATIVE_ORIGINS = { package: "paquet", bundled: "application", configured: "configuration", provisioned: "géré par l'application", user: "installation utilisateur", unknown: "origine inconnue", simulated: "simulation" };

export function ProviderUpdates() {
  const { data, adoption, loading, error } = useProviderUpdates();
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showVps, setShowVps] = useState(false);
  const [desktop, setDesktop] = useState<DesktopUpdateStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rows = data?.rows ?? [];
  const target = data?.target;
  const candidateIsInstalled = !!adoption?.providers && PROVIDER_KEYS.every((provider) => rows.find((row) => row.provider === provider)?.installed === adoption.providers?.[provider]);
  const hasUnqualified = target !== null && target !== undefined && rows.some((row) => row.latest !== null && row.latest !== target?.providers[row.provider] && row.latest !== row.installed);
  async function update(): Promise<void> {
    if (!data || !target) return;
    if (data.host === "vps") { setShowVps(true); return; }
    setBusy(true);
    setActionError(null);
    try {
      if (data.host === "source") {
        const result = await request("/api/internal/update", { method: "POST", headers: { "x-kanban-update": "confirm", "x-kanban-adoption": "confirm" }, body: JSON.stringify({ target: target.id }), signal: AbortSignal.timeout(700_000) });
        if (typeof result === "object" && result !== null && "mode" in result && result.mode === "reload") window.location.reload();
        else setNotice("Redémarrage demandé. Si l'application ne revient pas, consultez .update.log dans le checkout.");
      } else if (data.host === "mac") {
        const action = desktop?.phase === "ready" ? "install" : "prepare";
        const result = desktopUpdateStatusSchema.parse(await request(`/api/desktop-update/${action}`, { method: "POST", headers: { "x-kanban-update": "confirm", "x-kanban-adoption": "confirm" }, body: JSON.stringify({ target: target.id }), signal: AbortSignal.timeout(240_000) }));
        setDesktop(result);
        setNotice(result.message);
        if (result.phase === "failed") setActionError(result.message);
      }
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Mise à jour interrompue. Vérifiez l'état avant toute nouvelle tentative."); }
    finally { setBusy(false); }
  }
  let actionLabel = "Mettre à jour l'application";
  if (data?.host === "vps") actionLabel = "Mettre à jour le VPS";
  if (data?.host === "mac") actionLabel = desktop?.phase === "ready" ? "Installer et redémarrer" : "Préparer la mise à jour Mac";
  return (
    <section aria-label="Versions des fournisseurs" className="space-y-3 border-b pb-4">
      <div className="flex items-start justify-between gap-4">
        <div><h3 className="text-base font-semibold">Versions des fournisseurs</h3><p className="text-xs text-muted-foreground">Installées avec l'application. Les dernières publications sont indiquées séparément.</p></div>
        <button type="button" title="Vérifier les mises à jour" aria-label="Vérifier les mises à jour" aria-busy={loading} disabled={loading || busy} onClick={() => { setConfirmed(false); setDesktop(null); void refreshProviderUpdates(true); }} className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`} aria-hidden />
        </button>
      </div>
      <div className="divide-y rounded-md border">
        {PROVIDER_KEYS.map((provider) => {
          const row = rows.find((entry) => entry.provider === provider);
          const name = provider === "claude" ? "Claude Agent SDK" : "Codex SDK";
          return <div key={provider} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">{row && <ProviderLogo provider={row.provider} />}<span className="text-sm font-medium">{name}</span></div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs"><span>Installée <strong className="font-mono font-medium">{row?.installed ?? "Inconnue"}</strong></span><span className="text-muted-foreground">Dernière publiée <strong className="font-mono font-medium text-foreground">{row?.latest ?? "Inconnue"}</strong>{row?.state === "stale" && " (périmée)"}</span></div>
            <p className="w-full text-xs text-muted-foreground">{data?.simulated ? "Simulation, programme natif non lancé." : `Programme natif : ${row?.nativeVersion ?? "non mesuré"} (${NATIVE_ORIGINS[row?.nativeOrigin ?? "unknown"]}).`}{!data?.simulated && row?.message && ` ${row.message}`}</p>
          </div>;
        })}
      </div>
      <p role="status" className="text-xs text-muted-foreground">{loading ? "Vérification en cours…" : `Dernière vérification : ${data && data.checkedAt > 0 ? formatDateTime(data.checkedAt) : "jamais"}.`}{data?.simulated && " Mode simulation."}</p>
      {target && <p className="text-xs">Inclus dans l’application cible {target.version} : Claude {target.providers.claude}, Codex {target.providers.codex}.</p>}
      <div className="space-y-2">
        <p className="text-xs">Préparer une version de l’application avec les dernières versions stables des deux fournisseurs. L’installation et le redémarrage demandent une confirmation séparée.</p>
        <Button size="sm" disabled={busy || !!adoption && ["queued", "preparation", "qualification", "build", "publication", "unknown"].includes(adoption.phase)} onClick={() => {
          setBusy(true);
          void request("/api/provider-adoption", { method: "POST", headers: { "x-kanban-update": "confirm" }, body: JSON.stringify({ confirmed: true }) }).then(() => refreshProviderUpdates()).catch((cause: unknown) => setActionError(cause instanceof Error ? cause.message : "Préparation indisponible.")).finally(() => setBusy(false));
        }}>Préparer les derniers fournisseurs</Button>
        {adoption && <p role="status" className="text-xs">{candidateIsInstalled ? "Fournisseurs installés" : ADOPTION_PHASE_LABELS[adoption.phase]} · {adoption.providers && `Claude ${adoption.providers.claude}, Codex ${adoption.providers.codex}`} {ADOPTION_REASON_MESSAGES[adoption.reason ?? ""] ?? adoption.reason}</p>}
      </div>
      {hasUnqualified && <p className="text-xs text-muted-foreground">Certaines publications ne sont pas incluses dans cette version de l'application. Elles ne seront pas installées séparément.</p>}
      {data?.message && data.host !== "mac" && <p className="text-xs text-muted-foreground">{data.message}</p>}
      {data?.host === "mac" && data.message && <details className="text-xs text-muted-foreground"><summary>État de la mise à jour Mac : {data.available ? "version disponible" : "vérification ou intervention requise"}</summary><p className="mt-1 break-words">{data.message}</p></details>}
      {data?.maintenance && <p role="status" className="text-sm text-warning">Maintenance en cours ou interrompue. Les nouveaux travaux attendent ; terminez la réparation avant de redémarrer.</p>}
      {data?.available && target && adoption?.phase === "ready" && !candidateIsInstalled && !showVps && <div className="space-y-2">
        {data.host !== "vps" && <label className="flex items-center gap-2 text-xs"><Switch checked={confirmed} onCheckedChange={setConfirmed} disabled={busy} aria-label="Confirmer la version et le redémarrage" />Je confirme cette version et le redémarrage de l'application.</label>}
        <Button size="sm" disabled={busy || desktop?.phase === "installing" || data.maintenance || (data.host !== "vps" && !confirmed)} onClick={() => void update()}>{busy ? "Opération en cours…" : actionLabel}</Button>
      </div>}
      {showVps && target && <VpsUpdateDialog target={target.id} providers={target.providers} onClose={() => setShowVps(false)} />}
      {data?.host === "mac" && <a className="text-xs underline underline-offset-2" href={desktop?.manualUrl ?? "https://github.com/Antune-L/atelier/releases/latest"} target="_blank" rel="noreferrer">Téléchargement manuel de l’application complète</a>}
      {notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {actionError && <div role="alert" className="space-y-1 text-sm text-destructive"><p>La mise à jour n'a pas abouti. Vérifiez son état avant de réessayer.</p><details className="text-xs"><summary>Détails techniques</summary><p className="mt-1 break-words">{actionError}</p></details></div>}
    </section>
  );
}
