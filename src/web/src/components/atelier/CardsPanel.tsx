import { ArrowLeft, Check, ExternalLink, Plus } from "lucide-react";
import { useId, useState } from "react";

import { PRD_SINGLE_SELECTION, PRD_SPLIT_MODES, PRD_SPLIT_MODE_LABELS, type PrdSplitMode } from "@shared/constants";
import { orderSelectedPrdTasks, renderPrdAxisBrief, renderPrdSingleBrief, renderPrdTaskBrief, resolveSelectedPrdTaskParents } from "@shared/prdMarkdown";
import type { Conversation, PrdDocument, PrdDocumentRecord, ProjectInfo, Ticket } from "@shared/schemas";

import { AtelierAgentFields } from "@/components/atelier/AtelierAgentFields";
import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBoard } from "@/hooks/useBoard";
import { useBusyAction } from "@/hooks/useBusyAction";
import { useCapabilities } from "@/hooks/useCapabilities";
import { pairedImplementer } from "@/lib/agentPairing";
import { api } from "@/lib/api";
import { defaultAgentSettings, type AtelierAgentSettings } from "@/lib/atelier";
import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface CardsPanelProps {
  conversation: Conversation;
  prd: PrdDocumentRecord;
  projects: ProjectInfo[];
  onBackToPrd: () => void;
}

interface CardEdit {
  title: string;
  description: string;
}

interface CardCandidate extends CardEdit {
  id: string;
  detail: string | null;
  chips: string[];
}

const MAX_GHOST_TICKETS = 5;
const DEFAULT_IMPLEMENTER = "claude";

function candidatesFor(split: PrdSplitMode, doc: PrdDocument, milestoneId?: string): CardCandidate[] {
  const milestone = doc.roadmap?.milestones.find((candidate) => candidate.id === milestoneId);
  const tasks = doc.tasks.filter((task) => milestoneId === undefined || task.milestoneId === milestoneId);
  if (tasks.length === 0) return [];
  if (split === "single") {
    return [{ id: PRD_SINGLE_SELECTION, title: milestone?.title ?? doc.title, detail: milestone?.summary ?? doc.summary, description: renderPrdSingleBrief(doc, milestoneId), chips: [] }];
  }
  if (split === "axes") {
    return doc.axes.filter((axis) => milestoneId === undefined || tasks.some((task) => task.axis === axis.id)).map((axis) => {
      const taskCount = tasks.filter((task) => task.axis === axis.id).length;
      return { id: axis.id, title: `${axis.id} — ${axis.title}`, detail: axis.summary, description: renderPrdAxisBrief(doc, axis.id, milestoneId) ?? axis.summary, chips: [`${taskCount} tâche(s)`] };
    });
  }
  return tasks.map((task) => ({
    id: task.id,
    title: `${task.id} — ${task.title}`,
    detail: task.expectedOutcome,
    description: renderPrdTaskBrief(doc, task.id) ?? task.expectedOutcome,
    chips: [task.axis, ...(task.milestoneId ? [task.milestoneId] : [])],
  }));
}

function splitDescription(split: PrdSplitMode, doc: PrdDocument, milestoneId?: string): string {
  const tasks = doc.tasks.filter((task) => milestoneId === undefined || task.milestoneId === milestoneId);
  const axisCount = new Set(tasks.map((task) => task.axis)).size;
  if (split === "single") return "Le périmètre sélectionné est confié à un seul agent.";
  if (split === "axes") return `${axisCount} carte(s), une par axe, chacune regroupant les tâches du périmètre sélectionné.`;
  return `${tasks.length} carte(s). Les dépendances définissent les branches parentes, pas l’ordre des jalons.`;
}

function pluralCards(count: number): string {
  return count > 1 ? `${count} cartes` : `${count} carte`;
}

export function CardsPanel({ conversation, prd, projects, onBackToPrd }: CardsPanelProps) {
  const capabilities = useCapabilities();
  const { tickets } = useBoard();
  const id = useId();
  const project = projects.find((p) => p.key === conversation.project);
  const [split, setSplit] = useState<PrdSplitMode>("tasks");
  const [milestoneId, setMilestoneId] = useState<string | undefined>(prd.document.roadmap?.selectedMilestoneId);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [excludedFor, setExcludedFor] = useState(prd.id);
  const [edits, setEdits] = useState<Record<string, CardEdit>>({});
  const [agent, setAgent] = useState<AtelierAgentSettings>(() => defaultAgentSettings(conversation.orchestrator, capabilities.defaultCodexFast));
  const [prDraft, setPrDraft] = useState(true);
  const [autoMergeChoice, setAutoMergeChoice] = useState<boolean | null>(null);
  const autoMerge = !capabilities.prOnly && (autoMergeChoice ?? project?.defaultAutoMerge ?? false);
  const { busy, error, run } = useBusyAction();
  const [created, setCreated] = useState<Ticket[]>([]);

  if (excludedFor !== prd.id) {
    setExcludedFor(prd.id);
    setExcluded([]);
    setEdits({});
    setCreated([]);
    setMilestoneId(prd.document.roadmap?.selectedMilestoneId);
  }

  const prdDocument = prd.document;
  const editScope = split === "tasks" ? split : `${split}:${milestoneId ?? ""}`;
  const originalCandidates = candidatesFor(split, prdDocument, milestoneId);
  const editedCandidates = originalCandidates.map((candidate) => ({ ...candidate, ...edits[`${editScope}:${candidate.id}`] }));
  const selectedCandidates = editedCandidates.filter((candidate) => !excluded.includes(candidate.id));
  const selectedIds = new Set(selectedCandidates.map((candidate) => candidate.id));
  const selection = split === "tasks"
    ? orderSelectedPrdTasks(prdDocument, selectedIds).flatMap((task) => {
      const candidate = selectedCandidates.find((item) => item.id === task.id);
      return candidate ? [candidate] : [];
    })
    : selectedCandidates;
  const candidates = split === "tasks"
    ? [...selection, ...editedCandidates.filter((candidate) => excluded.includes(candidate.id))]
    : editedCandidates;
  const resolution = split === "tasks" ? resolveSelectedPrdTaskParents(prdDocument, selectedIds) : null;
  const dependencyError = resolution && !resolution.ok ? resolution.error : null;
  const resolvedParents = resolution?.ok ? resolution.parents : null;
  const missingParents = [...resolvedParents ?? []].filter(([, parent]) => parent.parentTaskId !== null && parent.dependsOnTaskId === null);
  const hasChainedCards = [...resolvedParents?.values() ?? []].some((parent) => parent.dependsOnTaskId !== null);
  const startDescription = hasChainedCards
    ? "Les premières cartes sont démarrées manuellement. Une carte dépendante démarre automatiquement quand sa carte parente ouvre sa PR."
    : "Les cartes ne démarrent pas automatiquement.";
  const invalidEdits = selection.some((candidate) => !candidate.title.trim() || !candidate.description.trim());
  const existingTodo = tickets.filter((ticket) => ticket.project === conversation.project && ticket.column === "todo");
  const pendingCards = created.length === 0 ? selection : [];

  const toggle = (candidateId: string): void => {
    setExcluded((prev) => prev.includes(candidateId) ? prev.filter((value) => value !== candidateId) : [...prev, candidateId]);
  };

  const create = async (): Promise<void> => {
    if (selection.length === 0 || dependencyError || invalidEdits || busy || created.length > 0) return;
    await run(async () => {
      const result = await api.atelierCreateTickets(prd.id, {
        split,
        selection: selection.map((candidate) => candidate.id),
        overrides: selection.flatMap((candidate) => {
          const original = originalCandidates.find((item) => item.id === candidate.id);
          if (!original || (milestoneId === undefined && candidate.title === original.title && candidate.description === original.description)) return [];
          return [{ candidateId: candidate.id, title: candidate.title.trim(), description: candidate.description }];
        }),
        options: {
          ...agent,
          implementer: pairedImplementer(agent.orchestrator, DEFAULT_IMPLEMENTER),
          prDraft: prDraft && !autoMerge,
          autoMerge,
        },
        start: false,
      });
      setCreated(result.tickets);
      boardStore.notify("Cartes créées", `${pluralCards(result.tickets.length)} dans TODO depuis le PRD rév. ${prd.revision}`);
    }, "Création des cartes impossible");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1"><h2 className="text-base font-semibold">Aperçu des cartes</h2><p className="text-xs text-muted-foreground">Modifiez les titres et le contenu, puis confirmez la sélection.</p></div>
        <Badge variant="outline">PRD rév. {prd.revision}</Badge>
        {prd.status === "draft" && <Badge variant="warning">PRD non validé</Badge>}
        <Button size="sm" variant="ghost" onClick={onBackToPrd}><ArrowLeft className="h-3.5 w-3.5" />Revenir au PRD</Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <section className="space-y-3">
            <SectionHeader aside={<span className="text-xs text-muted-foreground">{selection.length} sélectionnées sur {candidates.length}</span>}>Cartes à créer</SectionHeader>
            <ul className="space-y-3">
              {candidates.map((candidate) => {
                const selected = selectedIds.has(candidate.id);
                const editKey = `${editScope}:${candidate.id}`;
                const parent = resolvedParents?.get(candidate.id);
                return (
                  <li key={candidate.id} className={cn("space-y-3 rounded-lg border p-3", selected ? "border-border" : "border-dashed border-border opacity-60")}>
                    <div className="flex items-start gap-3">
                      <button type="button" role="checkbox" aria-label={`Sélectionner ${candidate.title}`} aria-checked={selected} onClick={() => toggle(candidate.id)} disabled={split === "single" || busy || created.length > 0} className={cn("mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border", selected ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                        {selected && <Check className="h-3 w-3" />}
                      </button>
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label htmlFor={`${id}-${split}-${candidate.id}-title`} className="text-xs text-muted-foreground">Titre de la carte {candidate.id !== PRD_SINGLE_SELECTION && <span className="font-mono">· {candidate.id}</span>}</Label>
                        <Input id={`${id}-${split}-${candidate.id}-title`} value={candidate.title} disabled={busy || created.length > 0} onChange={(event) => setEdits((current) => ({ ...current, [editKey]: { title: event.target.value, description: candidate.description } }))} />
                        {candidate.detail && <p className="text-xs text-muted-foreground">{candidate.detail}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          {candidate.chips.map((chip) => <span key={chip} className="rounded-full border border-border px-1.5 font-mono text-2xs text-muted-foreground">{chip}</span>)}
                          {parent?.parentTaskId && <Badge variant="outline">branche parente {parent.parentTaskId}</Badge>}
                          {parent?.parentTaskId && parent.dependsOnTaskId === null && <Badge variant="warning">prérequis exclu · sans chaînage</Badge>}
                        </div>
                      </div>
                    </div>
                    <details className="rounded-md border border-border/60 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-medium">Modifier le contenu de la carte</summary>
                      <div className="mt-3 space-y-2">
                        <Label htmlFor={`${id}-${split}-${candidate.id}-description`} className="text-xs text-muted-foreground">Description et critères</Label>
                        <Textarea id={`${id}-${split}-${candidate.id}-description`} value={candidate.description} rows={8} disabled={busy || created.length > 0} onChange={(event) => setEdits((current) => ({ ...current, [editKey]: { title: candidate.title, description: event.target.value } }))} />
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
            {candidates.length === 0 && <p className="text-sm text-muted-foreground">Aucune tâche détaillée pour ce jalon. Précisez ses tâches dans la conversation avant de créer des cartes.</p>}
            {missingParents.map(([taskId, parent]) => <p key={taskId} className="text-xs text-warning">{taskId} : le prérequis {parent.parentTaskId} est exclu. La carte partira de la branche de base du projet sans le code de {parent.parentTaskId}.</p>)}
            {dependencyError && (
              <div role="alert" className="space-y-2 rounded-md border border-danger/30 p-3">
                <p className="text-xs text-danger">{dependencyError.message}</p>
                <Button size="sm" variant="outline" disabled={busy || created.length > 0} onClick={() => { setSplit("single"); setMilestoneId(undefined); setExcluded([]); }}>Une carte pour tout le document</Button>
              </div>
            )}
            {invalidEdits && <p role="alert" className="text-xs text-danger">Chaque carte sélectionnée doit avoir un titre et un contenu.</p>}
          </section>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {created.length > 0 && (
            <section className="space-y-2 rounded-lg border border-success/30 p-3">
              <SectionHeader>{pluralCards(created.length)} créées dans TODO</SectionHeader>
              <p className="text-xs text-muted-foreground">Aucune implémentation n’a été démarrée.</p>
              <ul className="space-y-1">{created.map((ticket) => <li key={ticket.id}><button type="button" onClick={() => boardStore.openTicket(ticket.id)} className="inline-flex items-center gap-1 text-sm hover:underline"><ExternalLink className="h-3 w-3" />{ticket.title}</button></li>)}</ul>
            </section>
          )}
        </div>
        <aside className="w-full min-w-0 space-y-4 lg:w-72 lg:shrink-0">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <h3 className="text-sm font-medium">Destination</h3>
            <p className="mt-1 text-sm">{project?.label ?? conversation.project} · TODO</p>
            <p className="mt-2 text-xs text-muted-foreground">{startDescription} Chaque carte conserve son PRD et sa conversation d’origine.</p>
          </div>
          {prdDocument.roadmap && (
            <section className="space-y-2 rounded-lg border border-border p-3">
              <Label htmlFor={`${id}-milestone`}>Périmètre des cartes</Label>
              <Select id={`${id}-milestone`} value={milestoneId ?? ""} disabled={busy || created.length > 0} onChange={(event) => setMilestoneId(event.target.value || undefined)} className="w-full">
                <option value="">Toute la feuille de route</option>
                {prdDocument.roadmap.milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.id} · {milestone.title}</option>)}
              </Select>
              <p className="text-xs text-muted-foreground">Le choix du jalon conserve vos modifications et votre sélection. Il ne crée aucune dépendance entre les jalons.</p>
            </section>
          )}
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">Découpage · {PRD_SPLIT_MODE_LABELS[split]}</summary>
            <div role="radiogroup" aria-label="Découpage" className="mt-3 flex flex-col gap-2">{PRD_SPLIT_MODES.map((mode) => <button key={mode} type="button" role="radio" aria-checked={split === mode} disabled={busy || created.length > 0} onClick={() => setSplit(mode)} className={cn("flex flex-col gap-1 rounded-md border p-3 text-left transition-colors", split === mode ? "border-foreground/40 bg-accent" : "border-border hover:bg-accent/50")}><span className="text-sm font-medium">{PRD_SPLIT_MODE_LABELS[mode]}</span><span className="text-xs text-muted-foreground">{splitDescription(mode, prdDocument, milestoneId)}</span></button>)}</div>
          </details>
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">Agent et livraison des cartes</summary>
            <div className="mt-3 space-y-4">
              <AtelierAgentFields value={agent} onChange={(patch) => setAgent((prev) => ({ ...prev, ...patch }))} />
              <div className="flex flex-wrap items-center gap-2"><Switch checked={prDraft && !autoMerge} disabled={autoMerge} onCheckedChange={setPrDraft} aria-labelledby={`${id}-draft`} /><span id={`${id}-draft`} className="text-sm">PR en draft</span></div>
              {!capabilities.prOnly && <div className="flex flex-wrap items-center gap-2"><Switch checked={autoMerge} onCheckedChange={setAutoMergeChoice} aria-labelledby={`${id}-merge`} /><span id={`${id}-merge`} className="text-sm">Merge automatique</span></div>}
            </div>
          </details>
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">Aperçu TODO · {existingTodo.length + pendingCards.length}</summary>
            <div className="mt-3 space-y-1.5">{existingTodo.slice(0, MAX_GHOST_TICKETS).map((ticket) => <div key={ticket.id} className="truncate rounded-md border border-border bg-card px-2 py-1.5 text-xs opacity-50">{ticket.title}</div>)}{existingTodo.length > MAX_GHOST_TICKETS && <p className="text-2xs text-muted-foreground">+{existingTodo.length - MAX_GHOST_TICKETS} autres</p>}{pendingCards.map((candidate) => <div key={candidate.id} className="rounded-md border border-dashed border-foreground/40 bg-card px-2 py-1.5 text-xs"><span className="mr-1 text-muted-foreground">nouveau</span>{candidate.title}</div>)}</div>
          </details>
        </aside>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
        <div><p className="text-sm font-medium">{pluralCards(selection.length)} dans TODO · {project?.label ?? conversation.project}</p><p className="text-xs text-muted-foreground">La confirmation crée les cartes sans lancer leur implémentation.</p></div>
        <ConfirmPopover title={`Créer ${pluralCards(selection.length)} dans TODO ?`} description={`Destination : ${project?.label ?? conversation.project}. Les titres et contenus affichés seront utilisés. ${startDescription}`} confirmLabel={`Créer ${pluralCards(selection.length)}`} onConfirm={create}>
          <Button size="sm" disabled={busy || selection.length === 0 || dependencyError !== null || invalidEdits || created.length > 0}><Plus className="h-3.5 w-3.5" />Créer {pluralCards(selection.length)} dans TODO</Button>
        </ConfirmPopover>
      </footer>
    </div>
  );
}
