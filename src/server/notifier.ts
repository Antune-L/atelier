import type { NotificationSoundKind } from "../shared/schemas.ts";
import type { ClientHub } from "./hub.ts";

/** Optional native-notification sink. The desktop wrapper wires this to Electrobun's showNotification. */
export type NativeNotify = (title: string, body: string, soundKind?: NotificationSoundKind) => void;

/**
 * Fans a notification out to the UI, which raises a toast and (in a browser) a
 * web Notification. In the desktop app WKWebView exposes no web Notification API,
 * so the wrapper passes `onNative` to fire a native OS notification attributed to
 * the app itself (clicking it focuses the app window).
 */
export class Notifier {
  private silenced: ((ticketId: string) => boolean) | null = null;

  constructor(
    private readonly hub: ClientHub,
    private readonly onNative?: NativeNotify,
  ) {}

  /** Tickets whose notifications are withheld, e.g. campaign cards until the single final report (FR11). */
  silence(predicate: (ticketId: string) => boolean): void {
    this.silenced = predicate;
  }

  notify(title: string, body: string, ticketId?: string, sound?: boolean, soundKind?: NotificationSoundKind): Promise<void> {
    if (ticketId !== undefined && this.silenced?.(ticketId)) return Promise.resolve();
    this.hub.pushNotification(title, body, ticketId, sound, soundKind ?? (sound ? "completion" : undefined));
    this.onNative?.(title, body, soundKind);
    return Promise.resolve();
  }
}
