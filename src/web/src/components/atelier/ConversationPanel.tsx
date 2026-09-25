import { FileText, Send, Settings2, Square } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

import { RESEARCH_OPTION_LABELS } from "@shared/constants";
import { enabledResearchOptionKeys } from "@shared/schemas";
import type { Conversation, ConversationMessage, UpdateConversationInput } from "@shared/schemas";

import { AtelierAgentFields } from "@/components/atelier/AtelierAgentFields";
import { LiveDot } from "@/components/atelier/LiveDot";
import { ResearchFields } from "@/components/atelier/ResearchFields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBusyAction } from "@/hooks/useBusyAction";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { UNTITLED_CONVERSATION_LABEL, agentLabel, agentSettingsOf, agentSummary } from "@/lib/atelier";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { appendMarkdownLine, handleMediaPaste } from "@/lib/paste";
import { boardStore } from "@/lib/store";

interface ConversationPanelProps {
  conversation: Conversation;
  messages: ConversationMessage[];
}

type ThreadItem =
  | { kind: "message"; message: ConversationMessage }
  | { kind: "activity"; id: string; rows: ConversationMessage[] };

const BOTTOM_THRESHOLD_PX = 24;
const RESEARCH_OFF_LABEL = "réflexion préalable off";

function buildThread(messages: ConversationMessage[]): ThreadItem[] {
  const items: ThreadItem[] = [];
  for (const message of messages) {
    if (message.role !== "activity") {
      items.push({ kind: "message", message });
      continue;
    }
    const last = items[items.length - 1];
    if (last?.kind === "activity") last.rows.push(message);
    else items.push({ kind: "activity", id: message.id, rows: [message] });
  }
  return items;
}

function researchSummary(conversation: Conversation): string {
  if (!conversation.researchEnabled) return RESEARCH_OFF_LABEL;
  const labels = enabledResearchOptionKeys(conversation.researchOptions).map((key) => RESEARCH_OPTION_LABELS[key].toLowerCase());
  return `réflexion préalable : ${labels.join(", ") || "aucune vérification"}`;
}

/** Step 1 of the Atelier: the chat with the agent, its settings, and the consolidation trigger. */
export function ConversationPanel({ conversation, messages }: ConversationPanelProps) {
  const capabilities = useCapabilities();
  const defaults = resolveAgentDefaults(capabilities);
  const settings = agentSettingsOf(conversation);
  const [draft, setDraft, clearDraft] = useLocalDraft(`atelier:${conversation.id}`);
  const { busy, error, setError, run } = useBusyAction();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  const running = conversation.sessionStatus === "running";
  const hasAssistantReply = messages.some((m) => m.role === "assistant");
  const lastUserMessage = messages.findLast((m) => m.role === "user");
  const items = buildThread(messages);
  const label = agentLabel(settings, defaults);
  const lastMessage = messages[messages.length - 1];
  const scrollSignature = `${messages.length}:${lastMessage?.content.length ?? 0}:${conversation.sessionStatus}`;

  useLayoutEffect(() => {
    const el = threadRef.current;
    if (el && pinnedToBottom.current) el.scrollTop = el.scrollHeight;
  }, [scrollSignature]);

  const onThreadScroll = (): void => {
    const el = threadRef.current;
    if (!el) return;
    pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD_PX;
  };

  const post = async (content: string): Promise<boolean> => {
    pinnedToBottom.current = true;
    return run(() => api.atelierPostMessage(conversation.id, content), "Envoi impossible");
  };

  const send = async (): Promise<void> => {
    const content = draft.trim();
    if (!content || busy || running) return;
    if (await post(content)) clearDraft();
  };

  const retry = (): void => {
    if (lastUserMessage !== undefined) void post(lastUserMessage.content);
  };

  const interrupt = (): void => {
    void run(() => api.atelierInterrupt(conversation.id), "Interruption impossible");
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

  const appendToDraft = (markdown: string): void => {
    setDraft((prev) => appendMarkdownLine(prev, markdown));
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    void handleMediaPaste(event, appendToDraft).catch((e: unknown) => setError(errorMessage(e, "Échec de l'upload")));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-medium">{conversation.title || UNTITLED_CONVERSATION_LABEL}</h2>
          <p className="truncate font-mono text-2xs text-muted-foreground">
            {agentSummary(settings, defaults)} · {researchSummary(conversation)}
          </p>
        </div>
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger>
            <Button size="sm" variant="ghost">
              <Settings2 className="h-3.5 w-3.5" />
              Paramètres
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] space-y-4 p-3">
            <p className="text-xs text-muted-foreground">
              Changer d'agent ferme la session en cours ; le prochain message la relance.
            </p>
            <AtelierAgentFields value={settings} onChange={updateSettings} />
            <div className="space-y-2 border-t border-border pt-3">
              <h3 className={FIELD_LABEL_CLASSES}>Mode</h3>
              <ResearchFields
                enabled={conversation.researchEnabled}
                options={conversation.researchOptions}
                onEnabledChange={(researchEnabled) => updateSettings({ researchEnabled })}
                onOptionsChange={(researchOptions) => updateSettings({ researchOptions })}
              />
            </div>
          </PopoverContent>
        </Popover>
        {running && (
          <Button size="sm" variant="outline" onClick={interrupt} disabled={busy}>
            <Square className="h-3.5 w-3.5" />
            Interrompre
          </Button>
        )}
        <Button
          size="sm"
          onClick={consolidate}
          disabled={!hasAssistantReply || running || busy}
          title={hasAssistantReply ? undefined : "Disponible après la première réponse de l'agent"}
        >
          <FileText className="h-3.5 w-3.5" />
          Consolider en PRD
        </Button>
      </div>

      <div ref={threadRef} onScroll={onThreadScroll} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {items.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Décris ton idée : l'agent pose ses questions puis t'aide à la consolider en PRD.
            </p>
          )}
          {items.map((item, index) => {
            if (item.kind === "activity") {
              const live = running && index === items.length - 1;
              return <ActivityBlock key={item.id} rows={item.rows} live={live} />;
            }
            return <MessageBubble key={item.message.id} message={item.message} agent={label} />;
          })}
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

      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            rows={3}
            className="min-h-[72px] resize-none"
            placeholder="Réponds à l'agent… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
            aria-label="Message à l'agent"
          />
          <div className="flex items-center gap-2">
            {error && <p className="min-w-0 flex-1 truncate text-xs text-danger">{error}</p>}
            <Button size="sm" className="ml-auto" onClick={() => void send()} disabled={!draft.trim() || busy || running}>
              <Send className="h-3.5 w-3.5" />
              Envoyer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, agent }: { message: ConversationMessage; agent: string }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[80%] rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        <Markdown content={message.content} />
      </div>
    );
  }
  return (
    <div className="max-w-full text-sm">
      <p className="mb-1 font-mono text-2xs text-muted-foreground">{agent}</p>
      <Markdown content={message.content} />
    </div>
  );
}

function ActivityBlock({ rows, live }: { rows: ConversationMessage[]; live: boolean }) {
  return (
    <details open={live} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground">
        {live && <LiveDot />}
        <span className={FIELD_LABEL_CLASSES}>Réflexion</span>
        <span className="font-mono text-2xs">{rows.length}</span>
      </summary>
      <ul className="mt-2 space-y-1 font-mono text-2xs text-muted-foreground">
        {rows.map((row) => (
          <li key={row.id} className="truncate">
            {row.content}
          </li>
        ))}
      </ul>
    </details>
  );
}
