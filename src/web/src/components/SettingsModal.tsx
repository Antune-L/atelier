import { Search } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import {
  AGENT_EFFORTS,
  AGENT_EFFORT_FULL_LABELS,
  AGENT_MODELS,
  AGENT_MODEL_FULL_LABELS,
  CODEX_EFFORT_FULL_LABELS,
  CODEX_MODEL_LABELS,
  COMMIT_LANGUAGES,
  COMMIT_LANGUAGE_LABELS,
  DEFAULT_CODEX_EFFORT,
  DEFAULT_CODEX_MODEL,
  type AgentEffort,
  type AgentModel,
  type CodexEffort,
  type CodexModel,
  type CommitLanguage,
} from "@shared/constants";
import { pairedRuntimeCodexEffort } from "@shared/codexCapabilities";
import { availableSkillProviders } from "@shared/skills";

import { CodexConnectionStatus } from "@/components/CodexConnectionStatus";
import { McpSettings } from "@/components/McpSettings";
import { CoolifySettings } from "@/components/CoolifySettings";
import { GithubAccountsSettings } from "@/components/GithubAccountsSettings";
import { ProfilesSettings } from "@/components/ProfilesSettings";
import { ProjectsSettings } from "@/components/projects-settings/ProjectsSettings";
import { SkillsStatusList } from "@/components/SkillsStatusList";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/settings";
import { Switch } from "@/components/ui/switch";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { patchAppSettings, useAppSettings } from "@/hooks/useAppSettings";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useProfiles } from "@/hooks/useProfiles";
import { refreshProjects, useProjects } from "@/hooks/useProjects";
import { useTheme } from "@/hooks/useTheme";
import { codexEffortTabOptions, codexModelTabOptions, isCodexFastAvailable } from "@/lib/display";
import { THEMES, THEME_PALETTES, type Theme } from "@/lib/theme";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { matchesQuery, normalizeSearch } from "@/lib/search";
import { matchingSettingsSection, sectionMatches, SETTINGS_GROUPS, SETTINGS_SECTIONS } from "@/lib/settingsSearch";
import type { SettingsSectionId } from "@/lib/settingsSearch";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: TabOption<Theme>[] = THEMES.map((theme) => ({ value: theme.value, label: theme.label }));
const LANGUAGE_OPTIONS: TabOption<CommitLanguage>[] = COMMIT_LANGUAGES.map((language) => ({
  value: language,
  label: COMMIT_LANGUAGE_LABELS[language],
}));
const MODEL_OPTIONS: TabOption<AgentModel>[] = AGENT_MODELS.map((model) => ({
  value: model,
  label: AGENT_MODEL_FULL_LABELS[model],
}));
const EFFORT_OPTIONS: TabOption<AgentEffort>[] = AGENT_EFFORTS.map((effort) => ({
  value: effort,
  label: AGENT_EFFORT_FULL_LABELS[effort],
}));
const NO_MATCH_MESSAGE = "Aucun réglage ne correspond à cette recherche.";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [sectionId, setSectionId] = useState<SettingsSectionId>("appearance");
  const [search, setSearch] = useState("");
  const profiles = useProfiles();
  const projects = useProjects();
  const query = normalizeSearch(search);
  const counts: Partial<Record<SettingsSectionId, number>> = {
    profiles: profiles.length,
    projects: projects.length,
  };

  const changeSearch = (value: string): void => {
    setSearch(value);
    const nextQuery = normalizeSearch(value);
    if (nextQuery === "") return;
    const firstMatch = matchingSettingsSection(nextQuery);
    if (firstMatch !== undefined) setSectionId(firstMatch);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) onClose(); }}
      size="lg"
      className="w-[calc(100vw-2rem)] max-w-[1152px]"
      title="Réglages"
    >
      <div className="flex flex-col gap-5 md:flex-row">
        <SettingsNav
          sectionId={sectionId}
          onSelect={setSectionId}
          query={query}
          counts={counts}
          search={search}
          onSearchChange={changeSearch}
        />
        <div className="min-w-0 flex-1">
          <SettingsSectionPanel sectionId={sectionId} query={query} />
        </div>
      </div>
    </Dialog>
  );
}

interface SettingsNavProps {
  sectionId: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  query: string;
  counts: Partial<Record<SettingsSectionId, number>>;
  search: string;
  onSearchChange: (value: string) => void;
}

function SettingsNav({ sectionId, onSelect, query, counts, search, onSearchChange }: SettingsNavProps) {
  return (
    <nav aria-label="Sections des réglages" className="flex w-full shrink-0 flex-col gap-3 md:w-48">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Rechercher un réglage…"
          aria-label="Rechercher un réglage"
          className="h-7 w-full pl-7 text-xs"
        />
      </div>
      {SETTINGS_GROUPS.map((group) => (
        <div key={group} className="flex flex-wrap items-stretch gap-1 md:flex-col md:gap-0">
          <p className={cn("hidden px-1 pb-1 md:block", FIELD_LABEL_CLASSES)}>{group}</p>
          {SETTINGS_SECTIONS.filter((section) => section.group === group).map((section) => {
            const active = section.id === sectionId;
            const count = counts[section.id];
            return (
              <button
                key={section.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onSelect(section.id)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  !sectionMatches(section, query) && "opacity-40",
                )}
              >
                <span>{section.label}</span>
                {count !== undefined && <span className={cn("font-mono text-2xs", active ? "opacity-70" : "text-muted-foreground")}>{count}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SettingsSectionPanel({ sectionId, query }: { sectionId: SettingsSectionId; query: string }) {
  if (sectionId === "appearance") return <AppearanceSettings query={query} />;
  if (sectionId === "defaults") return <AgentDefaultsSettings query={query} />;
  if (sectionId === "quality") return <QualitySettings query={query} />;
  if (sectionId === "profiles") return <ProfilesSettings query={query} />;
  if (sectionId === "projects") return <ProjectsSettings />;
  if (sectionId === "providers") return <ProvidersSettings query={query} />;
  if (sectionId === "skills") return <SkillsSettings query={query} />;
  if (sectionId === "coolify") return <CoolifySettings query={query} />;
  if (sectionId === "github") return <GithubAccountsSettings query={query} />;
  return <McpSettings query={query} />;
}

function AppearanceSettings({ query }: { query: string }) {
  const { theme, setTheme, palette, setPalette } = useTheme();
  const themeVisible = matchesQuery(
    query,
    "Thème",
    "Apparence de l'interface",
    "clair sombre palette",
    ...THEME_PALETTES.flatMap((option) => [option.label, option.value]),
  );
  const currentTheme = THEMES.find((option) => option.value === theme)?.label;
  const currentPalette = THEME_PALETTES.find((option) => option.value === palette)?.label;

  return (
    <div className="space-y-4">
      <SectionHeader title="Apparence" subtitle="Choisissez le thème de votre espace de travail." />
      {themeVisible ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label>Apparence</Label>
              <p className="text-sm text-muted-foreground">Choix actuel : {currentPalette} · {currentTheme}</p>
            </div>
            <Tabs options={THEME_OPTIONS} value={theme} onChange={setTheme} aria-label="Thème" />
          </div>
          <fieldset className="space-y-3" style={{ colorScheme: theme }}>
            <legend className="text-sm font-medium">Palette</legend>
            <div className="flex flex-wrap gap-2">
              {THEME_PALETTES.map((option) => (
                <label
                  key={option.value}
                  className="flex min-w-0 flex-1 basis-44 cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent has-[:checked]:border-ring has-[:checked]:bg-accent focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
                >
                  <input
                    type="radio"
                    name="theme-palette"
                    value={option.value}
                    checked={palette === option.value}
                    onChange={() => setPalette(option.value)}
                    className="mt-1 shrink-0 accent-[hsl(var(--brand))]"
                  />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                  <span
                    className="theme-swatch flex shrink-0 gap-0.5"
                    data-palette={option.value}
                    data-appearance={theme}
                    aria-hidden="true"
                  >
                    <span className="h-6 w-2 rounded-sm border border-border bg-background" />
                    <span className="h-6 w-2 rounded-sm border border-border bg-card" />
                    <span className="h-6 w-2 rounded-sm bg-brand" />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="rounded-md border bg-background p-3" aria-label={`Aperçu du thème ${currentPalette} ${currentTheme}`}>
            <div className="mb-3 flex items-center justify-between border-b pb-2">
              <span className="text-sm font-semibold">Votre tableau</span>
              <span className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Nouvelle carte</span>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 rounded-md bg-muted/40 p-2">
                <p className="mb-2 text-xs text-muted-foreground">À faire</p>
                <div className="rounded border bg-card p-3 text-sm text-card-foreground">Préparer la prochaine évolution</div>
              </div>
              <div className="flex-1 rounded-md bg-muted/40 p-2">
                <p className="mb-2 text-xs text-muted-foreground">Terminé</p>
                <div className="rounded border bg-card p-3 text-sm text-card-foreground">Relire une livraison</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">La palette et l’apparence s’appliquent immédiatement et restent enregistrées sur cet appareil.</p>
        </div>
      ) : <p className="text-sm text-muted-foreground">{NO_MATCH_MESSAGE}</p>}
    </div>
  );
}

interface DefaultsRowSpec { label: string; hint: string }
const FEASIBILITY_ROW: DefaultsRowSpec = { label: "Analyse préalable", hint: "Étude de faisabilité, reformulation et découpage" };
const IMPLEMENTATION_ROW: DefaultsRowSpec = { label: "Implémentation", hint: "Session de code, sans profil" };
const COMMIT_ROW: DefaultsRowSpec = { label: "Livraison", hint: "Langue des PRs et commits" };

function AgentDefaultsSettings({ query }: { query: string }) {
  const { settings, error, saved } = useAppSettings();
  const showFeasibility = matchesQuery(query, FEASIBILITY_ROW.label, FEASIBILITY_ROW.hint, "triage modèle effort langue agents par défaut");
  const showImplementation = matchesQuery(query, IMPLEMENTATION_ROW.label, IMPLEMENTATION_ROW.hint, "modèle effort agents par défaut");
  const showCommit = matchesQuery(query, COMMIT_ROW.label, COMMIT_ROW.hint, "langue pull request agents par défaut");

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Valeurs par défaut"
        subtitle="Sans profil, les prochains tickets utilisent ces valeurs. Les profils conservent leur propre configuration."
      />
      {settings === null ? <p className="text-sm text-muted-foreground">Chargement des valeurs…</p> : (
        <div className="space-y-3">
          {showFeasibility && (
            <DefaultsStageRow
              row={FEASIBILITY_ROW}
              summary={`${AGENT_MODEL_FULL_LABELS[settings.triageModel]} · ${AGENT_EFFORT_FULL_LABELS[settings.triageEffort]} · ${COMMIT_LANGUAGE_LABELS[settings.triageLanguage]}`}
              searching={query !== ""}
            >
              <KnobGroup
                title="Modèle"
                options={MODEL_OPTIONS}
                value={settings.triageModel}
                onChange={(value) => void patchAppSettings({ triageModel: value })}
                label="Modèle de l'étude de faisabilité"
              />
              <KnobGroup
                title="Effort"
                options={EFFORT_OPTIONS}
                value={settings.triageEffort}
                onChange={(value) => void patchAppSettings({ triageEffort: value })}
                label="Effort de l'étude de faisabilité"
              />
              <KnobGroup
                title="Langue"
                options={LANGUAGE_OPTIONS}
                value={settings.triageLanguage}
                onChange={(value) => void patchAppSettings({ triageLanguage: value })}
                label="Langue de l'étude de faisabilité"
              />
            </DefaultsStageRow>
          )}
          {showImplementation && (
            <DefaultsStageRow
              row={IMPLEMENTATION_ROW}
              summary={`Claude · ${AGENT_MODEL_FULL_LABELS[settings.implementModel]} · ${AGENT_EFFORT_FULL_LABELS[settings.implementEffort]}`}
              searching={query !== ""}
            >
              <KnobGroup
                title="Modèle"
                options={MODEL_OPTIONS}
                value={settings.implementModel}
                onChange={(value) => void patchAppSettings({ implementModel: value })}
                label="Modèle d'implémentation"
              />
              <KnobGroup
                title="Effort"
                options={EFFORT_OPTIONS}
                value={settings.implementEffort}
                onChange={(value) => void patchAppSettings({ implementEffort: value })}
                label="Effort d'implémentation"
              />
              <p className="w-full text-xs text-muted-foreground">Les valeurs Codex se règlent dans Fournisseurs ; un profil fixe l'agent utilisé.</p>
            </DefaultsStageRow>
          )}
          {showCommit && (
            <DefaultsStageRow
              row={COMMIT_ROW}
              summary={COMMIT_LANGUAGE_LABELS[settings.commitLanguage]}
              searching={query !== ""}
            >
              <KnobGroup
                title="Langue"
                options={LANGUAGE_OPTIONS}
                value={settings.commitLanguage}
                onChange={(value) => void patchAppSettings({ commitLanguage: value })}
                label="Langue des PRs et des commits"
              />
            </DefaultsStageRow>
          )}
          {!showFeasibility && !showImplementation && !showCommit && <p className="text-sm text-muted-foreground">{NO_MATCH_MESSAGE}</p>}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs">
        <p className="text-muted-foreground">Enregistré automatiquement pour les prochains tickets.</p>{saved && <span className="text-success" role="status">Enregistré</span>}</div>
      {error !== null && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function QualitySettings({ query }: { query: string }) {
  const { settings, error, saved } = useAppSettings();
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Contrôles requis avant livraison"
        subtitle="Les exigences sont définies par projet. Chaque carte conserve les résultats de ses contrôles."
      />
      {settings === null ? <p className="text-sm text-muted-foreground">Chargement de la politique…</p> : (
        <DefaultsStageRow
          row={{ label: "Qui réalise le contrôle ?", hint: "Validations qualité et Devin" }}
          summary={settings.qualityOwner ? "Ce poste est responsable" : "Ce poste ne lance pas les validations"}
          searching={query !== ""}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.qualityOwner}
                onCheckedChange={(value) => void patchAppSettings({ qualityOwner: value }).then(refreshProjects)}
                aria-label="Validation qualité sur ce poste"
              />
              <span className="text-sm">Validation qualité sur ce poste</span>
            </div>
            <p className="text-xs text-muted-foreground">Un seul poste (Mac ou serveur VPS) lance les validations. Désactivez ce rôle ici avant de l'activer ailleurs, quand aucune validation n'est en cours.</p>
          </div>
        </DefaultsStageRow>
      )}
      <details open={query !== "" || undefined} className="rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-medium">Exigences et preuves</summary>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p>Consultez les réglages de chaque projet pour ses contrôles requis avant livraison.</p>
          <p>Une politique configurée n'est pas un contrôle réussi : les résultats et preuves sont disponibles dans la validation de la carte.</p>
        </div>
      </details>
      {saved && <p className="text-xs text-success" role="status">Enregistré</p>}
      {error !== null && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function DefaultsStageRow({ row, summary, searching, children }: { row: DefaultsRowSpec; summary: string; searching: boolean; children: ReactNode }) {
  return (
    <details className="rounded-lg border" open={searching || undefined}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{row.label}</p>
          <p className="mt-1 text-sm">{summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">{row.hint}</p>
        </div>
        <span className="text-xs font-medium text-primary">Modifier</span>
      </summary>
      <div className="flex flex-wrap gap-x-5 gap-y-3 border-t p-4">{children}</div>
    </details>
  );
}

interface KnobGroupProps<T extends string> { title: string; options: TabOption<T>[]; value: T | null; onChange: (value: T) => void; label: string }
function KnobGroup<T extends string>({ title, options, value, onChange, label }: KnobGroupProps<T>) {
  return <div className="flex flex-col gap-1.5">
    <span className={FIELD_LABEL_CLASSES}>{title}</span>
    <Tabs options={options} value={value} onChange={onChange} aria-label={label} />
  </div>;
}

type ProviderTone = "success" | "warning" | "muted";
const PROVIDER_DOT_CLASSES: Record<ProviderTone, string> = { success: "bg-success", warning: "bg-warning", muted: "bg-muted-foreground" };
interface ProviderRowProps { name: string; tone: ProviderTone; status: string; detail: string; children?: ReactNode; searching?: boolean }
function ProviderRow({ name, tone, status, detail, children, searching = false }: ProviderRowProps) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{name}</p>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", PROVIDER_DOT_CLASSES[tone])} aria-hidden />
          <span className="text-xs text-muted-foreground" role="status">{status}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{detail}</p>
      {children && <details open={searching || undefined}>
        <summary className="cursor-pointer text-xs font-medium text-primary">Modifier et voir les détails</summary>
        <div className="mt-3 space-y-3 border-t pt-3">{children}</div>
      </details>}
    </div>
  );
}
const CODEX_STATUS_TONES: Record<string, ProviderTone> = { ready: "success", checking: "muted" };
function ProvidersSettings({ query }: { query: string }) {
  const { codex, composerAvailable, claudeAvailable } = useCapabilities();
  const { settings, error, saved } = useAppSettings();
  const codexModel = settings?.codexModel ?? DEFAULT_CODEX_MODEL;
  const codexEffort = settings?.codexEffort ?? DEFAULT_CODEX_EFFORT;
  const codexFastSuffix = settings?.codexFast ? " · mode rapide" : "";
  const codexDetail = settings === null
    ? "Chargement du modèle configuré…"
    : `${CODEX_MODEL_LABELS[codexModel]} · ${CODEX_EFFORT_FULL_LABELS[codexEffort]}${codexFastSuffix}`;
  const fastAvailable = isCodexFastAvailable(codex, codexModel);
  const codexEffortOptions = codexEffortTabOptions(codexModel, codex).map((option) => ({ ...option, label: CODEX_EFFORT_FULL_LABELS[option.value] }));
  const changeCodexModel = (next: CodexModel): void => {
    const nextEffort: CodexEffort = pairedRuntimeCodexEffort(codex, next, codexEffort);
    const effortPatch = nextEffort === codexEffort ? {} : { codexEffort: nextEffort };
    void patchAppSettings({ codexModel: next, ...effortPatch });
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Agents disponibles"
        subtitle="Détection sur cette machine. Elle ne prouve pas l'exécution d'une session."
      />
      <ProviderRow
        name="Claude"
        tone={claudeAvailable ? "success" : "warning"}
        status={claudeAvailable ? "Détecté" : "Non détecté"}
        detail={settings === null ? "Chargement du modèle configuré…" : `${AGENT_MODEL_FULL_LABELS[settings.implementModel]} · ${AGENT_EFFORT_FULL_LABELS[settings.implementEffort]} par défaut`}
        searching={query !== ""}
      >
        <p className="text-xs text-muted-foreground">{claudeAvailable ? "Programme Claude résolu dans le SDK (bibliothèque de l'agent) ou l'installation utilisateur." : "Claude introuvable : il sera téléchargé au premier lancement d'agent."}</p>
        <p className="text-xs text-muted-foreground">Les modèles Claude se règlent dans Agents par défaut et dans chaque profil.</p>
      </ProviderRow>
      <ProviderRow
        name="Codex"
        tone={CODEX_STATUS_TONES[codex.status] ?? "warning"}
        status={codex.status === "ready" ? "Connecté" : "À vérifier"}
        detail={codexDetail}
        searching={query !== ""}
      >
        <CodexConnectionStatus />
        {settings !== null && <>
          <KnobGroup
            title="Modèle Codex"
            options={codexModelTabOptions(codex)}
            value={settings.codexModel}
            onChange={changeCodexModel}
            label="Modèle Codex"
          />
          <KnobGroup
            title="Effort Codex"
            options={codexEffortOptions}
            value={settings.codexEffort}
            onChange={(value) => void patchAppSettings({ codexEffort: value })}
            label="Effort Codex"
          />
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.codexFast}
              onCheckedChange={(value) => void patchAppSettings({ codexFast: value })}
              disabled={!fastAvailable && !settings.codexFast}
              aria-label="Mode rapide Codex"
            />
            <span className="text-sm">Mode rapide</span>
          </div>
          <p className="text-xs text-muted-foreground">{fastAvailable ? "Réponses plus rapides, consommation accrue." : "Mode rapide indisponible pour ce modèle et ce compte."}</p>
        </>}
        <p className="text-xs text-muted-foreground">Ces valeurs préremplissent les nouveaux profils Codex. Enregistré automatiquement.</p>
        {saved && <p className="text-xs text-success" role="status">Enregistré</p>}
      </ProviderRow>
      <ProviderRow
        name="Composer"
        tone={composerAvailable ? "success" : "warning"}
        status={composerAvailable ? "Détecté" : "Non détecté"}
        detail="Écrit le code sous la responsabilité de Claude."
        searching={query !== ""}
      >
        <p className="text-xs text-muted-foreground">{composerAvailable ? "Cursor sans interface (cursor-agent) installé et authentifié." : "cursor-agent introuvable dans les programmes de la machine."}</p>
      </ProviderRow>
      {error !== null && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function SkillsSettings({ query }: { query: string }) {
  const capabilities = useCapabilities();
  const roots = capabilities.skills[0]?.roots;
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Compétences installées"
        subtitle="Les compétences (skills) donnent aux agents leurs méthodes de travail."
      />
      <SkillsStatusList
        skills={capabilities.skills}
        availableProviders={availableSkillProviders(capabilities)}
        query={query}
      />
      {roots !== undefined && <details open={query !== "" || undefined} className="rounded-md border p-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">Dossiers de détection</summary>
        <p className="mt-2 break-all text-xs text-muted-foreground">Claude : {roots.claude.join(" ou ")}<br />Codex : {roots.codex.join(" ou ")}</p>
      </details>}
    </div>
  );
}
