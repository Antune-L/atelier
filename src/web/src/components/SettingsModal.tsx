import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  AGENT_EFFORTS,
  AGENT_EFFORT_LABELS,
  AGENT_MODELS,
  AGENT_MODEL_LABELS,
  COMMIT_LANGUAGES,
  COMMIT_LANGUAGE_LABELS,
  DEFAULT_COMMIT_LANGUAGE,
  IMPLEMENTERS,
  IMPLEMENTER_LABELS,
  type AgentEffort,
  type AgentModel,
  type CommitLanguage,
  type Implementer,
} from "@shared/constants";
import type { Profile } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { THEMES, type Theme } from "@/lib/theme";
import { refreshProfiles, useProfiles } from "@/hooks/useProfiles";
import { useTheme } from "@/hooks/useTheme";

const MODEL_OPTIONS: TabOption<AgentModel>[] = AGENT_MODELS.map((m) => ({ value: m, label: AGENT_MODEL_LABELS[m] }));
const EFFORT_OPTIONS: TabOption<AgentEffort>[] = AGENT_EFFORTS.map((e) => ({ value: e, label: AGENT_EFFORT_LABELS[e] }));
const IMPLEMENTER_OPTIONS: TabOption<Implementer>[] = IMPLEMENTERS.map((i) => ({ value: i, label: IMPLEMENTER_LABELS[i] }));
const LANGUAGE_OPTIONS: TabOption<CommitLanguage>[] = COMMIT_LANGUAGES.map((l) => ({
  value: l,
  label: COMMIT_LANGUAGE_LABELS[l],
}));
const THEME_OPTIONS: TabOption<Theme>[] = THEMES.map((t) => ({ value: t.value, label: t.label }));

type SettingsTab = "general" | "agents";

const TAB_OPTIONS: TabOption<SettingsTab>[] = [
  { value: "general", label: "Options générales" },
  { value: "agents", label: "Agents d'implémentation" },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/** Settings modal split into tabs: global options and the implementation-agent profiles. */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>("general");

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>Réglages</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="mb-4">
          <Tabs options={TAB_OPTIONS} value={tab} onChange={setTab} aria-label="Sections des réglages" />
        </div>
        {tab === "general" ? <GeneralSettings /> : <ProfilesSettings />}
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Fermer</Button>
      </ModalFooter>
    </Modal>
  );
}

/** General options tab: the UI theme and the global commit/PR language. */
function GeneralSettings() {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState<CommitLanguage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .settings()
      .then((settings) => {
        // Adopt the persisted value only if the user hasn't already picked one
        // (a click during the in-flight fetch must not be clobbered).
        if (active) setLanguage((current) => current ?? settings.commitLanguage);
      })
      .catch((e) => {
        if (active) {
          setLanguage((current) => current ?? DEFAULT_COMMIT_LANGUAGE);
          setError(e instanceof Error ? e.message : "Erreur");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const changeLanguage = async (next: CommitLanguage): Promise<void> => {
    const previous = language;
    setLanguage(next);
    setError(null);
    try {
      await api.updateSettings({ commitLanguage: next });
    } catch (e) {
      setLanguage(previous);
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex flex-col items-start gap-1.5">
          <Label>Thème</Label>
          <p className="text-sm text-muted-foreground">Apparence de l'interface (préférence locale à ce navigateur).</p>
          <Tabs options={THEME_OPTIONS} value={theme} onChange={setTheme} aria-label="Thème" />
        </div>
      </div>
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex flex-col items-start gap-1.5">
          <Label>Langue des PRs et des commits</Label>
          <p className="text-sm text-muted-foreground">
            Langue par défaut des messages de commit et du titre/description des PRs générés par les agents.
          </p>
          <Tabs options={LANGUAGE_OPTIONS} value={language} onChange={(v) => void changeLanguage(v)} aria-label="Langue des PRs et des commits" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

/** Implementation-agent profiles tab: create/edit/delete the presets stored in the DB. */
function ProfilesSettings() {
  const profiles = useProfiles();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addProfile = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      await api.createProfile({ name: "Nouveau profil", model: "opus", effort: "medium", implementer: "claude" });
      await refreshProfiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {profiles.length === 0 && <p className="text-sm text-muted-foreground">Aucun profil.</p>}
      {profiles.map((profile) => (
        // Key on updatedAt so a saved row remounts and its local draft resyncs with the persisted value.
        <ProfileRow key={`${profile.id}:${profile.updatedAt}`} profile={profile} onError={setError} />
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button variant="outline" onClick={() => void addProfile()} disabled={busy}>
        <Plus className="h-4 w-4" />
        Ajouter un profil
      </Button>
    </div>
  );
}

interface ProfileRowProps {
  profile: Profile;
  onError: (message: string | null) => void;
}

function ProfileRow({ profile, onError }: ProfileRowProps) {
  const [name, setName] = useState(profile.name);
  const [model, setModel] = useState<AgentModel>(profile.model);
  const [effort, setEffort] = useState<AgentEffort>(profile.effort);
  const [implementer, setImplementer] = useState<Implementer>(profile.implementer);
  const [busy, setBusy] = useState(false);

  const dirty =
    name !== profile.name ||
    model !== profile.model ||
    effort !== profile.effort ||
    implementer !== profile.implementer;

  const save = async (): Promise<void> => {
    onError(null);
    setBusy(true);
    try {
      await api.updateProfile(profile.id, { name: name.trim(), model, effort, implementer });
      await refreshProfiles();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    onError(null);
    setBusy(true);
    try {
      await api.deleteProfile(profile.id);
      await refreshProfiles();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`profile-name-${profile.id}`}>Nom</Label>
          <Input
            id={`profile-name-${profile.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du profil"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void remove()}
          disabled={busy}
          aria-label={`Supprimer ${profile.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Field label="Modèle">
          <Tabs options={MODEL_OPTIONS} value={model} onChange={setModel} aria-label="Modèle" />
        </Field>
        <Field label="Effort">
          <Tabs options={EFFORT_OPTIONS} value={effort} onChange={setEffort} aria-label="Effort" />
        </Field>
        <Field label="Implémenté par">
          <Tabs options={IMPLEMENTER_OPTIONS} value={implementer} onChange={setImplementer} aria-label="Implémenté par" />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void save()} disabled={busy || !dirty || name.trim() === ""}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
