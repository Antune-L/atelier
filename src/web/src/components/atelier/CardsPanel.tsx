import { ArrowLeft, Check, ExternalLink, Plus } from "lucide-react";
import { useId, useState } from "react";

import {
  PRD_SINGLE_SELECTION,
  PRD_SPLIT_MODES,
  PRD_SPLIT_MODE_LABELS,
  type PrdSplitMode,
} from "@shared/constants";
import type { Conversation, PrdDocument, PrdDocumentRecord, ProjectInfo, Ticket } from "@shared/schemas";

import { AtelierAgentFields } from "@/components/atelier/AtelierAgentFields";
import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface CardCandidate {
  id: string;
  title: string;
  detail: string | null;
  chips: string[];
}

const MAX_GHOST_TICKETS = 5;
const DEFAULT_IMPLEMENTER = "claude";

function candidatesFor(split: PrdSplitMode, doc: PrdDocument): CardCandidate[] {
  if (split === "single") {
    return [{ id: PRD_SINGLE_SELECTION, title: doc.title, detail: doc.summary, chips: [] }];
  }
  if (split === "axes") {
    return doc.axes.map((axis) => {
      const taskCount = doc.tasks.filter((task) => task.axis === axis.id).length;
      return { id: axis.id, title: axis.title, detail: axis.summary, chips: [`${taskCount} tâche(s)`] };
    });
  }
  return doc.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    detail: task.expectedOutcome,
    chips: [task.axis, ...task.dependsOn.map((dependency) => `après ${dependency}`)],
  }));
}

function splitDescription(split: PrdSplitMode, doc: PrdDocument): string {
  if (split === "single") return "Le PRD entier est confié à un seul agent qui exécute les tâches dans l'ordre.";
  if (split === "axes") {
    return `${doc.axes.length} carte(s), une par axe, chacune regroupant ses tâches.`;
  }
  return `${doc.tasks.length} carte(s), chaînées par leurs dépendances. Chaque carte embarque le PRD complet et sa tâche cible.`;
}

function pluralCards(count: number): string {
  return count > 1 ? `${count} cartes` : `${count} carte`;
}

/** Step 3 of the Atelier: pick how the PRD is split into TODO tickets, then create them. */
export function CardsPanel({ conversation, prd, projects, onBackToPrd }: CardsPanelProps) {
  const capabilities = useCapabilities();
  const { tickets } = useBoard();
  const id = useId();
  const project = projects.find((p) => p.key === conversation.project);
  const [split, setSplit] = useState<PrdSplitMode>("tasks");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [excludedFor, setExcludedFor] = useState(prd.id);
  const [agent, setAgent] = useState<AtelierAgentSettings>(() =>
    defaultAgentSettings(conversation.orchestrator, capabilities.defaultCodexFast),
  );
  const [prDraft, setPrDraft] = useState(true);
  const [autoMergeChoice, setAutoMergeChoice] = useState<boolean | null>(null);
  const autoMerge = autoMergeChoice ?? project?.defaultAutoMerge ?? false;
  const { busy, error, run } = useBusyAction();
  const [created, setCreated] = useState<Ticket[]>([]);

  if (excludedFor !== prd.id) {
    setExcludedFor(prd.id);
    setExcluded([]);
    setCreated([]);
  }

  const prdDocument = prd.document;
  const candidates = candidatesFor(split, prdDocument);
  const selection = candidates.filter((candidate) => !excluded.includes(candidate.id));
  const selectedIds = new Set(selection.map((candidate) => candidate.id));
  const brokenDependencies =
    split === "tasks" &&
    prdDocument.tasks.some(
      (task) => selectedIds.has(task.id) && task.dependsOn.some((dependency) => !selectedIds.has(dependency)),
    );
  const existingTodo = tickets.filter((t) => t.project === conversation.project && t.column === "todo");
  const pendingCards = created.length === 0 ? selection : [];

  const toggle = (candidateId: string): void => {
    setExcluded((prev) =>
      prev.includes(candidateId) ? prev.filter((value) => value !== candidateId) : [...prev, candidateId],
    );
  };

  const create = async (): Promise<void> => {
    if (selection.length === 0) return;
    await run(async () => {
      const result = await api.atelierCreateTickets(prd.id, {
        split,
        selection: selection.map((candidate) => candidate.id),
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
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <h2 className="text-sm font-medium">Créer les cartes</h2>
        <Badge variant="outline">depuis PRD rév. {prd.revision}</Badge>
        {prd.status === "draft" && <Badge variant="warning">PRD non validé</Badge>}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onBackToPrd}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Revenir au PRD
          </Button>
          <Button size="sm" onClick={() => void create()} disabled={busy || selection.length === 0}>
            <Plus className="h-3.5 w-3.5" />
            Créer {pluralCards(selection.length)} dans TODO
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto px-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="space-y-2">
            <SectionHeader>Découpage</SectionHeader>
            <div role="radiogroup" aria-label="Découpage" className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {PRD_SPLIT_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={split === mode}
                  onClick={() => setSplit(mode)}
                  className={cn(
                    "flex flex-col gap-1 rounded-md border p-3 text-left transition-colors",
                    split === mode ? "border-foreground/40 bg-accent" : "border-border hover:bg-accent/50",
                  )}
                >
                  <span className="text-sm font-medium">{PRD_SPLIT_MODE_LABELS[mode]}</span>
                  <span className="text-xs text-muted-foreground">{splitDescription(mode, prdDocument)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <SectionHeader>Cartes à créer</SectionHeader>
            <ul className="space-y-1.5">
              {candidates.map((candidate) => {
                const selected = selectedIds.has(candidate.id);
                return (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      onClick={() => toggle(candidate.id)}
                      disabled={split === "single"}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md border p-2 text-left transition-colors disabled:cursor-default",
                        selected ? "border-border" : "border-dashed border-border opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          {candidate.id !== PRD_SINGLE_SELECTION && (
                            <span className="font-mono text-2xs text-muted-foreground">{candidate.id}</span>
                          )}
                          <span className="text-sm font-medium">{candidate.title}</span>
                          {candidate.chips.map((chip) => (
                            <span key={chip} className="rounded-full border border-border px-1.5 font-mono text-2xs text-muted-foreground">
                              {chip}
                            </span>
                          ))}
                        </span>
                        {candidate.detail && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{candidate.detail}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {brokenDependencies && (
              <p className="text-xs text-warning">
                Une tâche sélectionnée dépend d'une tâche exclue : sa carte ne sera pas chaînée.
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-md border border-border p-3">
            <SectionHeader>Défauts des cartes</SectionHeader>
            <AtelierAgentFields value={agent} onChange={(patch) => setAgent((prev) => ({ ...prev, ...patch }))} />
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={prDraft && !autoMerge}
                  disabled={autoMerge}
                  onCheckedChange={setPrDraft}
                  aria-labelledby={`${id}-draft`}
                />
                <span id={`${id}-draft`} className="text-sm">PR en draft</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={autoMerge} onCheckedChange={setAutoMergeChoice} aria-labelledby={`${id}-merge`} />
                <span id={`${id}-merge`} className="text-sm">Merge automatique</span>
              </div>
            </div>
          </section>

          {error && <p className="text-sm text-danger">{error}</p>}

          {created.length > 0 && (
            <section className="space-y-2">
              <SectionHeader>Cartes créées</SectionHeader>
              <ul className="space-y-1">
                {created.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => boardStore.openTicket(ticket.id)}
                      className="inline-flex items-center gap-1 text-sm hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {ticket.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-2">
          <SectionHeader aside={<span className="font-mono text-2xs text-muted-foreground">{existingTodo.length + pendingCards.length}</span>}>
            Aperçu · Todo
          </SectionHeader>
          <div className="space-y-1.5 rounded-md border border-border bg-muted/20 p-2">
            {existingTodo.slice(0, MAX_GHOST_TICKETS).map((ticket) => (
              <div key={ticket.id} className="truncate rounded-md border border-border bg-card px-2 py-1.5 text-xs opacity-50">
                {ticket.title}
              </div>
            ))}
            {existingTodo.length > MAX_GHOST_TICKETS && (
              <p className="px-1 text-2xs text-muted-foreground">+{existingTodo.length - MAX_GHOST_TICKETS} autres</p>
            )}
            {pendingCards.map((candidate) => (
              <div key={candidate.id} className="rounded-md border border-dashed border-foreground/40 bg-card px-2 py-1.5 text-xs">
                <span className="mr-1 font-mono text-2xs text-muted-foreground">nouveau</span>
                {candidate.title}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Chaque carte référence le PRD et sa conversation d'origine ; le workflow habituel (worktree, implémentation,
            review, PR) reprend ensuite sans changement.
          </p>
        </aside>
      </div>
    </div>
  );
}
