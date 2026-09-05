import type { TranscriptUpdate } from "../../shared/transcript.ts";
import type { AgentStreamBlock } from "../system/agentSession.ts";

interface Block {
  id: number;
  key: string | null;
  prefix: string;
  chunks: string[];
  chunkStart: number;
  leadingOffset: number;
  textLength: number;
  version: number;
}

const DEFAULT_MAX_BLOCKS = 2_000;
const CHUNK_COMPACT_THRESHOLD = 1_024;

function blockText(block: Block): string {
  const chunks = block.chunks.slice(block.chunkStart);
  if (chunks.length === 0) return "";
  if (block.leadingOffset > 0) chunks[0] = chunks[0]?.slice(block.leadingOffset) ?? "";
  return chunks.join("");
}

function compactChunks(block: Block): void {
  if (block.chunkStart < CHUNK_COMPACT_THRESHOLD || block.chunkStart * 2 < block.chunks.length) return;
  block.chunks = block.chunks.slice(block.chunkStart);
  block.chunkStart = 0;
}

function firstCharCode(block: Block): number {
  for (let index = block.chunkStart; index < block.chunks.length; index += 1) {
    const chunk = block.chunks[index];
    if (chunk === undefined) continue;
    const offset = index === block.chunkStart ? block.leadingOffset : 0;
    if (offset < chunk.length) return chunk.charCodeAt(offset);
  }
  return Number.NaN;
}

function trimBlockStart(block: Block, count: number): number {
  let remaining = Math.min(count, block.textLength);
  const removed = remaining;
  while (remaining > 0) {
    const chunk = block.chunks[block.chunkStart];
    if (chunk === undefined) break;
    const available = chunk.length - block.leadingOffset;
    if (remaining < available) {
      block.leadingOffset += remaining;
      remaining = 0;
      break;
    }
    remaining -= available;
    block.chunkStart += 1;
    block.leadingOffset = 0;
  }
  block.textLength -= removed - remaining;
  compactChunks(block);
  return removed - remaining;
}

/** Keep mutable stream items separate; flatten only when a viewer requests a snapshot. */
export class TranscriptBuffer {
  readonly generation = crypto.randomUUID();
  private version = 0;
  private nextId = 0;
  private size = 0;
  private truncated = false;
  private readonly blocks: Block[] = [];
  private readonly items = new Map<string, Block>();

  constructor(private readonly maxChars = 200_000, private readonly maxBlocks = DEFAULT_MAX_BLOCKS) {}

  append(text: string, prefix = "", stream?: AgentStreamBlock, source = "main"): void {
    if (!text && !stream) return;
    const key = stream ? `${source}:${stream.itemId}` : null;
    let block = key ? this.items.get(key) : undefined;
    if (block) {
      if (stream?.mode === "snapshot") {
        const current = blockText(block);
        if (text === current) return;
        this.size += text.length - block.textLength;
        block.chunks = [text];
        block.chunkStart = 0;
        block.leadingOffset = 0;
        block.textLength = text.length;
      } else {
        if (!text) return;
        block.chunks.push(text);
        block.textLength += text.length;
        this.size += text.length;
      }
      block.version = ++this.version;
    } else {
      block = {
        id: this.nextId++,
        key,
        prefix,
        chunks: [text],
        chunkStart: 0,
        leadingOffset: 0,
        textLength: text.length,
        version: ++this.version,
      };
      this.blocks.push(block);
      if (key) this.items.set(key, block);
      this.size += prefix.length + text.length + 1;
    }
    while ((this.size > this.maxChars || this.blocks.length > this.maxBlocks) && this.blocks.length > 1) {
      this.truncated = true;
      const removed = this.blocks.shift();
      if (!removed) break;
      this.size -= removed.prefix.length + removed.textLength + 1;
      if (removed.key) this.items.delete(removed.key);
    }
    const first = this.blocks[0];
    if (first && this.size > this.maxChars) {
      this.truncated = true;
      trimBlockStart(first, this.size - this.maxChars);
      // Avoid starting the retained suffix in the middle of a UTF-16 surrogate pair.
      const code = firstCharCode(first);
      if (code >= 0xdc00 && code <= 0xdfff) trimBlockStart(first, 1);
      this.size = first.prefix.length + first.textLength + 1;
      first.version = this.version;
    }
  }

  read(cursor?: string): TranscriptUpdate {
    const [generation, rawVersion] = cursor?.split(":") ?? [];
    const version = Number(rawVersion);
    const reset = generation !== this.generation || !Number.isSafeInteger(version) || version < 0 || version > this.version;
    return {
      generation: this.generation,
      version: this.version,
      firstId: this.blocks[0]?.id ?? this.nextId,
      reset,
      truncated: this.truncated,
      blocks: this.blocks.filter((block) => reset || block.version > version).map((block) => ({
        id: block.id,
        text: `${block.prefix}${blockText(block)}\n`,
      })),
    };
  }

  text(): string {
    return this.blocks.map((block) => `${block.prefix}${blockText(block)}\n`).join("");
  }
}
