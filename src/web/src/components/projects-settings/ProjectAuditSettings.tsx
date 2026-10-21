import { Loader2, ShieldCheck } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { AUDIT_CARD_MODES, AUDIT_MAX_AUTO_LAUNCH, AUDIT_MAX_PARALLEL_SESSIONS } from "@shared/audit";
import type { AuditProjectSettings, AuditProjectView } from "@shared/audit";
import { DEFAULT_VCS_PROVIDER } from "@shared/constants";
import type { ProjectInfo } from "@shared/schemas";

import { AdvancedSection } from "@/components/projects-settings/ProjectPanelParts";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { BranchCombobox, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { useBoard } from "@/hooks/useBoard";
import { useBusyAction } from "@/hooks/useBusyAction";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useSavedFlag } from "@/hooks/useSavedFlash";
import { useTickTimer } from "@/hooks/useTickTimer";
import { api } from "@/lib/api";
import {
  AUDIT_CARD_MODE_HINTS,
  AUDIT_CARD_MODE_LABELS,
  AUDIT_UNSUPPORTED_MESSAGE,
  DEFAULT_AUDIT_SETTINGS,
  browserTimeZone,
  formatAuditDayTime,
  latestRunsByProject,
} from "@/lib/auditDisplay";
import { feasibilityEngineTabOptions } from "@/lib/display";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { boardStore } from "@/lib/store";

const DAILY_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const HINT_CLASSES = "text-xs text-muted-foreground";

export type AuditSettingsProject = Pick<ProjectInfo, "key" | "label" | "baseBranch" | "vcsProvider">;

interface ProjectAuditSettingsProps {
  project: AuditSettingsProject;
  /** Hidden when the section is already shown inside the Audits view. */
  showAuditsLink?: boolean;
}

function clampAutoLaunch(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(AUDIT_MAX_AUTO_LAUNCH, Math.max(1, Math.floor(value)));
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[7rem_1fr] sm:gap-3">
      <span className={FIELD_LABEL_CLASSES}>{label}</span>
      <div className="min-w-0 space-y-1.5">{children}</div>
    </div>
  );
}

/** Self-saving "Audit quotidien" section of a project, next to the Coolify previews. */
export function ProjectAuditSettings({ project, showAuditsLink = true }: ProjectAuditSettingsProps) {
  const { audits } = useBoard();
  const capabilities = useCapabilities();
  const now = useTickTimer();
  const fieldId = useId();
  const [savedView, setSavedView] = useState<AuditProjectView | null>(null);
  const [draft, setDraft] = useState<AuditProjectSettings | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [branches, setBranches] = useState<string[] | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const { busy, error, run } = useBusyAction();
  const { saved, flashSaved } = useSavedFlag();

  const view = audits.projects.find((entry) => entry.project === project.key) ?? savedView;
  const savedSettings = view?.settings ?? DEFAULT_AUDIT_SETTINGS;
  const current = draft ?? savedSettings;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(savedSettings);
  const supported = view?.supported ?? (project.vcsProvider ?? DEFAULT_VCS_PROVIDER) === "github";
  const timeValid = DAILY_TIME_PATTERN.test(current.dailyTime);
  const lastRun = latestRunsByProject(audits.runs).get(project.key);
  const observationUntil = view?.state.observationUntil ?? null;
  const inObservation = observationUntil === null || observationUntil > now;
  const branchLabel = current.branch ?? project.baseBranch;
  const set = (patch: Partial<AuditProjectSettings>): void => setDraft({ ...current, ...patch });

  const toggleEnabled = (enabled: boolean): void => {
    const neverEnabled = (view?.state.enabledAt ?? null) === null;
    set(enabled && neverEnabled ? { enabled, timeZone: browserTimeZone() } : { enabled });
  };

  const toggleAdvanced = (): void => {
    const opening = !advancedOpen;
    setAdvancedOpen(opening);
    if (!opening || branches !== null) return;
    void api.projectBranches(project.key).then(setBranches, () => setBranches([]));
  };

  const save = async (): Promise<void> => {
    await run(async () => {
      const updated = await api.updateProjectAudit(project.key, current);
      setSavedView(updated);
      setDraft(null);
      flashSaved();
    }, "Impossible d'enregistrer l'audit du projet.");
  };

  const runNow = async (): Promise<void> => {
    setRunMessage(null);
    const started = await run(() => api.runProjectAudit(project.key), "Impossible de lancer l'audit.");
    if (started) setRunMessage("Audit lancé. Suivez-le dans la vue Audits.");
  };

  const executionHint = capabilities.prOnly
    ? "Serveur toujours allumé : l'audit part à l'heure prévue."
    : "L'app doit être ouverte à l'heure de l'audit, sinon il est rattrapé au démarrage.";

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h4 className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-primary" />Audit quotidien</h4>
          <p className={HINT_CLASSES}>Relit chaque jour les commits fusionnés sur la branche et ne signale que les problèmes bloquants vérifiés : sécurité, logique métier, régressions, intégrité des données.</p>
        </div>
        <Switch aria-label="Activer l'audit quotidien" checked={supported && current.enabled} disabled={!supported || busy} onCheckedChange={toggleEnabled} />
      </div>
      {!supported && <p className="text-sm text-muted-foreground">{AUDIT_UNSUPPORTED_MESSAGE}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {supported && (
        <>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-2xs text-muted-foreground">
            <span className={savedSettings.enabled ? "text-success" : undefined}>●</span>
            <span>{savedSettings.enabled ? "Activé" : "Désactivé"}</span>
            {savedSettings.enabled && view?.nextRunAt != null && <span>· prochain audit {formatAuditDayTime(view.nextRunAt)}</span>}
            {lastRun !== undefined && <span>· dernier {formatAuditDayTime(lastRun.startedAt)}</span>}
            {(view?.pendingTriage ?? 0) > 0 && <span className="text-warning">· {view?.pendingTriage} à trier</span>}
            {showAuditsLink && (
              <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-2xs" onClick={() => boardStore.openAudits({ project: project.key, runId: null, findingId: null })}>Voir les audits →</Button>
            )}
          </div>

          <SettingRow label="Heure">
            <div className="flex flex-wrap items-center gap-2">
              <Input id={`${fieldId}-time`} type="time" aria-label="Heure de l'audit" className="h-8 w-28" value={current.dailyTime} disabled={busy} onChange={(event) => set({ dailyTime: event.target.value })} />
              <span className="font-mono text-2xs text-muted-foreground">{current.timeZone}</span>
            </div>
            {!timeValid && <p role="alert" className="text-xs text-danger">Indiquez une heure au format HH:MM.</p>}
            <p className={HINT_CLASSES}>Un créneau manqué est rattrapé ; aucun commit n'est perdu, l'audit reprend où le précédent s'est arrêté.</p>
          </SettingRow>

          <SettingRow label="Moteur">
            <Tabs
              options={feasibilityEngineTabOptions(capabilities.codex)}
              value={current.provider}
              onChange={(provider) => set({ provider })}
              aria-label="Moteur de l'audit"
            />
            <p className={HINT_CLASSES}>{current.provider === null ? "Par défaut : Claude." : "Un seul moteur par audit, modèle et effort par défaut."}</p>
          </SettingRow>

          <SettingRow label="Cartes">
            <div role="radiogroup" aria-label="Cartes créées depuis l'audit" className="space-y-1.5">
              {AUDIT_CARD_MODES.map((mode) => {
                const hint = AUDIT_CARD_MODE_HINTS[mode];
                return (
                  <label key={mode} className="flex items-start gap-2 text-sm">
                    <input type="radio" name={`${fieldId}-card-mode`} className="mt-1" checked={current.cardMode === mode} disabled={busy} onChange={() => set({ cardMode: mode })} />
                    <span>
                      {AUDIT_CARD_MODE_LABELS[mode]}
                      {hint !== null && <span className="text-muted-foreground"> ({hint})</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            {current.cardMode === "auto_launch" && (
              <div className="space-y-1 pl-5">
                <label className="flex items-center gap-2 text-xs">
                  Au plus
                  <Input type="number" min={1} max={AUDIT_MAX_AUTO_LAUNCH} className="h-7 w-16 text-xs" value={current.autoLaunchMax} disabled={busy} onChange={(event) => set({ autoLaunchMax: clampAutoLaunch(Number(event.target.value)) })} />
                  par audit
                </label>
                <p className={HINT_CLASSES}>Critiques seulement · pas pendant la semaine d'observation · jamais pour une faille de sécurité sur un dépôt public · jamais si une PR existe déjà pour ce constat.</p>
              </div>
            )}
            <p className={HINT_CLASSES}>Les cartes créées depuis un audit ne fusionnent jamais automatiquement leur PR, même si le projet a la fusion auto.</p>
          </SettingRow>

          <SettingRow label="Exécution">
            <p className="font-mono text-2xs text-muted-foreground">s'exécute sur ce poste · {AUDIT_MAX_PARALLEL_SESSIONS} agents à la fois · seulement quand aucune carte ne tourne</p>
            <p className={HINT_CLASSES}>{executionHint} N'activez pas le même projet sur deux postes.</p>
          </SettingRow>

          <AdvancedSection
            open={advancedOpen}
            onToggle={toggleAdvanced}
            summary={`Branche ${branchLabel} · ${current.includeWarnings ? "critiques et avertissements" : "critiques seulement"}`}
          >
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${fieldId}-branch`} className={FIELD_LABEL_CLASSES}>Branche auditée</label>
                <BranchCombobox
                  id={`${fieldId}-branch`}
                  value={current.branch ?? ""}
                  options={branches ?? []}
                  placeholder={`${project.baseBranch} (branche de base)`}
                  disabled={busy || branches === null}
                  onChange={(value) => set({ branch: value.trim() === "" ? null : value.trim() })}
                />
                <p className={HINT_CLASSES}>Vide : la branche de base du projet ({project.baseBranch}).</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch aria-label="Signaler aussi les avertissements" checked={current.includeWarnings} disabled={busy} onCheckedChange={(includeWarnings) => set({ includeWarnings })} />
                Signaler aussi les avertissements
              </label>
            </div>
          </AdvancedSection>

          <div className="flex flex-wrap items-center gap-2">
            <ConfirmPopover
              title="Lancer un audit maintenant"
              description="Des agents en lecture seule relisent les commits pas encore audités."
              confirmLabel="Lancer"
              onConfirm={runNow}
            >
              <Button variant="outline" size="sm" disabled={busy || dirty}>Lancer un audit maintenant</Button>
            </ConfirmPopover>
            <Button size="sm" disabled={busy || !dirty || !timeValid} onClick={() => void save()}>
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              Enregistrer l'audit
            </Button>
            {saved && <span className="text-xs text-primary">Enregistré</span>}
          </div>
          {runMessage && <p role="status" className="text-xs text-primary">{runMessage}</p>}
          {current.enabled && inObservation && (
            <p className={HINT_CLASSES}>Première semaine en mode observation : les constats s'affichent mais aucune carte n'est créée automatiquement.</p>
          )}
        </>
      )}
    </section>
  );
}
