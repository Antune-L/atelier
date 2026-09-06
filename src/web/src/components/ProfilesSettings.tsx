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
import { ArrowRight, ChevronDown, GripVertical } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import {
  DEFAULT_CODEX_EFFORT,
  DEFAULT_CODEX_MODEL,
  type AgentEffort,
  type AgentModel,
  type CodexEffort,
  type CodexModel,
  type Orchestrator,
  type ProfileConfig,
} from "@shared/constants";
import type { Profile } from "@shared/schemas";

import { ImplementationAgentFields } from "@/components/ImplementationAgentFields";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { Input, Label } from "@/components/ui/input";
import { DashedAddButton, SectionHeader, SettingsFooter } from "@/components/ui/settings";
import { useCapabilities } from "@/hooks/useCapabilities";
import { refreshProfiles, useProfiles } from "@/hooks/useProfiles";
import { useSavedFlash } from "@/hooks/useSavedFlash";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import { pairedImplementer } from "@/lib/agentPairing";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { buildProfilePipeline, describeProfile } from "@/lib/profileSummary";
import { cn } from "@/lib/utils";

const DRAG_ACTIVATION_DISTANCE = 6;
const COPY_SUFFIX = " (copie)";
const NEW_PROFILE_NAME = "Nouveau profil";
const REORDER_ERROR = "Erreur lors de la réorganisation";

const NEW_PROFILE_BASE = {
  orchestrator: "claude",
  model: "opus",
  effort: "medium",
  implementerModel: "opus",
  implementerEffort: "low",
  implementer: "claude",
  codexModel: DEFAULT_CODEX_MODEL,
  codexEffort: DEFAULT_CODEX_EFFORT,
  codexImplementerModel: null,
  codexImplementerEffort: null,
  codexImplementerFast: null,
} satisfies Omit<ProfileConfig, "name" | "codexFast">;

const DRAFT_KEYS = [
  "name",
  "orchestrator",
  "model",
  "effort",
  "implementerModel",
  "implementerEffort",
  "implementer",
  "codexModel",
  "codexEffort",
  "codexFast",
  "codexImplementerModel",
  "codexImplementerEffort",
  "codexImplementerFast",
] as const satisfies readonly (keyof ProfileConfig)[];

function toDraft(profile: Profile): ProfileConfig {
  return {
    name: profile.name,
    orchestrator: profile.orchestrator,
    model: profile.model,
    effort: profile.effort,
    implementerModel: profile.implementerModel,
    implementerEffort: profile.implementerEffort,
    implementer: profile.implementer,
    codexModel: profile.codexModel,
    codexEffort: profile.codexEffort,
    codexFast: profile.codexFast,
    codexImplementerModel: profile.codexImplementerModel,
    codexImplementerEffort: profile.codexImplementerEffort,
    codexImplementerFast: profile.codexImplementerFast,
  };
}

function sameDraft(a: ProfileConfig, b: ProfileConfig): boolean {
  return DRAFT_KEYS.every((key) => a[key] === b[key]);
}

/** Implementation-agent profiles: an accordion list of presets, reorderable and editable in place. */
export function ProfilesSettings() {
  const capabilities = useCapabilities();
  const remoteProfiles = useProfiles();
  const [localProfiles, setLocalProfiles] = useState<Profile[]>(remoteProfiles);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const dragGenRef = useRef(0);
  // NOTE: the saved flag lives here because a saved row remounts (its key carries updatedAt).
  const { savedValue: savedId, flashSaved } = useSavedFlash<string>();

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

  const createProfile = async (config: ProfileConfig): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      const created = await api.createProfile(config);
      await refreshProfiles();
      setExpandedId(created.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const addProfile = (): Promise<void> =>
    createProfile({
      ...NEW_PROFILE_BASE,
      name: NEW_PROFILE_NAME,
      codexFast: capabilities.defaultCodexFast,
    });

  const duplicateProfile = (config: ProfileConfig): Promise<void> =>
    createProfile({ ...config, name: `${config.name}${COPY_SUFFIX}` });

  const deleteProfile = async (profile: Profile): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      await api.deleteProfile(profile.id);
      await refreshProfiles();
      setExpandedId((current) => (current === profile.id ? null : current));
    } catch (e) {
      setError(errorMessage(e));
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
      reordered.map((profile, index) => api.updateProfile(profile.id, { sortOrder: index })),
    )
      .then(() => {
        if (gen !== dragGenRef.current) return;
        void refreshProfiles();
      })
      .catch((e) => {
        if (gen !== dragGenRef.current) return;
        setLocalProfiles(previousProfiles);
        setError(errorMessage(e, REORDER_ERROR));
      });
  };

  const activeProfile = activeId !== null ? localProfiles.find((p) => p.id === activeId) : null;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Profils d'implémentation"
        subtitle="Un profil fixe qui orchestre et qui écrit le code. Il est choisi ticket par ticket."
      />
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext
          items={localProfiles.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {localProfiles.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun profil.</p>
            )}
            {localProfiles.map((profile) => (
              // Key on updatedAt so a saved row remounts and its local draft resyncs with the persisted value.
              <SortableProfileRow
                key={`${profile.id}:${profile.updatedAt}`}
                profile={profile}
                expanded={expandedId === profile.id}
                justSaved={savedId === profile.id}
                onToggle={() =>
                  setExpandedId((current) => (current === profile.id ? null : profile.id))
                }
                onError={setError}
                onSaved={flashSaved}
                onDuplicate={duplicateProfile}
                onDelete={deleteProfile}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeProfile != null && <ProfileRowHeader profile={activeProfile} isDragOverlay />}
        </DragOverlay>
      </DndContext>
      {error !== null && <p className="text-sm text-destructive">{error}</p>}
      <DashedAddButton
        label="Nouveau profil"
        onClick={() => void addProfile()}
        disabled={busy}
      />
    </div>
  );
}

type DragHandleListeners = ReturnType<typeof useSortable>["listeners"];
type DragHandleAttributes = ReturnType<typeof useSortable>["attributes"];

interface ProfileRowProps {
  profile: Profile;
  expanded: boolean;
  justSaved: boolean;
  onToggle: () => void;
  onError: (message: string | null) => void;
  onSaved: (id: string) => void;
  onDuplicate: (config: ProfileConfig) => Promise<void>;
  onDelete: (profile: Profile) => Promise<void>;
  dragHandleListeners?: DragHandleListeners;
  dragHandleAttributes?: DragHandleAttributes;
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
}

function SortableProfileRow(props: ProfileRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.profile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProfileRow
        {...props}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes}
        setActivatorNodeRef={setActivatorNodeRef}
      />
    </div>
  );
}

interface ProfileRowHeaderProps {
  profile: Profile;
  draft?: ProfileConfig;
  expanded?: boolean;
  onToggle?: () => void;
  isDragOverlay?: boolean;
  dragHandleListeners?: DragHandleListeners;
  dragHandleAttributes?: DragHandleAttributes;
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
}

/** Collapsed row header: drag handle, profile name, one-line summary and the expand chevron. */
function ProfileRowHeader({
  profile,
  draft,
  expanded = false,
  onToggle,
  isDragOverlay = false,
  dragHandleListeners,
  dragHandleAttributes,
  setActivatorNodeRef,
}: ProfileRowHeaderProps) {
  const config = draft ?? toDraft(profile);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-2",
        isDragOverlay && "rounded-md border bg-background shadow-md",
      )}
    >
      {!isDragOverlay && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="cursor-grab text-muted-foreground active:cursor-grabbing"
          aria-label={`Réorganiser ${profile.name}`}
          {...dragHandleAttributes}
          {...dragHandleListeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {isDragOverlay && <GripVertical className="h-4 w-4 text-muted-foreground" />}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        disabled={isDragOverlay}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left disabled:cursor-default"
      >
        <span className="shrink-0 text-sm font-semibold">{config.name}</span>
        <span className="truncate text-xs text-muted-foreground">{describeProfile(config)}</span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
    </div>
  );
}

/** Read-only pipeline strip derived from the draft: orchestrator → implementer → sub-agent. */
function ProfilePipeline({ config }: { config: ProfileConfig }) {
  const nodes = buildProfilePipeline(config);

  return (
    <div className="flex flex-wrap items-stretch gap-2 rounded-md border bg-muted/30 p-2">
      {nodes.map((node, index) => (
        <Fragment key={node.role}>
          {index > 0 && (
            <ArrowRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" />
          )}
          <div className="min-w-[9rem] flex-1 rounded-md border bg-background px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{node.role}</p>
            <p className="text-sm font-semibold">{node.value}</p>
            {node.detail !== null && (
              <p className="text-xs text-muted-foreground">{node.detail}</p>
            )}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function ProfileRow({
  profile,
  expanded,
  justSaved,
  onToggle,
  onError,
  onSaved,
  onDuplicate,
  onDelete,
  dragHandleListeners,
  dragHandleAttributes,
  setActivatorNodeRef,
}: ProfileRowProps) {
  const capabilities = useCapabilities();
  const defaults = resolveAgentDefaults(capabilities);
  const [draft, setDraft] = useState<ProfileConfig>(() => toDraft(profile));
  const [busy, setBusy] = useState(false);

  const dirty = !sameDraft(draft, toDraft(profile));
  const nameValid = draft.name.trim() !== "";
  const update = (patch: Partial<ProfileConfig>): void => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  // Picking an orchestrator re-pairs the implementer (isAllowedAgentPair): codex pilots only codex.
  const changeOrchestrator = (next: Orchestrator): void => {
    setDraft((current) => ({
      ...current,
      orchestrator: next,
      implementer: pairedImplementer(next, current.implementer),
    }));
  };

  // A null from the shared fields means "same as the configured default": profiles store it resolved.
  const resolveModel = (next: AgentModel | null, current: AgentModel): AgentModel =>
    next ?? defaults.model ?? current;
  const resolveEffort = (next: AgentEffort | null, current: AgentEffort): AgentEffort =>
    next ?? defaults.effort ?? current;
  const resolveCodexModel = (next: CodexModel | null): CodexModel =>
    next ?? defaults.codexModel ?? DEFAULT_CODEX_MODEL;
  const resolveCodexEffort = (next: CodexEffort | null): CodexEffort =>
    next ?? defaults.codexEffort ?? DEFAULT_CODEX_EFFORT;

  const save = async (): Promise<void> => {
    onError(null);
    setBusy(true);
    try {
      await api.updateProfile(profile.id, { ...draft, name: draft.name.trim() });
      await refreshProfiles();
      onSaved(profile.id);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (): Promise<void> => {
    setBusy(true);
    try {
      await onDuplicate(draft);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border">
      <ProfileRowHeader
        profile={profile}
        draft={draft}
        expanded={expanded}
        onToggle={onToggle}
        dragHandleListeners={dragHandleListeners}
        dragHandleAttributes={dragHandleAttributes}
        setActivatorNodeRef={setActivatorNodeRef}
      />
      {expanded && (
        <div className="space-y-3 border-t p-3">
          <ProfilePipeline config={draft} />
          <div className="flex flex-col items-start gap-1.5">
            <Label htmlFor={`profile-name-${profile.id}`} className={FIELD_LABEL_CLASSES}>Nom</Label>
            <Input
              id={`profile-name-${profile.id}`}
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Nom du profil"
            />
          </div>
          <div className="rounded-md border p-3">
            <ImplementationAgentFields
              orchestrator={draft.orchestrator}
              model={draft.model}
              effort={draft.effort}
              implementerModel={draft.implementerModel}
              implementerEffort={draft.implementerEffort}
              implementer={draft.implementer}
              codexModel={draft.codexModel}
              codexEffort={draft.codexEffort}
              codexFast={draft.codexFast}
              codexImplementerModel={draft.codexImplementerModel}
              codexImplementerEffort={draft.codexImplementerEffort}
              codexImplementerFast={draft.codexImplementerFast}
              onOrchestratorChange={changeOrchestrator}
              onModelChange={(next) =>
                setDraft((c) => ({ ...c, model: resolveModel(next, c.model) }))
              }
              onEffortChange={(next) =>
                setDraft((c) => ({ ...c, effort: resolveEffort(next, c.effort) }))
              }
              onImplementerModelChange={(next) =>
                setDraft((c) => ({
                  ...c,
                  implementerModel: next ?? defaults.implementerModel ?? c.implementerModel,
                }))
              }
              onImplementerEffortChange={(next) =>
                setDraft((c) => ({
                  ...c,
                  implementerEffort: next ?? defaults.implementerEffort ?? c.implementerEffort,
                }))
              }
              onImplementerChange={(next) => update({ implementer: next })}
              onCodexModelChange={(next) => update({ codexModel: resolveCodexModel(next) })}
              onCodexEffortChange={(next) => update({ codexEffort: resolveCodexEffort(next) })}
              onCodexFastChange={(next) => update({ codexFast: next })}
              onCodexImplementerModelChange={(next) => update({ codexImplementerModel: next })}
              onCodexImplementerEffortChange={(next) => update({ codexImplementerEffort: next })}
              onCodexImplementerFastChange={(next) => update({ codexImplementerFast: next })}
              labelStyle="full"
            />
          </div>
          <SettingsFooter dirty={dirty} justSaved={justSaved}>
            <Button variant="ghost" size="sm" onClick={() => void duplicate()} disabled={busy}>
              Dupliquer
            </Button>
            <ConfirmPopover
              title="Supprimer ce profil ?"
              description={`Le profil « ${profile.name} » sera définitivement supprimé.`}
              confirmLabel="Supprimer"
              destructive
              onConfirm={() => onDelete(profile)}
            >
              <Button variant="ghost" size="sm" disabled={busy}>
                Supprimer
              </Button>
            </ConfirmPopover>
            {dirty && (
              <Button size="sm" onClick={() => void save()} disabled={busy || !nameValid}>
                Enregistrer
              </Button>
            )}
          </SettingsFooter>
        </div>
      )}
    </div>
  );
}
