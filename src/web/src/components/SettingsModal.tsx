import { Search } from "lucide-react";
import { useState } from "react";

import {
  AGENT_EFFORTS,
  AGENT_EFFORT_FULL_LABELS,
  AGENT_MODELS,
  AGENT_MODEL_FULL_LABELS,
  CODEX_EFFORT_FULL_LABELS,
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

import { CodexConnectionStatus } from "@/components/CodexConnectionStatus";
import { ProfilesSettings } from "@/components/ProfilesSettings";
import { ProjectsSettings } from "@/components/ProjectsSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { SectionHeader } from "@/components/ui/settings";
import { Switch } from "@/components/ui/switch";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { patchAppSettings, useAppSettings } from "@/hooks/useAppSettings";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useProfiles } from "@/hooks/useProfiles";
import { useProjects } from "@/hooks/useProjects";
import { useTheme } from "@/hooks/useTheme";
import { codexEffortTabOptions, codexModelTabOptions, isCodexFastAvailable } from "@/lib/display";
import { THEMES, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: TabOption<Theme>[] = THEMES.map((t) => ({ value: t.value, label: t.label }));
const LANGUAGE_OPTIONS: TabOption<CommitLanguage>[] = COMMIT_LANGUAGES.map((l) => ({
  value: l,
  label: COMMIT_LANGUAGE_LABELS[l],
}));
const MODEL_OPTIONS: TabOption<AgentModel>[] = AGENT_MODELS.map((m) => ({
  value: m,
  label: AGENT_MODEL_FULL_LABELS[m],
}));
const EFFORT_OPTIONS: TabOption<AgentEffort>[] = AGENT_EFFORTS.map((e) => ({
  value: e,
  label: AGENT_EFFORT_FULL_LABELS[e],
}));

const NO_MATCH_MESSAGE = "Aucun réglage ne correspond à cette recherche.";

const SETTINGS_GROUPS = ["Application", "Connexions"] as const;
type SettingsGroup = (typeof SETTINGS_GROUPS)[number];

type SettingsSectionId = "appearance" | "defaults" | "profiles" | "projects" | "providers";

interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  group: SettingsGroup;
  keywords: string[];
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "appearance",
    label: "Apparence",
    group: "Application",
    keywords: ["thème", "clair", "sombre", "deep ocean", "couleurs", "interface"],
  },
  {
    id: "defaults",
    label: "Agents par défaut",
    group: "Application",
    keywords: [
      "modèle",
      "effort",
      "langue",
      "triage",
      "faisabilité",
      "implémentation",
      "commit",
      "pull request",
      "étape",
    ],
  },
  {
    id: "profiles",
    label: "Profils",
    group: "Application",
    keywords: ["profil", "orchestrateur", "implémenteur", "préréglage", "sous-agent"],
  },
  {
    id: "projects",
    label: "Projets",
    group: "Application",
    keywords: ["projet", "dépôt", "branche", "scripts", "merge automatique"],
  },
  {
    id: "providers",
    label: "Fournisseurs",
    group: "Connexions",
    keywords: ["codex", "claude", "composer", "cursor", "connexion", "fast", "statut", "détection"],
  },
];

const DIACRITICS_REGEX = /\p{Diacritic}/gu;

function normalize(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase();
}

/** `query` is already normalized; an empty query matches everything. */
function matchesQuery(query: string, ...texts: string[]): boolean {
  if (query === "") return true;
  return normalize(texts.join(" ")).includes(query);
}

function sectionMatches(section: SettingsSection, query: string): boolean {
  return matchesQuery(query, section.label, ...section.keywords);
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/** Settings modal: a grouped sidebar of sections plus a search box filtering sections and rows. */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [sectionId, setSectionId] = useState<SettingsSectionId>("appearance");
  const [search, setSearch] = useState("");
  const profiles = useProfiles();
  const projects = useProjects();

  const query = normalize(search.trim());
  const counts: Partial<Record<SettingsSectionId, number>> = {
    profiles: profiles.length,
    projects: projects.length,
  };

  // Derived in the handler rather than an effect: typing jumps to the first section that still matches.
  const changeSearch = (value: string): void => {
    setSearch(value);
    const nextQuery = normalize(value.trim());
    if (nextQuery === "") return;
    const firstMatch = SETTINGS_SECTIONS.find((section) => sectionMatches(section, nextQuery));
    if (firstMatch !== undefined) setSectionId(firstMatch.id);
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-4xl">
      <ModalHeader>
        <div className="flex flex-col gap-3 min-[720px]:flex-row min-[720px]:items-center min-[720px]:justify-between">
          <ModalTitle>Réglages</ModalTitle>
          <div className="relative min-[720px]:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
              placeholder="Rechercher un réglage…"
              aria-label="Rechercher un réglage"
              className="pl-8"
            />
          </div>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="flex flex-col gap-5 min-[720px]:flex-row">
          <SettingsNav
            sectionId={sectionId}
            onSelect={setSectionId}
            query={query}
            counts={counts}
          />
          <div className="min-w-0 flex-1">
            <SettingsSectionPanel sectionId={sectionId} query={query} />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Fermer</Button>
      </ModalFooter>
    </Modal>
  );
}

interface SettingsNavProps {
  sectionId: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  query: string;
  counts: Partial<Record<SettingsSectionId, number>>;
}

function SettingsNav({ sectionId, onSelect, query, counts }: SettingsNavProps) {
  return (
    <nav
      aria-label="Sections des réglages"
      className="flex shrink-0 gap-4 overflow-x-auto pb-1 min-[720px]:w-56 min-[720px]:flex-col min-[720px]:gap-3 min-[720px]:overflow-x-visible min-[720px]:pb-0"
    >
      {SETTINGS_GROUPS.map((group) => (
        <div
          key={group}
          className="flex shrink-0 items-center gap-1 min-[720px]:flex-col min-[720px]:items-stretch"
        >
          <p className="shrink-0 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-[720px]:pb-1">
            {group}
          </p>
          {SETTINGS_SECTIONS.filter((section) => section.group === group).map((section) => {
            const active = section.id === sectionId;
            const dimmed = !sectionMatches(section, query);
            const count = counts[section.id];
            return (
              <button
                key={section.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onSelect(section.id)}
                className={cn(
                  "flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  dimmed && "opacity-40",
                )}
              >
                <span>{section.label}</span>
                {count !== undefined && (
                  <Badge variant={active ? "outline" : "secondary"}>{count}</Badge>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SettingsSectionPanel({
  sectionId,
  query,
}: {
  sectionId: SettingsSectionId;
  query: string;
}) {
  if (sectionId === "appearance") return <AppearanceSettings query={query} />;
  if (sectionId === "defaults") return <AgentDefaultsSettings query={query} />;
  if (sectionId === "profiles") return <ProfilesSettings />;
  if (sectionId === "projects") return <ProjectsSettings />;
  return <ProvidersSettings />;
}

/** Theme picker; the only row here, hidden when the search query doesn't match it. */
function AppearanceSettings({ query }: { query: string }) {
  const { theme, setTheme } = useTheme();
  const themeVisible = matchesQuery(query, "Thème", "Apparence de l'interface", "clair sombre");

  return (
    <div className="space-y-4">
      <SectionHeader title="Apparence" subtitle="Réglages visuels de l'interface." />
      {themeVisible ? (
        <div className="flex flex-col items-start gap-1.5 rounded-md border p-3">
          <Label>Thème</Label>
          <p className="text-sm text-muted-foreground">Apparence de l'interface</p>
          <Tabs options={THEME_OPTIONS} value={theme} onChange={setTheme} aria-label="Thème" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{NO_MATCH_MESSAGE}</p>
      )}
    </div>
  );
}

interface DefaultsRowSpec {
  label: string;
  hint: string;
}

const FEASIBILITY_ROW: DefaultsRowSpec = {
  label: "Étude de faisabilité",
  hint: "Analyse, reformulation, découpage",
};
const IMPLEMENTATION_ROW: DefaultsRowSpec = {
  label: "Implémentation",
  hint: "Session de code, sans profil",
};
const COMMIT_ROW: DefaultsRowSpec = {
  label: "PRs et commits",
  hint: "Messages de commit, titre et description de PR",
};

/** Per-stage defaults used when a ticket carries no profile, laid out as a step × knob matrix. */
function AgentDefaultsSettings({ query }: { query: string }) {
  const { settings, error, saved } = useAppSettings();
  const showFeasibility = matchesQuery(query, FEASIBILITY_ROW.label, FEASIBILITY_ROW.hint);
  const showImplementation = matchesQuery(query, IMPLEMENTATION_ROW.label, IMPLEMENTATION_ROW.hint);
  const showCommit = matchesQuery(query, COMMIT_ROW.label, COMMIT_ROW.hint);
  const hasVisibleRow = showFeasibility || showImplementation || showCommit;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Agents par défaut"
        subtitle="Valeurs utilisées quand un ticket n'a pas de profil. Un profil les remplace entièrement."
      />
      {!hasVisibleRow ? (
        <p className="text-sm text-muted-foreground">{NO_MATCH_MESSAGE}</p>
      ) : (
        <div className="divide-y rounded-md border">
          {showFeasibility && (
            <DefaultsStageRow row={FEASIBILITY_ROW}>
              <KnobGroup
                title="Modèle"
                options={MODEL_OPTIONS}
                value={settings?.triageModel ?? null}
                onChange={(v) => void patchAppSettings({ triageModel: v })}
                label="Modèle de l'étude de faisabilité"
              />
              <KnobGroup
                title="Effort"
                options={EFFORT_OPTIONS}
                value={settings?.triageEffort ?? null}
                onChange={(v) => void patchAppSettings({ triageEffort: v })}
                label="Effort de l'étude de faisabilité"
              />
              <KnobGroup
                title="Langue"
                options={LANGUAGE_OPTIONS}
                value={settings?.triageLanguage ?? null}
                onChange={(v) => void patchAppSettings({ triageLanguage: v })}
                label="Langue de l'étude de faisabilité"
              />
            </DefaultsStageRow>
          )}
          {showImplementation && (
            <DefaultsStageRow row={IMPLEMENTATION_ROW}>
              <KnobGroup
                title="Modèle"
                options={MODEL_OPTIONS}
                value={settings?.implementModel ?? null}
                onChange={(v) => void patchAppSettings({ implementModel: v })}
                label="Modèle d'implémentation"
              />
              <KnobGroup
                title="Effort"
                options={EFFORT_OPTIONS}
                value={settings?.implementEffort ?? null}
                onChange={(v) => void patchAppSettings({ implementEffort: v })}
                label="Effort d'implémentation"
              />
            </DefaultsStageRow>
          )}
          {showCommit && (
            <DefaultsStageRow row={COMMIT_ROW}>
              <KnobGroup
                title="Langue"
                options={LANGUAGE_OPTIONS}
                value={settings?.commitLanguage ?? null}
                onChange={(v) => void patchAppSettings({ commitLanguage: v })}
                label="Langue des PRs et des commits"
              />
            </DefaultsStageRow>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">
          Les changements s'appliquent aux prochains tickets. Enregistré automatiquement.
        </p>
        {saved && <span className="text-xs text-success">Enregistré</span>}
      </div>
      {error !== null && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** One stage block: the step identity on the left, its knob groups wrapping on the right. */
function DefaultsStageRow({ row, children }: { row: DefaultsRowSpec; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-x-6 gap-y-3 p-3">
      <div className="w-44 shrink-0">
        <p className="text-sm font-medium">{row.label}</p>
        <p className="text-xs text-muted-foreground">{row.hint}</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-x-6 gap-y-3">{children}</div>
    </div>
  );
}

interface KnobGroupProps<T extends string> {
  title: string;
  options: TabOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}

/** One labeled knob: the segmented picker for a step's setting, saved on every click. */
function KnobGroup<T extends string>({ title, options, value, onChange, label }: KnobGroupProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{title}</span>
      <Tabs
        options={options}
        value={value}
        onChange={onChange}
        aria-label={label}
        className="flex-nowrap"
      />
    </div>
  );
}

type ProviderTone = "success" | "warning" | "muted";

const PROVIDER_DOT_CLASSES: Record<ProviderTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  muted: "bg-muted-foreground",
};

interface ProviderRowProps {
  name: string;
  tone: ProviderTone;
  status: string;
  detail: string;
  children?: React.ReactNode;
}

function ProviderRow({ name, tone, status, detail, children }: ProviderRowProps) {
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{name}</p>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", PROVIDER_DOT_CLASSES[tone])} aria-hidden />
          <span className="text-sm text-muted-foreground" role="status">
            {status}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
      {children}
    </div>
  );
}

const CODEX_STATUS_TONES: Record<string, ProviderTone> = {
  ready: "success",
  checking: "muted",
};

/** One row per engine: detection status plus, for Codex, the defaults seeding a new Codex profile. */
function ProvidersSettings() {
  const { codex, composerAvailable, claudeAvailable } = useCapabilities();
  const { settings, error, saved } = useAppSettings();
  const codexModel = settings?.codexModel ?? null;
  const fastAvailable = isCodexFastAvailable(codex, codexModel ?? DEFAULT_CODEX_MODEL);
  const codexEffortOptions = codexEffortTabOptions(codexModel ?? DEFAULT_CODEX_MODEL, codex).map(
    (option) => ({ ...option, label: CODEX_EFFORT_FULL_LABELS[option.value] }),
  );

  const changeCodexModel = (next: CodexModel): void => {
    const currentEffort = settings?.codexEffort ?? DEFAULT_CODEX_EFFORT;
    const nextEffort: CodexEffort = pairedRuntimeCodexEffort(codex, next, currentEffort);
    const effortPatch = nextEffort === currentEffort ? {} : { codexEffort: nextEffort };
    void patchAppSettings({ codexModel: next, ...effortPatch });
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Fournisseurs"
        subtitle="Moteurs détectés sur cette machine et leurs valeurs par défaut."
      />
      <ProviderRow
        name="Claude"
        tone={claudeAvailable ? "success" : "warning"}
        status={claudeAvailable ? "Détecté" : "Non détecté"}
        detail={
          claudeAvailable
            ? "Binaire claude résolu (paquet du SDK ou installation utilisateur)."
            : "claude introuvable : il sera téléchargé au premier lancement d'agent."
        }
      />
      <ProviderRow
        name="Codex"
        tone={CODEX_STATUS_TONES[codex.status] ?? "warning"}
        status={codex.status === "ready" ? "Connecté" : "Indisponible"}
        detail="Valeurs pré-remplies pour un nouveau profil Codex."
      >
        <CodexConnectionStatus />
        <div className="flex flex-col items-start gap-1.5">
          <Label>Modèle Codex</Label>
          <Tabs
            options={codexModelTabOptions(codex)}
            value={codexModel}
            onChange={changeCodexModel}
            aria-label="Modèle Codex"
          />
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <Label>Effort Codex</Label>
          <Tabs
            options={codexEffortOptions}
            value={settings?.codexEffort ?? null}
            onChange={(v) => void patchAppSettings({ codexEffort: v })}
            aria-label="Effort Codex"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={settings?.codexFast ?? false}
            onCheckedChange={(value) => void patchAppSettings({ codexFast: value })}
            disabled={!fastAvailable && !(settings?.codexFast ?? false)}
          />
          <span className="text-sm">Mode FAST</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {fastAvailable
            ? "Réponses plus rapides, consommation accrue."
            : "Mode FAST indisponible pour ce modèle et ce compte."}
        </p>
        {saved && <p className="text-xs text-success">Enregistré</p>}
      </ProviderRow>
      <ProviderRow
        name="Composer"
        tone={composerAvailable ? "success" : "warning"}
        status={composerAvailable ? "Détecté" : "Non détecté"}
        detail={
          composerAvailable
            ? "Cursor headless (cursor-agent) installé et authentifié."
            : "cursor-agent introuvable dans le PATH"
        }
      />
      {error !== null && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
