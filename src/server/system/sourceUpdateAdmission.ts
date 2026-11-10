import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";

import { z } from "zod";

import type { AgentProvider, AgentSessionHandle } from "./agentSession.ts";

const sourceRecoverySchema = z.object({
  phase: z.enum(["mutating", "ready"]),
  revision: z.string().regex(/^[a-f0-9]{40,64}$/),
});

export class SourceUpdateAdmission {
  private recoveryPath: string | null = null;

  configureSourceRecovery(path: string): string | null {
    this.recoveryPath = path;
    if (!existsSync(path)) return null;
    const receipt = sourceRecoverySchema.parse(JSON.parse(readFileSync(path, "utf8")));
    if (receipt.phase !== "ready") throw new Error(`Source update interrupted. Repair the frozen install and builds, then remove ${path} before restarting. No rollback was performed.`);
    return receipt.revision;
  }

  recordSourceUpdate(phase: "mutating" | "ready", revision: string): void {
    if (!this.recoveryPath) return;
    const receipt = sourceRecoverySchema.parse({ phase, revision });
    writeFileSync(`${this.recoveryPath}.tmp`, JSON.stringify(receipt), { mode: 0o600 });
    renameSync(`${this.recoveryPath}.tmp`, this.recoveryPath);
  }

  completeSourceRecovery(): void {
    if (this.recoveryPath) rmSync(this.recoveryPath, { force: true });
  }

  private active = 0;
  private updating = false;
  private readonly waiting = new Set<() => void>();

  get isUpdating(): boolean { return this.updating; }

  tryAcquireUpdate(): (() => void) | null {
    if (this.updating || this.active > 0) return null;
    this.updating = true;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.updating = false;
      const waiting = [...this.waiting];
      this.waiting.clear();
      for (const resume of waiting) resume();
    };
  }

  assertAvailable(): void {
    if (this.updating) throw new Error("Mise à jour en cours ou interrompue : répare le checkout puis redémarre l'application avant de lancer un agent.");
  }

  private enter(): () => void {
    this.assertAvailable();
    this.active += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active -= 1;
    };
  }

  async run<T>(operation: () => Promise<T>, defer = true): Promise<T> {
    if (!defer) this.assertAvailable();
    const release = await new Promise<() => void>((resolve) => {
      const reserve = (): void => { resolve(this.enter()); };
      if (this.updating) this.waiting.add(reserve);
      else reserve();
    });
    try {
      return await operation();
    } finally {
      release();
    }
  }

  provider(provider: AgentProvider): AgentProvider {
    return {
      name: provider.name,
      createSession: (options) => this.session(() => provider.createSession(options), options.ticketId, (message) => options.onEvent({ type: "error", message })),
    };
  }

  session(start: () => AgentSessionHandle, ticketId: string, onError?: (message: string) => void): AgentSessionHandle {
    if (this.updating) return this.deferredSession(start, ticketId, onError);
    const release = this.enter();
    try {
      const handle = start();
      const compact = handle.compact?.bind(handle);
      const dispose = handle.dispose?.bind(handle);
      if (handle.closed) void handle.closed.then(release, () => undefined);
      return {
        ticketId: handle.ticketId,
        ...(handle.closed ? { closed: handle.closed } : {}),
        send: handle.send.bind(handle),
        interrupt: handle.interrupt.bind(handle),
        ...(compact ? { compact } : {}),
        ...(dispose ? { dispose } : {}),
        close: async () => {
          await handle.close();
          if (handle.closed) await handle.closed;
          release();
        },
      };
    } catch (error) {
      release();
      throw error;
    }
  }

  private deferredSession(start: () => AgentSessionHandle, ticketId: string, onError?: (message: string) => void): AgentSessionHandle {
    let closed = false;
    let handle: AgentSessionHandle | null = null;
    const messages: Parameters<AgentSessionHandle["send"]>[] = [];
    const resume = (): void => {
      if (closed) return;
      try {
        handle = this.session(start, ticketId, onError);
        for (const args of messages) handle.send(...args);
        messages.length = 0;
      } catch {
        onError?.("Impossible de démarrer la session après la maintenance.");
      }
    };
    this.waiting.add(resume);
    const cancel = (): void => { closed = true; this.waiting.delete(resume); messages.length = 0; };
    return {
      ticketId,
      send: (content, messageId = crypto.randomUUID(), images, options) => {
        if (handle) return handle.send(content, messageId, images, options);
        if (!closed) messages.push([content, messageId, images, options]);
        return messageId;
      },
      interrupt: async () => {
        if (handle) await handle.interrupt();
        else messages.length = 0;
      },
      close: async () => { cancel(); if (handle) await handle.close(); },
      dispose: () => { cancel(); handle?.dispose?.(); },
    };
  }
}
