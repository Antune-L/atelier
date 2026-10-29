import { Archive, FileText, LayoutGrid, Mail, MessageSquarePlus, PanelLeftOpen, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { CONVERSATION_STATUS_LABELS } from "@shared/constants";
import type { Conversation, ProjectInfo } from "@shared/schemas";

import { CardsPanel } from "@/components/atelier/CardsPanel";
import { LiveDot } from "@/components/atelier/LiveDot";
import { ConversationPanel } from "@/components/atelier/ConversationPanel";
import { NewConversationForm } from "@/components/atelier/NewConversationForm";
import { PrdPanel } from "@/components/atelier/PrdPanel";
import { SettledConversations } from "@/components/atelier/SettledConversations";
import { resolveProjectLabel } from "@/components/TicketCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useBoard } from "@/hooks/useBoard";
import { useConversationDetail } from "@/hooks/useConversationDetail";
import { useTickTimer } from "@/hooks/useTickTimer";
import { api } from "@/lib/api";
import {
  ATELIER_STEPS,
  ATELIER_STEP_LABELS,
  CONVERSATION_STATUS_VARIANTS,
  UNTITLED_CONVERSATION_LABEL,
  conversationMatchesSearch,
  conversationTooltip,
  splitConversations,
  type AtelierSeed,
  type AtelierStep,
  type AtelierTarget,
} from "@/lib/atelier";
import { formatRelativeDuration } from "@/lib/display";
import { normalizeSearch } from "@/lib/search";
import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ALL_PROJECTS = "all";

interface AtelierViewProps {
  projects: ProjectInfo[];
  projectFilter: string;
  /** A request from another surface (ticket sheet, ticket detail) to open a conversation or a form. */
  target: AtelierTarget | null;
  toolbar?: ReactNode;
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

export function AtelierView({ projects, projectFilter, target, toolbar }: AtelierViewProps) {
  const { conversations } = useBoard();
  const now = useTickTimer();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<AtelierStep>("conversation");
  const [prdChoice, setPrdChoice] = useState<string | null>(null);
  const [compose, setCompose] = useState<ComposeState | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [appliedTarget, setAppliedTarget] = useState<AtelierTarget | null>(null);
  const [prdSeen, setPrdSeen] = useState<PrdSeen | null>(null);
  const [search, setSearch] = useState("");
  const composeSeq = useRef(0);
  const resolveSeq = useRef(0);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const documentButtonRef = useRef<HTMLButtonElement | null>(null);

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
    setListOpen(false);
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

  const searchQuery = normalizeSearch(search);
  const projectConversations = conversations.filter((c) => projectFilter === ALL_PROJECTS || c.project === projectFilter);
  const { active, settled } = splitConversations(projectConversations.filter((c) => conversationMatchesSearch(c, searchQuery)));
  const total = active.length + settled.length;
  // Taken before the search so the welcome card does not change while typing.
  const unsearched = splitConversations(projectConversations);
  const latest = unsearched.active[0] ?? unsearched.settled[0];

  const remove = async (conversationId: string): Promise<void> => {
    await api.atelierDeleteConversation(conversationId);
    boardStore.forgetConversation(conversationId);
    if (conversationId === selectedId) setSelectedId(null);
  };

  const markUnread = (item: Conversation): void => {
    if (item.id === selectedId) setSelectedId(null);
    boardStore.rememberConversation({ ...item, unread: true });
    api.atelierMarkConversationUnread(item.id).then(
      (updated) => boardStore.rememberConversation(updated),
      () => {
        const current = boardStore.getSnapshot().conversations.find((c) => c.id === item.id);
        if (current) boardStore.rememberConversation({ ...current, unread: false });
        boardStore.notify("Échec", "La conversation n'a pas pu être marquée comme non lue.");
      },
    );
  };

  const setSettled = (item: Conversation, settledValue: boolean): void => {
    boardStore.rememberConversation({ ...item, settled: settledValue });
    const request = settledValue ? api.atelierSettleConversation(item.id) : api.atelierUnsettleConversation(item.id);
    request.then(
      (updated) => boardStore.rememberConversation(updated),
      () => {
        const current = boardStore.getSnapshot().conversations.find((c) => c.id === item.id);
        if (current) boardStore.rememberConversation({ ...current, settled: !settledValue });
        boardStore.notify("Échec", settledValue ? "La conversation n'a pas pu être classée." : "La conversation n'a pas pu être remise en actif.");
      },
    );
  };

  const conversation = detail.conversation;
  const latestPrd = prds[prds.length - 1];
  const prd = prds.find((p) => p.id === prdChoice) ?? latestPrd;
  const activeStep = prd === undefined ? "conversation" : step;
  const defaultProject = projectFilter === ALL_PROJECTS ? null : projectFilter;

  const historyButton = (
    <Button ref={historyButtonRef} size="sm" variant="outline" onClick={() => setListOpen(true)} aria-label="Ouvrir les discussions" aria-haspopup="dialog">
      <PanelLeftOpen className="h-4 w-4" />
      <span className="hidden sm:inline">Discussions</span>
      <span className="hidden font-mono text-2xs text-muted-foreground sm:inline">{total}</span>
    </Button>
  );

  const documentActions = prd === undefined ? null : (
    <nav aria-label="Documents de la discussion" className="flex items-center gap-1">
      {ATELIER_STEPS.filter((value) => value !== "conversation").map((value) => (
        <Button key={value} size="sm" variant={activeStep === value ? "secondary" : "ghost"} className="px-2 sm:px-3" aria-label={ATELIER_STEP_LABELS[value]} title={ATELIER_STEP_LABELS[value]} onClick={(event) => { documentButtonRef.current = event.currentTarget; setStep(value); }}>
          {value === "prd" ? <FileText className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{ATELIER_STEP_LABELS[value]}</span>
        </Button>
      ))}
    </nav>
  );


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
          {latest && (
            <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-background p-4 text-left">
              <p className="text-xs text-muted-foreground">Dernière discussion</p>
              <h3 className="break-words text-sm font-medium">{latest.title || UNTITLED_CONVERSATION_LABEL}</h3>
              <p className="text-xs text-muted-foreground">{resolveProjectLabel(projects, latest.project)}</p>
              <Badge variant={CONVERSATION_STATUS_VARIANTS[latest.status]}>{CONVERSATION_STATUS_LABELS[latest.status]}</Badge>
              <Button size="sm" variant="outline" className="w-full" onClick={() => select(latest.id)}>Reprendre la discussion</Button>
            </div>
          )}
          {!latest && <p className="text-xs text-muted-foreground">Commencez avec « Nouvelle discussion ».</p>}
        </div>
      );
    }
    return (
      <ConversationPanel
        key={conversation.id}
        conversation={conversation}
        messages={detail.messages}
        projectLabel={resolveProjectLabel(projects, conversation.project)}
        historyButton={historyButton}
        documentActions={documentActions}
        toolbar={toolbar}
        hasPrd={prd !== undefined}
      />
    );
  };

  const showConversationHeader = compose === null && conversation !== null && selectedId !== null;


  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <Sheet open={listOpen} onOpenChange={setListOpen} side="left" size="md" title={<>Discussions <span className="ml-1 font-normal text-muted-foreground">{total}</span></>} className="w-80" onCloseAutoFocus={(event) => { event.preventDefault(); historyButtonRef.current?.focus(); }}>
        <aside className="flex min-h-0 w-full flex-col gap-3 p-4" aria-label="Historique des discussions">
          <Button size="sm" onClick={() => openCompose(null)}>
            <MessageSquarePlus className="h-4 w-4" />
            Nouvelle discussion
          </Button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearch("");
              }}
              placeholder="Rechercher une discussion…"
              aria-label="Rechercher une discussion par titre"
              className="h-8 w-full pl-7 text-xs"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {total === 0 && (
                <li className="px-2 py-3 text-xs text-muted-foreground">
                  {searchQuery !== "" ? "Aucune conversation pour cette recherche." : "Aucune conversation pour ce filtre."}
                </li>
              )}
              {active.map((item) => (
                <li key={item.id}>
                  <div
                    className={cn(
                      "group flex items-start gap-2 rounded-md border-l-2 px-2 py-2 transition-colors",
                      item.id === selectedId && compose === null
                        ? "border-primary bg-accent"
                        : "border-transparent hover:bg-accent/50",
                    )}
                  >
                    <button type="button" onClick={() => select(item.id)} className="min-w-0 flex-1 text-left">
                      <span className="flex items-center gap-1.5">
                        {item.sessionStatus === "running" && <LiveDot />}
                        {item.sessionStatus === "error" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
                        <span
                          className="line-clamp-2 text-sm font-medium"
                          title={conversationTooltip(item.title, resolveProjectLabel(projects, item.project))}
                        >
                          {item.title || UNTITLED_CONVERSATION_LABEL}
                        </span>
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
                    {!item.unread && (
                      <button
                        type="button"
                        aria-label="Marquer comme non lue"
                        title="Marquer comme non lue"
                        onClick={() => markUnread(item)}
                        className="shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Classer la conversation"
                      title="Classer la conversation"
                      onClick={() => setSettled(item, true)}
                      className="shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Archive className="h-3.5 w-3.5" />
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
            {settled.length > 0 && (
              <SettledConversations
                conversations={settled}
                selectedId={compose === null ? selectedId : null}
                now={now}
                projectLabel={(project) => resolveProjectLabel(projects, project)}
                onSelect={(conversationId) => select(conversationId)}
                onUnsettle={(item) => setSettled(item, false)}
                onDelete={remove}
                searching={searchQuery !== ""}
              />
            )}
          </div>
        </aside>
      </Sheet>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!showConversationHeader && (
          <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:px-5">
            {historyButton}
            <Button size="sm" variant="ghost" onClick={() => openCompose(null)}>
              <MessageSquarePlus className="h-4 w-4" />
              Nouvelle discussion
            </Button>
            <div className="ml-auto flex items-center gap-1">{toolbar}</div>
          </div>
        )}
        {renderPanel()}
      </section>
      <Sheet open={showConversationHeader && activeStep !== "conversation"} onOpenChange={(open) => { if (!open) setStep("conversation"); }} title={ATELIER_STEP_LABELS[activeStep]} size="lg" onCloseAutoFocus={(event) => { event.preventDefault(); const button = documentButtonRef.current?.isConnected ? documentButtonRef.current : historyButtonRef.current; button?.focus(); }}>
        {prd !== undefined && conversation !== null && (activeStep === "cards" ? (
          <CardsPanel conversation={conversation} prd={prd} projects={projects} onBackToPrd={() => setStep("prd")} />
        ) : (
          <PrdPanel
            conversation={conversation}
            prd={prd}
            prds={prds}
            onSelectPrd={setPrdChoice}
            onApplyPrd={detail.applyPrd}
            onBackToConversation={() => setStep("conversation")}
            onCreateCards={() => setStep("cards")}
          />
        ))}
      </Sheet>
    </div>
  );
}
