import { MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CONVERSATION_STATUS_LABELS } from "@shared/constants";
import type { Conversation, ProjectInfo } from "@shared/schemas";

import { CardsPanel } from "@/components/atelier/CardsPanel";
import { LiveDot } from "@/components/atelier/LiveDot";
import { ConversationPanel } from "@/components/atelier/ConversationPanel";
import { NewConversationForm } from "@/components/atelier/NewConversationForm";
import { PrdPanel } from "@/components/atelier/PrdPanel";
import { resolveProjectLabel } from "@/components/TicketCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { useBoard } from "@/hooks/useBoard";
import { useConversationDetail } from "@/hooks/useConversationDetail";
import { useTickTimer } from "@/hooks/useTickTimer";
import { api } from "@/lib/api";
import {
  ATELIER_STEPS,
  ATELIER_STEP_LABELS,
  CONVERSATION_STATUS_VARIANTS,
  UNTITLED_CONVERSATION_LABEL,
  type AtelierSeed,
  type AtelierStep,
  type AtelierTarget,
} from "@/lib/atelier";
import { formatRelativeDuration } from "@/lib/display";
import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ALL_PROJECTS = "all";
const LIST_COLLAPSED_KEY = "atelier:list-collapsed";

interface AtelierViewProps {
  projects: ProjectInfo[];
  projectFilter: string;
  /** A request from another surface (ticket sheet, ticket detail) to open a conversation or a form. */
  target: AtelierTarget | null;
}

interface ComposeState {
  seed: AtelierSeed | null;
  key: number;
}

interface PrdSeen {
  conversationId: string;
  count: number;
}

async function findPrdConversation(candidates: Conversation[], prdId: string): Promise<string | null> {
  for (const candidate of candidates) {
    const detail = await api.atelierConversation(candidate.id).catch(() => null);
    if (detail?.prds.some((prd) => prd.id === prdId)) return candidate.id;
  }
  return null;
}

export function AtelierView({ projects, projectFilter, target }: AtelierViewProps) {
  const { conversations } = useBoard();
  const now = useTickTimer();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<AtelierStep>("conversation");
  const [prdChoice, setPrdChoice] = useState<string | null>(null);
  const [compose, setCompose] = useState<ComposeState | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(() => localStorage.getItem(LIST_COLLAPSED_KEY) === "1");
  const [appliedTarget, setAppliedTarget] = useState<AtelierTarget | null>(null);
  const [prdSeen, setPrdSeen] = useState<PrdSeen | null>(null);
  const composeSeq = useRef(0);
  const resolveSeq = useRef(0);

  const detail = useConversationDetail(selectedId);

  // Clears the unread dot of the open conversation: on click, and when a turn ends while it is on screen.
  const openUnread = compose === null && conversations.some((c) => c.id === selectedId && c.unread);
  useEffect(() => {
    if (selectedId === null || !openUnread) return;
    const current = boardStore.getSnapshot().conversations.find((c) => c.id === selectedId);
    if (current) boardStore.rememberConversation({ ...current, unread: false });
    api.atelierMarkConversationRead(selectedId).then(
      (updated) => boardStore.rememberConversation(updated),
      () => undefined,
    );
  }, [selectedId, openUnread]);

  const select = (conversationId: string, nextStep: AtelierStep = "conversation", prdId: string | null = null): void => {
    resolveSeq.current += 1;
    setSelectedId(conversationId);
    setStep(nextStep);
    setPrdChoice(prdId);
    setCompose(null);
    setListOpen(false);
  };

  const openCompose = (seed: AtelierSeed | null): void => {
    composeSeq.current += 1;
    setCompose({ seed, key: composeSeq.current });
    setListOpen(false);
  };

  const openPrdOrigin = (prdId: string, project: string): void => {
    const request = ++resolveSeq.current;
    const candidates = conversations.filter((c) => c.project === project);
    void findPrdConversation(candidates, prdId).then((conversationId) => {
      if (request !== resolveSeq.current) return;
      if (conversationId === null) {
        boardStore.notify("PRD introuvable", "La conversation d'origine a été supprimée.");
        return;
      }
      select(conversationId, "prd", prdId);
    });
  };

  if (target !== appliedTarget) {
    setAppliedTarget(target);
    if (target?.kind === "conversation") select(target.conversationId);
    if (target?.kind === "seed") openCompose(target.seed);
    if (target?.kind === "prd") openPrdOrigin(target.prdId, target.project);
  }

  const prds = detail.prds;
  if (selectedId !== null && detail.loaded) {
    if (prdSeen?.conversationId !== selectedId) {
      setPrdSeen({ conversationId: selectedId, count: prds.length });
    } else if (prds.length !== prdSeen.count) {
      setPrdSeen({ conversationId: selectedId, count: prds.length });
      if (prds.length > prdSeen.count) {
        setStep("prd");
        setPrdChoice(null);
      }
    }
  }

  const visible = conversations
    .filter((c) => projectFilter === ALL_PROJECTS || c.project === projectFilter)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const remove = async (conversationId: string): Promise<void> => {
    await api.atelierDeleteConversation(conversationId);
    boardStore.forgetConversation(conversationId);
    if (conversationId === selectedId) setSelectedId(null);
  };

  const conversation = detail.conversation;
  const latestPrd = prds[prds.length - 1];
  const prd = prds.find((p) => p.id === prdChoice) ?? latestPrd;
  const activeStep = prd === undefined ? "conversation" : step;
  const defaultProject = projectFilter === ALL_PROJECTS ? null : projectFilter;

  const renderPanel = () => {
    if (compose !== null) {
      return (
        <NewConversationForm
          key={compose.key}
          projects={projects}
          defaultProject={defaultProject}
          seed={compose.seed}
          onCreated={(created) => select(created.id)}
          onCancel={() => setCompose(null)}
        />
      );
    }
    if (selectedId === null || conversation === null) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <h2 className="text-lg font-semibold">De l’idée aux cartes</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {selectedId !== null && detail.error !== null
              ? detail.error
              : "Discutez avec un agent, relisez le PRD, puis confirmez les cartes à créer dans TODO."}
          </p>
          {visible[0] && (
            <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-background p-4 text-left">
              <p className="text-xs text-muted-foreground">Dernière discussion</p>
              <h3 className="break-words text-sm font-medium">{visible[0].title || UNTITLED_CONVERSATION_LABEL}</h3>
              <p className="text-xs text-muted-foreground">{resolveProjectLabel(projects, visible[0].project)}</p>
              <Badge variant={CONVERSATION_STATUS_VARIANTS[visible[0].status]}>{CONVERSATION_STATUS_LABELS[visible[0].status]}</Badge>
              <Button size="sm" variant="outline" className="w-full" onClick={() => {
                const latestConversation = visible[0];
                if (latestConversation) select(latestConversation.id);
              }}>Reprendre la discussion</Button>
            </div>
          )}
          {!visible[0] && <p className="text-xs text-muted-foreground">Commencez avec « Nouvelle discussion ».</p>}
        </div>
      );
    }
    if (activeStep === "prd" && prd !== undefined) {
      return (
        <PrdPanel
          conversation={conversation}
          prd={prd}
          prds={prds}
          onSelectPrd={setPrdChoice}
          onApplyPrd={detail.applyPrd}
          onBackToConversation={() => setStep("conversation")}
          onCreateCards={() => setStep("cards")}
        />
      );
    }
    if (activeStep === "cards" && prd !== undefined) {
      return (
        <CardsPanel conversation={conversation} prd={prd} projects={projects} onBackToPrd={() => setStep("prd")} />
      );
    }
    return <ConversationPanel key={conversation.id} conversation={conversation} messages={detail.messages} />;
  };

  const showStepper = compose === null && conversation !== null && selectedId !== null;

  const toggleListCollapsed = (): void => {
    const next = !listCollapsed;
    localStorage.setItem(LIST_COLLAPSED_KEY, next ? "1" : "0");
    setListCollapsed(next);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 md:flex-row">
      {listCollapsed && (
        <button
          type="button"
          onClick={toggleListCollapsed}
          className="hidden w-10 shrink-0 flex-col items-center gap-2 py-1 text-muted-foreground hover:text-foreground md:flex"
          title="Déplier « Discussions »"
          aria-label="Déplier « Discussions »"
        >
          <PanelLeftOpen className="h-3.5 w-3.5" />
          <span className="font-mono text-2xs">{visible.length}</span>
          <span className="text-2xs uppercase tracking-wider [writing-mode:vertical-rl]">Discussions</span>
        </button>
      )}
      <aside className={cn("flex w-full shrink-0 flex-col gap-3 overflow-hidden md:w-72", listCollapsed && "md:hidden")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleListCollapsed}
              className="hidden text-muted-foreground transition-colors hover:text-foreground md:block"
              title="Replier « Discussions »"
              aria-label="Replier « Discussions »"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
            <h2 className="text-sm font-medium">Discussions <span className="text-muted-foreground">{visible.length}</span></h2>
          </div>
          <Button size="sm" variant="ghost" className="md:hidden" onClick={() => setListOpen(!listOpen)}>{listOpen ? "Masquer" : "Afficher"}</Button>
        </div>
        <Button size="sm" onClick={() => openCompose(null)}>
          <MessageSquarePlus className="h-4 w-4" />
          Nouvelle discussion
        </Button>
        <ul className={cn("max-h-52 min-h-0 flex-1 space-y-2 overflow-y-auto md:max-h-none", !listOpen && (selectedId !== null || compose !== null) && "hidden md:block")}>
          {visible.length === 0 && (
            <li className="px-2 py-3 text-xs text-muted-foreground">Aucune conversation pour ce filtre.</li>
          )}
          {visible.map((item) => (
            <li key={item.id}>
              <div
                className={cn(
                  "group flex items-start gap-2 rounded-lg border px-3 py-3 transition-colors",
                  item.id === selectedId && compose === null
                    ? "border-border bg-accent"
                    : "border-border/60 hover:bg-accent/50",
                )}
              >
                <button type="button" onClick={() => select(item.id)} className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-1.5">
                    {item.sessionStatus === "running" && <LiveDot />}
                    {item.sessionStatus === "error" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
                    <span className="line-clamp-2 text-sm font-medium">{item.title || UNTITLED_CONVERSATION_LABEL}</span>
                    {item.unread && (
                      <span aria-label="Nouvelle réponse" className="ml-auto h-2 w-2 shrink-0 rounded-full bg-danger" />
                    )}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="truncate">{resolveProjectLabel(projects, item.project)}</span>
                    <span className="shrink-0">· {formatRelativeDuration(item.updatedAt, now)}</span>
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-2xs text-muted-foreground">Étape</span>
                    <Badge variant={CONVERSATION_STATUS_VARIANTS[item.status]} className="px-1.5 py-0 text-2xs">
                      {CONVERSATION_STATUS_LABELS[item.status]}
                    </Badge>
                  </span>
                </button>
                <ConfirmPopover
                  title="Supprimer la conversation"
                  description="Les messages et les révisions du PRD seront supprimés. Les cartes déjà créées restent sur le board."
                  confirmLabel="Supprimer"
                  destructive
                  onConfirm={() => remove(item.id)}
                >
                  <button
                    type="button"
                    aria-label="Supprimer la conversation"
                    className="shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </ConfirmPopover>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        {showStepper && (
          <nav aria-label="Étapes" className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
            {ATELIER_STEPS.map((value, index) => {
              const enabled = value === "conversation" || prd !== undefined;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!enabled}
                  aria-current={activeStep === value ? "step" : undefined}
                  onClick={() => setStep(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    activeStep === value
                      ? "text-foreground shadow-[inset_0_-2px_0_hsl(var(--info))]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="font-mono text-2xs">{index + 1}</span>
                  {ATELIER_STEP_LABELS[value]}
                </button>
              );
            })}
          </nav>
        )}
        {renderPanel()}
      </section>
    </div>
  );
}
