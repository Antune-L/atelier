import { CornerDownRight, FileText, Minimize2, RefreshCw, Send, Settings2, Square } from "lucide-react";
import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { CONVERSATION_STATUS_LABELS, RESEARCH_OPTION_LABELS } from "@shared/constants";
import { enabledResearchOptionKeys } from "@shared/schemas";
import type { Conversation, ConversationMessage, UpdateConversationInput } from "@shared/schemas";

import { AtelierAgentFields } from "@/components/atelier/AtelierAgentFields";
import { AtelierAttachments, useAtelierAttachments } from "@/components/atelier/AtelierAttachments";
import { LiveDot } from "@/components/atelier/LiveDot";
import { MockupFrame } from "@/components/atelier/MockupFrame";
import { SubagentsPanel } from "@/components/atelier/SubagentsPanel";
import { SubagentsSidePanel } from "@/components/atelier/SubagentsSidePanel";
import { ResearchFields } from "@/components/atelier/ResearchFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useBusyAction } from "@/hooks/useBusyAction";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { UNTITLED_CONVERSATION_LABEL, codeSourceLabel, conversationTooltip, agentLabel, buildAtelierThread, steeringLabel, agentSettingsOf, agentSummary, contextUsageSummary } from "@/lib/atelier";
import type { ActivityEntry, ReasoningEntry } from "@/lib/atelier";
import { splitMockupBlocks } from "@/lib/mockupBlocks";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { appendMarkdownLine } from "@/lib/paste";
import { boardStore } from "@/lib/store";

interface ConversationPanelProps {
  conversation: Conversation;
  messages: ConversationMessage[];
  projectLabel: string;
  historyButton: ReactNode;
  documentActions: ReactNode;
  toolbar?: ReactNode;
  hasPrd: boolean;
}

const BOTTOM_THRESHOLD_PX = 24;
const RESEARCH_OFF_LABEL = "réflexion préalable off";
const CHAT_PROSE_CLASSES = "atelier-chat-prose min-w-0 max-w-full [&.markdown]:text-[15px] [&.markdown]:leading-[1.65]";

function researchSummary(conversation: Conversation): string {
  if (!conversation.researchEnabled) return RESEARCH_OFF_LABEL;
  const labels = enabledResearchOptionKeys(conversation.researchOptions).map((key) => RESEARCH_OPTION_LABELS[key].toLowerCase());
  return `réflexion préalable : ${labels.join(", ") || "aucune vérification"}`;
}

export function ConversationPanel({ conversation, messages, projectLabel, historyButton, documentActions, toolbar, hasPrd }: ConversationPanelProps) {
  const capabilities = useCapabilities();
  const defaults = resolveAgentDefaults(capabilities);
  const settings = agentSettingsOf(conversation);
  const [draft, setDraft, clearDraft] = useLocalDraft(`atelier:${conversation.id}`);
  const { busy, error, setError, run } = useBusyAction();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [following, setFollowing] = useState(true);
  const threadRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);
  const appendToDraft = (markdown: string): void => {
    setDraft((prev) => appendMarkdownLine(prev, markdown));
  };
  const { uploading, uploadFiles, onPaste } = useAtelierAttachments(appendToDraft, setError);

  const running = conversation.sessionStatus === "running";
  const hasAssistantReply = messages.some((m) => m.role === "assistant");
  const lastUserMessage = messages.findLast((m) => m.role === "user");
  const items = buildAtelierThread(messages, running);
  const label = agentLabel(settings, defaults);
  const lastMessage = messages[messages.length - 1];
  const scrollSignature = `${messages.length}:${lastMessage?.content.length ?? 0}:${conversation.sessionStatus}:${conversation.activeSubagents.length}`;

  useLayoutEffect(() => {
    const el = threadRef.current;
    if (el && pinnedToBottom.current) el.scrollTop = el.scrollHeight;
  }, [scrollSignature]);

  useLayoutEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (pinnedToBottom.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onThreadScroll = (): void => {
    const el = threadRef.current;
    if (!el) return;
    pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD_PX;
    setFollowing(pinnedToBottom.current);
  };

  /** Opens the last rendered block of a sub-agent (and its enclosing reasoning block) and scrolls to it. */
  const revealSubagent = (agentId: string): void => {
    const blocks = threadRef.current?.querySelectorAll<HTMLDetailsElement>(`details[data-subagent-id="${CSS.escape(agentId)}"]`);
    const block = blocks?.[blocks.length - 1];
    if (!block) return;
    pinnedToBottom.current = false;
    setFollowing(false);
    for (let el: HTMLElement | null = block; el !== null && el !== threadRef.current; el = el.parentElement) {
      if (el instanceof HTMLDetailsElement) el.open = true;
    }
    block.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const post = async (content: string): Promise<boolean> => {
    pinnedToBottom.current = true;
    setFollowing(true);
    return run(() => api.atelierPostMessage(conversation.id, content), "Envoi impossible");
  };

  const send = async (): Promise<void> => {
    const content = draft.trim();
    if (!content || busy || uploading) return;
    if (await post(content)) clearDraft();
  };

  const retry = (): void => {
    if (lastUserMessage !== undefined) void post(lastUserMessage.content);
  };

  const interrupt = (): void => {
    void run(() => api.atelierInterrupt(conversation.id), "Interruption impossible");
  };

  const compact = (): void => {
    void run(async () => {
      const { conversation: updated } = await api.atelierCompact(conversation.id);
      boardStore.rememberConversation(updated);
    }, "Compactage impossible");
  };

  const refreshSnapshot = (): void => {
    void run(async () => {
      const { conversation: updated } = await api.atelierRefreshSnapshot(conversation.id);
      boardStore.rememberConversation(updated);
    }, "Rafraîchissement impossible");
  };

  const consolidate = (): void => {
    void run(() => api.atelierConsolidate(conversation.id), "Consolidation impossible");
  };

  const updateSettings = (patch: UpdateConversationInput): void => {
    void api
      .atelierUpdateConversation(conversation.id, patch)
      .then((updated) => boardStore.rememberConversation(updated))
      .catch((e: unknown) => setError(errorMessage(e, "Mise à jour impossible")));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void send();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="atelier-header flex min-h-16 shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:gap-3 sm:px-5">
        {historyButton}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-medium" title={conversationTooltip(conversation.title, projectLabel)}>{conversation.title || UNTITLED_CONVERSATION_LABEL}</h2>
          <p className="truncate text-2xs text-muted-foreground">
            {projectLabel} · {CONVERSATION_STATUS_LABELS[conversation.status]} ·{" "}
            <span className="font-mono" title={conversation.snapshotSha ?? undefined}>{codeSourceLabel(conversation)}</span>
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {documentActions}
          {!conversation.readLocalCheckout && (
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              onClick={refreshSnapshot}
              disabled={running || busy}
              aria-label="Rafraîchir"
              title="Relire le dernier origin : la session se rouvre sur le nouveau commit"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Rafraîchir</span>
            </Button>
          )}
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger>
              <Button size="sm" variant="ghost" className="px-2" aria-label="Réglages de session">
                <Settings2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Session</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-[70vh] w-[min(420px,calc(100vw-2rem))] space-y-4 overflow-y-auto p-4">
              <p className="font-mono text-2xs text-muted-foreground">{agentSummary(settings, defaults)} · {researchSummary(conversation)}</p>
              <p className="text-xs text-muted-foreground">
                Changer d'agent ferme la session en cours ; le prochain message la relance.
              </p>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Agent</h3>
                <AtelierAgentFields value={settings} onChange={updateSettings} />
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                <h3 className="text-sm font-medium">Avant de proposer</h3>
                <ResearchFields
                  enabled={conversation.researchEnabled}
                  options={conversation.researchOptions}
                  onEnabledChange={(researchEnabled) => updateSettings({ researchEnabled })}
                  onOptionsChange={(researchOptions) => updateSettings({ researchOptions })}
                />
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                <h3 className="text-sm font-medium">Code lu</h3>
                <LocalCheckoutField checked={conversation.readLocalCheckout} onChange={(readLocalCheckout) => updateSettings({ readLocalCheckout })} />
              </div>
              <div className="border-t border-border pt-3">
                <ContextUsage contextTokens={conversation.contextTokens} contextWindow={conversation.contextWindow} />
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={compact}
                  disabled={conversation.contextTokens === null || running || busy}
                  title="Compacter le contexte de la session"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  Compacter le contexte
                </Button>
              </div>
              {hasPrd && (
                <Button size="sm" variant="outline" onClick={consolidate} disabled={!hasAssistantReply || running || busy || uploading}>
                  <FileText className="h-3.5 w-3.5" />
                  Préparer un nouveau PRD
                </Button>
              )}
            </PopoverContent>
          </Popover>
          {!hasPrd && (
            <Button size="sm" className="px-2 sm:px-3" onClick={consolidate} disabled={!hasAssistantReply || running || busy || uploading} aria-label="Préparer le PRD" title={hasAssistantReply ? "Préparer le PRD" : "Disponible après la première réponse de l'agent"}>
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Préparer le PRD</span>
            </Button>
          )}
          {toolbar}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div ref={threadRef} onScroll={onThreadScroll} className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
          <div className="mx-auto flex max-w-[58rem] flex-col gap-4">
            {items.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Décris ton idée : l'agent pose ses questions puis t'aide à la consolider en PRD.
              </p>
            )}
            {items.map((item) =>
              item.kind === "reasoning" ? (
                <ReasoningBlock key={item.id} entries={item.entries} live={item.live} />
              ) : (
                <MessageBubble key={item.message.id} message={item.message} agent={label} />
              ),
            )}
            {running && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LiveDot />
                L'agent réfléchit…
              </div>
            )}
            {conversation.sessionStatus === "error" && (
              <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-2 text-sm text-danger">
                <span className="min-w-0 flex-1 whitespace-pre-wrap">{conversation.error ?? "La session a échoué."}</span>
                {lastUserMessage !== undefined && (
                  <Button size="sm" variant="outline" onClick={retry} disabled={busy}>
                    Réessayer
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        <SubagentsSidePanel conversation={conversation} messages={messages} onSelect={revealSubagent} />
      </div>

      <div className="shrink-0 px-3 pb-3 pt-2 sm:px-8 sm:pb-4">
        <div className="mx-auto flex max-w-[58rem] flex-col gap-2">
          <SubagentsPanel subagents={conversation.activeSubagents} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="text-2xs">{running ? "Analyse en cours · Vous pouvez continuer à écrire." : "Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne"}</span>
            {!following && (
              <Button size="sm" variant="ghost" onClick={() => {
                pinnedToBottom.current = true;
                setFollowing(true);
                const thread = threadRef.current;
                if (thread) thread.scrollTop = thread.scrollHeight;
              }}>Reprendre le suivi</Button>
            )}
          </div>
          <div className="rounded-md border border-border bg-card px-3 py-2 focus-within:border-primary">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              rows={2}
              className="min-h-11 max-h-40 resize-y border-0 bg-transparent px-0 py-1 shadow-none focus-visible:ring-0"
              placeholder={
                running
                  ? "Aiguille l'agent pendant son tour…"
                  : "Réponds à l'agent…"
              }
              aria-label="Message à l'agent"
            />
            <div className="flex flex-wrap items-center gap-2">
              <AtelierAttachments compact uploading={uploading} disabled={busy} uploadFiles={uploadFiles} />
              {error && <p role="alert" className="min-w-0 flex-1 text-xs text-danger">{error}</p>}
              {running && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={interrupt} disabled={busy}>
                  <Square className="h-3.5 w-3.5" />
                  Interrompre
                </Button>
              )}
              <Button
                size="sm"
                className={running ? undefined : "ml-auto"}
                onClick={() => void send()}
                disabled={!draft.trim() || busy || uploading}
                aria-label={running ? "Aiguiller l'agent" : "Envoyer le message"}
                title={running ? "Envoyer ce message à l'agent sans interrompre son tour" : "Envoyer le message"}
              >
                {running ? <CornerDownRight className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                <span className="sr-only">{running ? "Aiguiller" : "Envoyer"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocalCheckoutField({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} aria-labelledby={`${id}-local`} />
      <span id={`${id}-local`} className="text-sm">Lire mon checkout local</span>
      <span className="text-xs text-muted-foreground">
        {checked ? "voit les modifications non commitées" : "instantané figé d'origin"}
      </span>
    </div>
  );
}

function ContextUsage({ contextTokens, contextWindow }: { contextTokens: number | null; contextWindow: number | null }) {
  const usage = contextUsageSummary(contextTokens, contextWindow);
  if (usage === null) {
    return <p className="truncate font-mono text-2xs text-muted-foreground/70">Contexte : aucune session active</p>;
  }
  return (
    <div className="flex items-center gap-2">
      <p className={`truncate font-mono text-2xs ${usage.warn ? "text-warning" : "text-muted-foreground"}`}>{usage.label}</p>
      {usage.percent !== null && (
        <div className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className={`h-full ${usage.warn ? "bg-warning" : "bg-primary"}`} style={{ width: `${usage.percent}%` }} />
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, agent }: { message: ConversationMessage; agent: string }) {
  if (message.role === "user") {
    const steering = steeringLabel(message.steering);
    return (
      <div className="ml-auto max-w-[80%] rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        {steering !== null && (
          <Badge variant="outline" className="mb-1 text-2xs text-muted-foreground">
            {steering}
          </Badge>
        )}
        <Markdown content={message.content} className={CHAT_PROSE_CLASSES} copyableCode />
      </div>
    );
  }
  return (
    <div className="flex w-full max-w-full flex-col gap-2 text-sm">
      <p className="font-mono text-2xs text-muted-foreground">{agent}</p>
      <AssistantContent content={message.content} running={false} />
    </div>
  );
}

/** Assistant text with its `<mockup>` blocks rendered inline; `running` marks a reply still streaming. */
function AssistantContent({ content, running }: { content: string; running: boolean }) {
  const segments = useMemo(() => splitMockupBlocks(content, { streaming: running }), [content, running]);
  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === "text" ? (
          <Markdown key={index} content={segment.text} className={CHAT_PROSE_CLASSES} copyableCode />
        ) : (
          <MockupFrame key={index} title={segment.title} html={segment.html} complete={segment.complete} running={running} />
        ),
      )}
    </>
  );
}

function ReasoningBlock({ entries, live }: { entries: ReasoningEntry[]; live: boolean }) {
  const count = entries.reduce(
    (total, entry) => total + (entry.kind === "text" ? 1 : entry.entries.filter((activity) => activity.kind === "row").length),
    0,
  );
  const frame = live ? "rounded-md border border-border bg-muted/30 px-3 py-2" : "ml-4 border-l-2 border-border pl-3 text-muted-foreground";
  return (
    <details open={live} className={`text-xs ${frame}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground">
        {live && <LiveDot />}
        <span className={FIELD_LABEL_CLASSES}>Réflexion</span>
        <span className="font-mono text-2xs">{count}</span>
      </summary>
      <div className="mt-2 space-y-2">
        {entries.map((entry) =>
          entry.kind === "text" ? (
            <div key={entry.message.id} className={`flex flex-col gap-2 ${live ? "text-sm" : "text-xs text-muted-foreground"}`}>
              <AssistantContent content={entry.message.content} running={live} />
            </div>
          ) : (
            <ActivityList key={entry.id} entries={entry.entries} />
          ),
        )}
      </div>
    </details>
  );
}

function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  return (
    <ul className="space-y-1 font-mono text-2xs text-muted-foreground">
      {entries.map((entry) =>
        entry.kind === "row" ? (
          <li key={entry.row.id} className="truncate">
            {entry.row.content}
          </li>
        ) : (
          <li key={`subagent:${entry.agentId}`}>
            <details data-subagent-id={entry.agentId} className="rounded border border-border/60 px-2 py-1">
              <summary className="cursor-pointer truncate" title={entry.label}>
                {entry.label} · {entry.rows.length} {entry.rows.length === 1 ? "action" : "actions"}
              </summary>
              <ul className="mt-1 space-y-1 pl-2">
                {entry.rows.map((row) => (
                  <li key={row.id} className="truncate">
                    {row.content}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ),
      )}
    </ul>
  );
}
