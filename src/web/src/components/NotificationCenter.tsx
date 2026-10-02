import { Bell, Check, CheckCircle2, ExternalLink, GitPullRequest, Loader2, UserRound, Volume2, VolumeX } from "lucide-react";
import { useRef, useState } from "react";

import type { PrNotification, ProjectInfo } from "@shared/schemas";

import { resolveProjectColor, resolveProjectLabel } from "@/components/TicketCard";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useBoard } from "@/hooks/useBoard";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/display";
import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const MAX_BADGE_COUNT = 99;
type NotificationFilter = "active" | "unread" | "history";
const FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: "active", label: "À relire" },
  { value: "unread", label: "Non lues" },
  { value: "history", label: "Historique" },
];

function isPending(notification: PrNotification): boolean {
  return notification.readAt === null && notification.resolvedAt === null;
}

export function NotificationCenter({ projects, className }: { projects: ProjectInfo[]; className?: string }) {
  const { prNotifications, prNotificationSync, notificationCenterOpen, soundEnabled, connected } = useBoard();
  const [filter, setFilter] = useState<NotificationFilter>("active");
  const [pending, setPending] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pendingIds = useRef(new Set<string>());
  const unread = prNotifications.filter(isPending);
  const history = prNotifications.filter((notification) => !isPending(notification));
  const visible = filter === "history" ? history : unread;
  const syncErrors = prNotificationSync.filter((status) => status.error !== null);
  const syncUnavailable = !connected || syncErrors.length > 0;
  const lastCheckedAt = prNotificationSync.reduce<number | null>((latest, status) => {
    if (status.lastCheckedAt === null) return latest;
    return latest === null ? status.lastCheckedAt : Math.min(latest, status.lastCheckedAt);
  }, null);

  const runAction = async (notification: PrNotification, review: boolean): Promise<void> => {
    if (pendingIds.current.has(notification.id)) return;
    pendingIds.current.add(notification.id);
    setPending([...pendingIds.current]);
    setError(null);
    try {
      if (review) {
        const result = await api.createPrNotificationReview(notification.id);
        boardStore.closeNotificationCenter();
        boardStore.openTicket(result.ticket.id);
      } else {
        await api.markPrNotificationRead(notification.id);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action impossible. Réessayez.");
    } finally {
      pendingIds.current.delete(notification.id);
      setPending([...pendingIds.current]);
    }
  };

  return (
    <>
      <div className={cn("flex shrink-0 items-center border-l pl-2", className)}>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-7 w-7"
          aria-label={`Notifications : ${unread.length} non lues`}
          aria-expanded={notificationCenterOpen}
          aria-haspopup="dialog"
          title="Notifications PR"
          onClick={() => boardStore.openNotificationCenter()}
        >
          <Bell className={cn("h-3.5 w-3.5", unread.length > 0 && "text-brand")} />
          {unread.length > 0 && (
            <span className="absolute -right-1 -top-1 min-w-3.5 rounded-full bg-brand px-1 font-mono text-[9px] leading-3.5 text-primary-foreground">
              {unread.length > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : unread.length}
            </span>
          )}
        </Button>
      </div>
      <Sheet
        open={notificationCenterOpen}
        onOpenChange={(open) => open ? boardStore.openNotificationCenter() : boardStore.closeNotificationCenter()}
        title={<span className="flex items-center gap-2"><Bell className="h-4 w-4 text-brand" />Notifications</span>}
        titleAside={<span className="rounded border px-1.5 font-mono text-2xs text-muted-foreground">{unread.length}</span>}
        size="md"
        className="w-[390px] max-w-[100vw]"
        subheader={
          <>
            <p className="px-4 py-3 text-xs text-muted-foreground">Les PR qui attendent votre regard.</p>
            <div role="group" aria-label="Filtrer les notifications" className="flex border-b px-2">
              {FILTERS.map((option) => (
                <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)} className={cn("flex h-9 items-center gap-1.5 px-2 text-xs transition-colors", filter === option.value ? "text-foreground shadow-[inset_0_-2px_0_hsl(var(--brand))]" : "text-muted-foreground hover:text-foreground")}>
                  {option.label}<span className="font-mono text-2xs">{option.value === "history" ? history.length : unread.length}</span>
                </button>
              ))}
            </div>
          </>
        }
      >
        <div className="flex min-h-0 w-full flex-col">
          <div className="flex items-center justify-between px-4 py-3 text-2xs text-muted-foreground">
            <span>{visible.length} notification{visible.length > 1 ? "s" : ""}</span>
            {filter !== "history" && unread.length > 0 && <Button variant="ghost" size="sm" className="h-5 px-0 text-2xs" disabled={pending.length > 0} onClick={() => { for (const notification of unread) void runAction(notification, false); }}>Tout marquer lu</Button>}
          </div>
          {error && <p role="alert" className="mx-4 mb-3 rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{error}</p>}
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-xs text-muted-foreground">
                {!syncUnavailable ? <CheckCircle2 className="h-6 w-6 text-brand" /> : <Loader2 className="h-6 w-6 animate-spin" />}
                <strong className="text-sm font-medium text-foreground">{syncUnavailable ? "Synchronisation en attente" : "Tout est à jour"}</strong>
                <p>{filter === "history" ? "Les notifications lues et les alertes closes apparaissent ici." : "Aucune nouvelle PR à relire. Retrouvez les notifications lues dans l’historique."}</p>
              </div>
            ) : visible.map((notification) => {
              const busy = pending.includes(notification.id);
              const projectColor = resolveProjectColor(projects, notification.project);
              let reason = "Votre review est demandée";
              if (notification.readAt !== null) reason = "Notification lue · review non terminée";
              if (notification.resolvedAt !== null) reason = "PR hors des critères de notification";
              return (
                <article key={notification.id} className="border-b py-4 last:border-b-0">
                  <div className="flex items-center gap-1.5 font-mono text-2xs text-muted-foreground">
                    <GitPullRequest className="h-3.5 w-3.5" />
                    <span className="truncate" style={projectColor ? { color: projectColor } : undefined}>{resolveProjectLabel(projects, notification.project)}</span>
                    <span>#{notification.prNumber}</span>
                    {isPending(notification) ? <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-label="Non lue" /> : <span className="ml-auto">{notification.resolvedAt !== null ? "Clôturée" : "Lue"}</span>}
                  </div>
                  <h2 className="mt-2 text-sm font-medium leading-5">{notification.title}</h2>
                  <p className="mt-1 text-2xs text-muted-foreground">{notification.author} · {formatDateTime(notification.detectedAt)}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-2xs text-muted-foreground"><UserRound className="h-3 w-3 shrink-0" />{reason}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {notification.ticketId !== null ? (
                      <Button variant="outline" size="sm" className="h-6 px-2 text-2xs" disabled={busy} onClick={() => void runAction(notification, true)}>Ouvrir la review</Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-6 px-2 text-2xs" disabled={busy} onClick={() => void runAction(notification, true)}>{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitPullRequest className="h-3 w-3" />}Review</Button>
                    )}
                    {isPending(notification) && <Button variant="ghost" size="sm" className="h-6 px-2 text-2xs text-muted-foreground" disabled={busy} onClick={() => void runAction(notification, false)}><Check className="h-3 w-3" />Marquer lu</Button>}
                    <a href={notification.prUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex h-6 items-center gap-1 rounded px-1 text-2xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Ouvrir la PR #${notification.prNumber}`}><ExternalLink className="h-3 w-3" />PR</a>
                  </div>
                </article>
              );
            })}
          </div>
          <footer className="shrink-0 border-t bg-background/50 px-4 py-3 text-2xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className={cn("h-1.5 w-1.5 rounded-full", connected && syncErrors.length === 0 ? "bg-success" : "bg-warning")} /><span>{prNotificationSync.length} projet{prNotificationSync.length > 1 ? "s" : ""} surveillé{prNotificationSync.length > 1 ? "s" : ""}</span>
              <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" aria-label="Son pour les nouvelles PR" aria-pressed={soundEnabled} title={soundEnabled ? "Désactiver le son pour les nouvelles PR" : "Activer le son pour les nouvelles PR"} onClick={() => boardStore.setSoundEnabled(!soundEnabled)}>{soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}</Button>
            </div>
            <p>{lastCheckedAt === null ? "Première synchronisation en attente." : `Vérifié le ${formatDateTime(lastCheckedAt)}`}</p>
            {!connected && <p role="status" className="mt-1 text-warning">Connexion interrompue · données conservées.</p>}
            {syncErrors.map((status) => <p key={status.project} role="alert" className="mt-1 text-warning">{resolveProjectLabel(projects, status.project)} : {status.error}</p>)}
            <p className="mt-2 leading-relaxed">Nouvelle PR hors brouillon · review demandée.<br />Marquer lu déplace l’alerte dans l’historique.<br />La review reste à faire.</p>
          </footer>
        </div>
      </Sheet>
    </>
  );
}
