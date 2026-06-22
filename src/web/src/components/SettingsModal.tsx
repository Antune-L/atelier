import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  COMMIT_LANGUAGES,
  COMMIT_LANGUAGE_LABELS,
  DEFAULT_COMMIT_LANGUAGE,
  DEFAULT_TRIAGE_LANGUAGE,
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
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { AGENT_EFFORT_OPTIONS, AGENT_MODEL_OPTIONS } from "@/lib/display";
import { THEMES, type Theme } from "@/lib/theme";
import { refreshProfiles, useProfiles } from "@/hooks/useProfiles";
import { useTheme } from "@/hooks/useTheme";

const DRAG_ACTIVATION_DISTANCE = 6;

const IMPLEMENTER_OPTIONS: TabOption<Implementer>[] = IMPLEMENTERS.map((i) => ({
  value: i,
  label: IMPLEMENTER_LABELS[i],
}));
const LANGUAGE_OPTIONS: TabOption<CommitLanguage>[] = COMMIT_LANGUAGES.map(
  (l) => ({
    value: l,
    label: COMMIT_LANGUAGE_LABELS[l],
  }),
);
const THEME_OPTIONS: TabOption<Theme>[] = THEMES.map((t) => ({
  value: t.value,
  label: t.label,
}));

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
          <Tabs
            options={TAB_OPTIONS}
            value={tab}
            onChange={setTab}
            aria-label="Sections des réglages"
          />
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
  const [triageLanguage, setTriageLanguage] = useState<CommitLanguage | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .settings()
      .then((settings) => {
        // Adopt the persisted value only if the user hasn't already picked one
        // (a click during the in-flight fetch must not be clobbered).
        if (active) {
          setLanguage((current) => current ?? settings.commitLanguage);
          setTriageLanguage((current) => current ?? settings.triageLanguage);
        }
      })
      .catch((e) => {
        if (active) {
          setLanguage((current) => current ?? DEFAULT_COMMIT_LANGUAGE);
          setTriageLanguage((current) => current ?? DEFAULT_TRIAGE_LANGUAGE);
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

  const changeTriageLanguage = async (next: CommitLanguage): Promise<void> => {
    const previous = triageLanguage;
    setTriageLanguage(next);
    setError(null);
    try {
      await api.updateSettings({ triageLanguage: next });
    } catch (e) {
      setTriageLanguage(previous);
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex flex-col items-start gap-1.5">
          <Label>Thème</Label>
          <p className="text-sm text-muted-foreground">
            Apparence de l'interface
          </p>
          <Tabs
            options={THEME_OPTIONS}
            value={theme}
            onChange={setTheme}
            aria-label="Thème"
          />
        </div>
      </div>
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex flex-col items-start gap-1.5">
          <Label>Langue des PRs et des commits</Label>
          <p className="text-sm text-muted-foreground">
            Langue par défaut des messages de commit et du titre/description des
            PRs générés par les agents.
          </p>
          <Tabs
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={(v) => void changeLanguage(v)}
            aria-label="Langue des PRs et des commits"
          />
        </div>
      </div>
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex flex-col items-start gap-1.5">
          <Label>Langue de l'étude de faisabilité</Label>
          <p className="text-sm text-muted-foreground">
            Langue de l'analyse de faisabilité (triage) menée par les agents.
          </p>
          <Tabs
            options={LANGUAGE_OPTIONS}
            value={triageLanguage}
            onChange={(v) => void changeTriageLanguage(v)}
            aria-label="Langue de l'étude de faisabilité"
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Implementation-agent profiles tab: create/edit/delete/reorder the presets stored in the DB. */
function ProfilesSettings() {
  const remoteProfiles = useProfiles();
  const [localProfiles, setLocalProfiles] = useState<Profile[]>(remoteProfiles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const dragGenRef = useRef(0);

  // Sync local order from remote after create/delete/refresh, but not mid-drag.
  useEffect(() => {
    if (activeIdRef.current !== null) return;
    setLocalProfiles(remoteProfiles);
  }, [remoteProfiles]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE },
    }),
  );

  const addProfile = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      await api.createProfile({
        name: "Nouveau profil",
        model: "opus",
        effort: "medium",
        implementerModel: "opus",
        implementerEffort: "low",
        implementer: "claude",
      });
      await refreshProfiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const handleDragStart = ({ active }: DragStartEvent): void => {
    const id = String(active.id);
    setActiveId(id);
    activeIdRef.current = id;
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    setActiveId(null);
    activeIdRef.current = null;
    setError(null);
    if (!over || active.id === over.id) return;

    const oldIndex = localProfiles.findIndex((p) => p.id === active.id);
    const newIndex = localProfiles.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previousProfiles = localProfiles;
    const reordered = arrayMove(localProfiles, oldIndex, newIndex);
    setLocalProfiles(reordered);

    const gen = ++dragGenRef.current;
    void Promise.all(
      reordered.map((profile, index) =>
        api.updateProfile(profile.id, { sortOrder: index }),
      ),
    )
      .then(() => {
        if (gen !== dragGenRef.current) return;
        void refreshProfiles();
      })
      .catch((e) => {
        if (gen !== dragGenRef.current) return;
        setLocalProfiles(previousProfiles);
        setError(
          e instanceof Error ? e.message : "Erreur lors de la réorganisation",
        );
      });
  };

  const activeProfile =
    activeId !== null ? localProfiles.find((p) => p.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localProfiles.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {localProfiles.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun profil.</p>
          )}
          {localProfiles.map((profile) => (
            // Key on updatedAt so a saved row remounts and its local draft resyncs with the persisted value.
            <SortableProfileRow
              key={`${profile.id}:${profile.updatedAt}`}
              profile={profile}
              onError={setError}
            />
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            variant="outline"
            onClick={() => void addProfile()}
            disabled={busy}
          >
            <Plus className="h-4 w-4" />
            Ajouter un profil
          </Button>
        </div>
      </SortableContext>
      <DragOverlay>
        {activeProfile != null && (
          <ProfileRow
            profile={activeProfile}
            onError={setError}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

type DragHandleListeners = ReturnType<typeof useSortable>["listeners"];
type DragHandleAttributes = ReturnType<typeof useSortable>["attributes"];

interface ProfileRowProps {
  profile: Profile;
  onError: (message: string | null) => void;
  isDragOverlay?: boolean;
  dragHandleListeners?: DragHandleListeners;
  dragHandleAttributes?: DragHandleAttributes;
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
}

function SortableProfileRow({
  profile,
  onError,
}: Pick<ProfileRowProps, "profile" | "onError">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: profile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProfileRow
        profile={profile}
        onError={onError}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes}
        setActivatorNodeRef={setActivatorNodeRef}
      />
    </div>
  );
}

function ProfileRow({
  profile,
  onError,
  isDragOverlay = false,
  dragHandleListeners,
  dragHandleAttributes,
  setActivatorNodeRef,
}: ProfileRowProps) {
  const [name, setName] = useState(profile.name);
  const [model, setModel] = useState<AgentModel>(profile.model);
  const [effort, setEffort] = useState<AgentEffort>(profile.effort);
  const [implementerModel, setImplementerModel] = useState<AgentModel>(
    profile.implementerModel,
  );
  const [implementerEffort, setImplementerEffort] = useState<AgentEffort>(
    profile.implementerEffort,
  );
  const [implementer, setImplementer] = useState<Implementer>(
    profile.implementer,
  );
  const [busy, setBusy] = useState(false);

  const dirty =
    name !== profile.name ||
    model !== profile.model ||
    effort !== profile.effort ||
    implementerModel !== profile.implementerModel ||
    implementerEffort !== profile.implementerEffort ||
    implementer !== profile.implementer;

  const save = async (): Promise<void> => {
    onError(null);
    setBusy(true);
    try {
      await api.updateProfile(profile.id, {
        name: name.trim(),
        model,
        effort,
        implementerModel,
        implementerEffort,
        implementer,
      });
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
        {!isDragOverlay && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="cursor-grab self-end pb-2 text-muted-foreground active:cursor-grabbing"
            aria-label={`Réorganiser ${profile.name}`}
            {...dragHandleAttributes}
            {...dragHandleListeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
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
      <details className="rounded-md border bg-muted/30 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
          Configuration
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <Field label="Modèle">
            <Tabs
              options={AGENT_MODEL_OPTIONS}
              value={model}
              onChange={setModel}
              aria-label="Modèle"
            />
          </Field>
          <Field label="Effort">
            <Tabs
              options={AGENT_EFFORT_OPTIONS}
              value={effort}
              onChange={setEffort}
              aria-label="Effort"
            />
          </Field>
          <Field label="Implémenté par">
            <Tabs
              options={IMPLEMENTER_OPTIONS}
              value={implementer}
              onChange={setImplementer}
              aria-label="Implémenté par"
            />
          </Field>
          {implementer === "claude" && (
            <div className="flex flex-col gap-2 rounded-md border border-border/60 p-2">
              <p className="text-xs font-medium text-muted-foreground">
                Sous-agent implémenteur
              </p>
              <Field label="Modèle">
                <Tabs
                  options={AGENT_MODEL_OPTIONS}
                  value={implementerModel}
                  onChange={setImplementerModel}
                  aria-label="Modèle implémenteur"
                />
              </Field>
              <Field label="Effort">
                <Tabs
                  options={AGENT_EFFORT_OPTIONS}
                  value={implementerEffort}
                  onChange={setImplementerEffort}
                  aria-label="Effort implémenteur"
                />
              </Field>
            </div>
          )}
        </div>
      </details>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => void save()}
          disabled={busy || !dirty || name.trim() === ""}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
