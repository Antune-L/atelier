import type { AgentProvider, AgentSessionEvent, AgentSessionHandle, AgentSessionOptions } from "./agentSession.ts";

/** Run one isolated read-only turn through the same provider policy as interactive sessions. */
export async function runOneShotSession(
  provider: AgentProvider,
  options: Omit<AgentSessionOptions, "onEvent" | "onToolCall" | "ticketId" | "slotId">,
  prompt: string,
  timeoutMs: number,
  onEvent?: (event: AgentSessionEvent) => void,
  cleanupTimeoutMs = 5_000,
): Promise<string> {
  let session: AgentSessionHandle | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  let operationError: unknown;
  let operationFailed = false;
  let result = "";
  try {
    result = await new Promise<string>((resolve, reject) => {
      const blocks = new Map<string, string>();
      let legacyId = 0;
      timer = setTimeout(() => {
        timedOut = true;
        reject(new Error(`Timeout (${timeoutMs}ms)`));
      }, timeoutMs);
      session = provider.createSession({
        ...options,
        ticketId: `one-shot-${crypto.randomUUID()}`,
        slotId: -1,
        disableWorkerTools: true,
        readOnly: true,
        role: "one-shot",
        onToolCall: async () => ({ ok: false, result: "Outil indisponible pour cette opération." }),
        onEvent: (event) => {
          onEvent?.(event);
          if (event.type === "assistant_text" && !event.sourceId) {
            const key = event.stream?.itemId ?? `legacy-${legacyId++}`;
            blocks.set(key, event.stream?.mode === "snapshot" ? event.text : (blocks.get(key) ?? "") + event.text);
          }
          if (event.type === "error") reject(new Error(event.message));
          if (event.type === "turn_end") {
            const text = [...blocks.values()].join("");
            if (!event.ok) reject(new Error(`Opération échouée : ${event.subtype}`));
            else if (!text.trim()) reject(new Error("Réponse vide"));
            else resolve(text.trim());
          }
        },
      });
      session.send(prompt);
    });
  } catch (error) {
    operationFailed = true;
    operationError = error;
  } finally {
    if (timer) clearTimeout(timer);
    if (timedOut) void session?.interrupt().catch(() => undefined);
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        session?.close(),
        new Promise<never>((_, reject) => {
          cleanupTimer = setTimeout(() => reject(new Error("Délai de fermeture de l'opération dépassé")), cleanupTimeoutMs);
        }),
      ]);
    } catch (error) {
      session?.dispose?.();
      if (!operationFailed) {
        operationFailed = true;
        operationError = error;
      }
    } finally {
      if (cleanupTimer) clearTimeout(cleanupTimer);
    }
  }
  if (operationFailed) throw operationError;
  return result;
}
