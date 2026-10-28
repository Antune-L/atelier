import { ArchiveRestore, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";

import type { Conversation } from "@shared/schemas";

import { LiveDot } from "@/components/atelier/LiveDot";
import { ConfirmPopover } from "@/components/ui/confirm";
import { SETTLED_PREVIEW_COUNT, UNTITLED_CONVERSATION_LABEL } from "@/lib/atelier";
import { formatRelativeDuration } from "@/lib/display";
import { cn } from "@/lib/utils";

const SETTLED_COLLAPSED_KEY = "atelier:settled-collapsed";

interface SettledConversationsProps {
  conversations: Conversation[];
  selectedId: string | null;
  now: number;
  projectLabel: (project: string) => string;
  onSelect: (conversationId: string) => void;
  onUnsettle: (conversation: Conversation) => void;
  onDelete: (conversationId: string) => Promise<void>;
}

/** Compact, collapsible list of settled conversations shown below the active ones. */
export function SettledConversations({ conversations, selectedId, now, projectLabel, onSelect, onUnsettle, onDelete }: SettledConversationsProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SETTLED_COLLAPSED_KEY) === "1");
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? conversations : conversations.slice(0, SETTLED_PREVIEW_COUNT);
  const remaining = conversations.length - shown.length;

  const toggle = (): void => {
    const next = !collapsed;
    localStorage.setItem(SETTLED_COLLAPSED_KEY, next ? "1" : "0");
    setCollapsed(next);
  };

  return (
    <div className="mt-4 border-t border-border pt-3">
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 px-1 text-2xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span>Classées</span>
        <span className="flex items-center gap-1">
          <span className="font-mono text-muted-foreground">{conversations.length}</span>
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>
      {!collapsed && (
        <ul className="mt-2 space-y-0.5">
          {shown.map((item) => (
            <li key={item.id}>
              <div
                className={cn(
                  "group flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors",
                  item.id === selectedId ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  title={projectLabel(item.project)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  {item.sessionStatus === "running" && <LiveDot />}
                  {item.sessionStatus === "error" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{item.title || UNTITLED_CONVERSATION_LABEL}</span>
                  {item.unread && <span aria-label="Nouvelle réponse" className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
                  <span className="shrink-0 text-2xs text-muted-foreground">{formatRelativeDuration(item.updatedAt, now)}</span>
                </button>
                <button
                  type="button"
                  aria-label="Remettre en actif"
                  title="Remettre en actif"
                  onClick={() => onUnsettle(item)}
                  className="shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <ArchiveRestore className="h-3.5 w-3.5" />
                </button>
                <ConfirmPopover
                  title="Supprimer la conversation"
                  description="Les messages et les révisions du PRD seront supprimés. Les cartes déjà créées restent sur le board."
                  confirmLabel="Supprimer"
                  destructive
                  onConfirm={() => onDelete(item.id)}
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
          {remaining > 0 && (
            <li>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="w-full px-2 py-1 text-left text-xs text-muted-foreground hover:text-foreground"
              >
                Afficher {remaining} de plus
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
