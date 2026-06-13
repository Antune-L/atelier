/**
 * In-memory rolling line buffer keyed by id. Backs the live triage terminal:
 * the triage stream appends readable lines here and the UI polls them. Transient
 * by design — cleared when a fresh run starts, lost on restart (a finished run's
 * verdict is persisted on the ticket).
 */

const MAX_LINES = 2000;

export class LiveLog {
  private readonly buffers = new Map<string, string[]>();

  append(key: string, line: string): void {
    const buffer = this.buffers.get(key) ?? [];
    buffer.push(line);
    if (buffer.length > MAX_LINES) buffer.splice(0, buffer.length - MAX_LINES);
    this.buffers.set(key, buffer);
  }

  get(key: string): string {
    return (this.buffers.get(key) ?? []).join("\n");
  }

  clear(key: string): void {
    this.buffers.delete(key);
  }
}
