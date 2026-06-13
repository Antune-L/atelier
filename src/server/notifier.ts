import type { ClientHub } from "./hub.ts";

/**
 * Fans a notification out to the UI, which raises a toast and a desktop
 * notification. A native OS notification is intentionally avoided: clicking it
 * focuses the emitting process (e.g. Script Editor) instead of the browser.
 */
export class Notifier {
  constructor(private readonly hub: ClientHub) {}

  notify(title: string, body: string): Promise<void> {
    this.hub.pushNotification(title, body);
    return Promise.resolve();
  }
}
