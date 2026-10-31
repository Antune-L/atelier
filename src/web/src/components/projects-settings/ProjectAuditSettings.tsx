import { Loader2, ShieldCheck } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import {
  AUDIT_CARD_MODES,
  AUDIT_DAILY_SESSION_LIMIT,
  AUDIT_HOURS_PER_DAY,
  AUDIT_MAX_AUTO_LAUNCH,
  AUDIT_MAX_INTERVAL_HOURS,
  AUDIT_MAX_PARALLEL_SESSIONS,
  AUDIT_MIN_INTERVAL_HOURS,
  AUDIT_MIN_RUN_SESSIONS,
} from "@shared/audit";
import type { AuditProjectSettings, AuditProjectView } from "@shared/audit";
import { addDays, isWeekendDateKey, upcomingAuditSlots, zonedDateKey } from "@shared/auditSchedule";
import { DEFAULT_VCS_PROVIDER } from "@shared/constants";
import type { ProjectInfo } from "@shared/schemas";

import { AdvancedSection, FeatureRow, type FeatureStatus } from "@/components/projects-settings/ProjectPanelParts";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { BranchCombobox, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { useBoard } from "@/hooks/useBoard";
import { useBusyAction } from "@/hooks/useBusyAction";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useSavedFlag } from "@/hooks/useSavedFlash";
import { useTickTimer } from "@/hooks/useTickTimer";
import { api } from "@/lib/api";
import {
  AUDIT_CADENCE_PRESETS,
  AUDIT_CARD_MODE_HINTS,
  AUDIT_CARD_MODE_LABELS,
  AUDIT_UNSUPPORTED_MESSAGE,
  DEFAULT_AUDIT_SETTINGS,
  browserTimeZone,
  formatAuditCadence,
  formatAuditDateKey,
  formatAuditDayTime,
  latestRunsByProject,
} from "@/lib/auditDisplay";
import { feasibilityEngineTabOptions } from "@/lib/display";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { boardStore } from "@/lib/store";

const DAILY_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const HINT_CLASSES = "text-xs text-muted-foreground";
const CUSTOM_CADENCE = "custom";
const UPCOMING_SLOT_COUNT = 5;
const DATE_OPTION_COUNT = AUDIT_MAX_INTERVAL_HOURS / AUDIT_HOURS_PER_DAY + 1;
const TODAY_OFFSET = 0;
const TOMORROW_OFFSET = 1;
const RELATIVE_DAY_LABELS: Record<number, string> = { [TODAY_OFFSET]: "Aujourd'hui", [TOMORROW_OFFSET]: "Demain" };
const CADENCE_OPTIONS = [
  ...AUDIT_CADENCE_PRESETS.map((preset) => ({ value: String(preset.hours), label: preset.label })),
  { value: CUSTOM_CADENCE, label: "Personnalisé" },
];

export type AuditSettingsProject = Pick<ProjectInfo, "key" | "label" | "baseBranch" | "vcsProvider">;

interface ProjectAuditSettingsProps {
  project: AuditSettingsProject;
  /** Hidden when the section is already shown inside the Audits view. */
  showAuditsLink?: boolean;
  collapsible?: boolean;
}

const AUDIT_DESCRIPTION = "Relit à intervalle régulier les commits fusionnés sur la branche et ne signale que les problèmes bloquants vérifiés : sécurité, logique métier, régressions, intégrité des données.";
const AUDIT_SUMMARY = "Repérer les problèmes bloquants dans les commits fusionnés.";

function auditStatus(supported: boolean, enabled: boolean): FeatureStatus {
  if (!supported) return { label: "Non disponible", variant: "outline" };
  return enabled ? { label: "Activé", variant: "success" } : { label: "Désactivé", variant: "outline" };
}

function clampAutoLaunch(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(AUDIT_MAX_AUTO_LAUNCH, Math.max(1, Math.floor(value)));
}

function isValidInterval(hours: number): boolean {
  return Number.isInteger(hours) && hours >= AUDIT_MIN_INTERVAL_HOURS && hours <= AUDIT_MAX_INTERVAL_HOURS;
}

function dateOptions(settings: AuditProjectSettings, now: number): { value: string; label: string }[] {
  const today = zonedDateKey(now, settings.timeZone);
  return Array.from({ length: DATE_OPTION_COUNT }, (_, offset) => ({ offset, value: addDays(today, offset) }))
    .filter((option) => !settings.skipWeekends || !isWeekendDateKey(option.value))
    .map((option) => ({ value: option.value, label: RELATIVE_DAY_LABELS[option.offset] ?? formatAuditDateKey(option.value) }));
}

function budgetSummary(intervalHours: number): { text: string; high: boolean } {
  const runsPerDay = intervalHours < AUDIT_HOURS_PER_DAY ? Math.ceil(AUDIT_HOURS_PER_DAY / intervalHours) : 1;
  const sessions = runsPerDay * AUDIT_MIN_RUN_SESSIONS;
  const runs = runsPerDay === 1 ? "au plus 1 audit par jour" : `jusqu'à ${runsPerDay} audits par jour`;
  return { text: `${runs} · au moins ${sessions} sessions sur ${AUDIT_DAILY_SESSION_LIMIT}`, high: sessions * 2 > AUDIT_DAILY_SESSION_LIMIT };
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[7rem_1fr] sm:gap-3">
      <span className={FIELD_LABEL_CLASSES}>{label}</span>
      <div className="min-w-0 space-y-1.5">{children}</div>
    </div>
  );
}

/** Self-saving "Audit planifié" section of a project, next to the Coolify previews. */
export function ProjectAuditSettings({ project, showAuditsLink = true, collapsible = false }: ProjectAuditSettingsProps) {
  const [rowOpen, setRowOpen] = useState(false);
  const { audits } = useBoard();
  const capabilities = useCapabilities();
  const now = useTickTimer();
  const fieldId = useId();
  const [savedView, setSavedView] = useState<AuditProjectView | null>(null);
  const [draft, setDraft] = useState<AuditProjectSettings | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [branches, setBranches] = useState<string[] | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState<string | null>(null);
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
  const upcoming = upcomingAuditSlots(current, now, UPCOMING_SLOT_COUNT);
  const nextDate = upcoming[0] === undefined ? null : zonedDateKey(upcoming[0], current.timeZone);
  const isPreset = AUDIT_CADENCE_PRESETS.some((preset) => preset.hours === current.intervalHours);
  const cadence = customOpen || !isPreset ? CUSTOM_CADENCE : String(current.intervalHours);
  const customValid = customText === null || isValidInterval(Number(customText));
  const hasSlots = upcoming.length > 0;
  const budget = budgetSummary(current.intervalHours);
  const changeInterval = (intervalHours: number): void => set({ intervalHours, anchorDate: nextDate ?? current.anchorDate });

  const chooseCadence = (value: string): void => {
    if (value === CUSTOM_CADENCE) {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    setCustomText(null);
    changeInterval(Number(value));
  };

  const changeCustomHours = (value: string): void => {
    setCustomText(value);
    const hours = Number(value);
    if (isValidInterval(hours)) changeInterval(hours);
  };

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
      setCustomText(null);
      flashSaved();
    }, "Impossible d'enregistrer l'audit du projet.");
  };

  const runNow = async (): Promise<void> => {
    setRunMessage(null);
    const started = await run(() => api.runProjectAudit(project.key), "Impossible de lancer l'audit.");
    if (started) setRunMessage("Audit lancé. Suivez-le dans la vue Audits.");
  };

  const executionHint = capabilities.cloudHost
    ? "Serveur toujours allumé : l'audit part à l'heure prévue."
    : "L'app doit être ouverte à l'heure de l'audit, sinon il est rattrapé au démarrage.";

  const enableSwitch = (
    <Switch aria-label="Activer l'audit planifié" checked={supported && current.enabled} disabled={!supported || busy} onCheckedChange={toggleEnabled} />
  );
  const icon = <ShieldCheck className="size-4 text-primary" />;

  const body = (
    <>
      {!supported && !collapsible && <p className="text-sm text-muted-foreground">{AUDIT_UNSUPPORTED_MESSAGE}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {supported && (
        <>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-2xs text-muted-foreground">
            <span className={savedSettings.enabled ? "text-success" : undefined}>●</span>
            <span>{savedSettings.enabled ? "Activé" : "Désactivé"}</span>
            {savedSettings.enabled && <span>· {formatAuditCadence(savedSettings)}</span>}
            {savedSettings.enabled && view?.nextRunAt != null && <span>· prochain audit {formatAuditDayTime(view.nextRunAt)}</span>}
            {lastRun !== undefined && <span>· dernier {formatAuditDayTime(lastRun.startedAt)}</span>}
            {(view?.pendingTriage ?? 0) > 0 && <span className="text-warning">· {view?.pendingTriage} à trier</span>}
            {showAuditsLink && (
              <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-2xs" onClick={() => boardStore.openAudits({ project: project.key, runId: null, findingId: null })}>Voir les audits →</Button>
            )}
          </div>

          <SettingRow label="Rythme">
            <Tabs options={CADENCE_OPTIONS} value={cadence} onChange={chooseCadence} aria-label="Rythme de l'audit" />
            {cadence === CUSTOM_CADENCE && (
              <label className="flex flex-wrap items-center gap-2 text-sm">
                Toutes les
                <Input
                  type="number"
                  min={AUDIT_MIN_INTERVAL_HOURS}
                  max={AUDIT_MAX_INTERVAL_HOURS}
                  aria-label="Intervalle en heures"
                  aria-invalid={!customValid}
                  className="h-8 w-20"
                  value={customText ?? String(current.intervalHours)}
                  disabled={busy}
                  onChange={(event) => changeCustomHours(event.target.value)}
                />
                heures
                <span className="font-mono text-2xs text-muted-foreground">{AUDIT_MIN_INTERVAL_HOURS} à {AUDIT_MAX_INTERVAL_HOURS} h</span>
              </label>
            )}
            {!customValid && <p role="alert" className="text-xs text-danger">Indiquez un nombre entier d'heures entre {AUDIT_MIN_INTERVAL_HOURS} et {AUDIT_MAX_INTERVAL_HOURS}.</p>}
            <label className="flex items-center gap-2 text-sm">
              <Switch aria-label="Pas d'audit le week-end" checked={current.skipWeekends} disabled={busy} onCheckedChange={(skipWeekends) => set({ skipWeekends })} />
              Pas d'audit le week-end
            </label>
            {current.skipWeekends && <p className={HINT_CLASSES}>Les créneaux du samedi et du dimanche sont sautés ; le premier audit de la semaine relit les commits du week-end.</p>}
          </SettingRow>

          <SettingRow label="Prochain audit">
            <div className="flex flex-wrap items-center gap-2">
              <Select aria-label="Jour du prochain audit" className="h-8 text-sm" value={nextDate ?? ""} disabled={busy || !hasSlots} onChange={(event) => set({ anchorDate: event.target.value })}>
                {dateOptions(current, now).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <span className="text-sm">à</span>
              <Input id={`${fieldId}-time`} type="time" aria-label="Heure du prochain audit" className="h-8 w-28" value={current.dailyTime} disabled={busy} onChange={(event) => set({ dailyTime: event.target.value })} />
              <span className="font-mono text-2xs text-muted-foreground">{current.timeZone}</span>
            </div>
            {!timeValid && <p role="alert" className="text-xs text-danger">Indiquez une heure au format HH:MM.</p>}
            {timeValid && !hasSlots && <p role="alert" className="text-xs text-danger">Ce rythme ne tombe que le week-end : aucun audit ne serait lancé.</p>}
            {timeValid && hasSlots && (
              <p className="font-mono text-2xs text-muted-foreground">{upcoming.map(formatAuditDayTime).join(" · ")}</p>
            )}
            <p className={HINT_CLASSES}>Les rythmes en jours gardent la même heure locale au changement d'heure. Un créneau manqué est rattrapé ; aucun commit n'est perdu, l'audit reprend où le précédent s'est arrêté.</p>
          </SettingRow>

          <SettingRow label="Budget">
            <p className={budget.high ? "font-mono text-2xs text-warning" : "font-mono text-2xs text-muted-foreground"}>{budget.text}</p>
            {budget.high && <p className={HINT_CLASSES}>Plus de la moitié du budget quotidien du poste : les autres projets audités risquent d'attendre.</p>}
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
            <Button size="sm" disabled={busy || !dirty || !timeValid || !customValid || !hasSlots} onClick={() => void save()}>
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
    </>
  );

  if (collapsible) {
    const nextRun = view?.nextRunAt != null ? ` · prochain audit ${formatAuditDayTime(view.nextRunAt)}` : "";
    let description = AUDIT_UNSUPPORTED_MESSAGE;
    if (supported) description = savedSettings.enabled ? `${formatAuditCadence(savedSettings)}${nextRun}` : AUDIT_SUMMARY;
    return (
      <FeatureRow
        title="Audit planifié"
        icon={icon}
        status={auditStatus(supported, savedSettings.enabled)}
        pending={dirty}
        description={description}
        open={rowOpen}
        onToggle={() => setRowOpen((open) => !open)}
      >
        <label className="flex items-center gap-2 text-sm">
          {enableSwitch}
          Activer l'audit planifié
        </label>
        {supported && <p className={HINT_CLASSES}>{AUDIT_DESCRIPTION}</p>}
        {body}
      </FeatureRow>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h4 className="flex items-center gap-2 text-sm font-medium">{icon}Audit planifié</h4>
          <p className={HINT_CLASSES}>{AUDIT_DESCRIPTION}</p>
        </div>
        {enableSwitch}
      </div>
      {body}
    </section>
  );
}
