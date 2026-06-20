import type { ClientHub } from "./hub.ts";

/** Optional native-notification sink. The desktop wrapper wires this to Electrobun's showNotification. */
export type NativeNotify = (title: string, body: string) => void;

/**
 * Fans a notification out to the UI, which raises a toast and (in a browser) a
 * web Notification. In the desktop app WKWebView exposes no web Notification API,
 * so the wrapper passes `onNative` to fire a native OS notification attributed to
 * the app itself (clicking it focuses the app window).
 */
export class Notifier {
  constructor(
    private readonly hub: ClientHub,
    private readonly onNative?: NativeNotify,
  ) {}

  notify(title: string, body: string, ticketId?: string): Promise<void> {
    this.hub.pushNotification(title, body, ticketId);
    this.onNative?.(title, body);
    return Promise.resolve();
  }
}
