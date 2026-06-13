import type { ClientHub } from "./hub.ts";
import type { SystemAdapter } from "./system/index.ts";

/** Fans a notification out to macOS (osascript) and the UI toast channel. */
export class Notifier {
  constructor(
    private readonly system: SystemAdapter,
    private readonly hub: ClientHub,
  ) {}

  async notify(title: string, body: string): Promise<void> {
    this.hub.pushNotification(title, body);
    await this.system.notify(title, body);
  }
}
