import { expect, test } from "bun:test";

import { applyTranscriptUpdate, transcriptText } from "../../shared/transcript.ts";
import { TranscriptBuffer } from "./transcriptBuffer.ts";

test("stream items preserve spaces and reconcile final text across interleaved reviewers", () => {
  const buffer = new TranscriptBuffer();
  buffer.append("Bonjour", "", { itemId: "same", mode: "delta" }, "review-1");
  buffer.append("Autre", "", { itemId: "same", mode: "delta" }, "review-2");
  buffer.append(" ", "", { itemId: "same", mode: "delta" }, "review-1");
  buffer.append("monde", "", { itemId: "same", mode: "delta" }, "review-1");
  buffer.append("Bonjour monde !", "", { itemId: "same", mode: "snapshot" }, "review-1");
  expect(buffer.text()).toBe("Bonjour monde !\nAutre\n");
  const initial = buffer.read();
  buffer.append("Bonjour monde !", "", { itemId: "same", mode: "snapshot" }, "review-1");
  expect(buffer.read(`${initial.generation}:${initial.version}`).blocks).toEqual([]);
});

test("incremental snapshots resync after trimming and generation replacement", () => {
  const buffer = new TranscriptBuffer(30);
  buffer.append("Premier message");
  const first = buffer.read();
  let state = applyTranscriptUpdate(null, first);
  buffer.append("Deuxième message");
  const update = buffer.read(`${first.generation}:${first.version}`);
  state = applyTranscriptUpdate(state, update);
  expect(transcriptText(state)).toBe("… Historique ancien tronqué …\n" + buffer.text());
  expect(state.blocks.size).toBe(1);
  expect(applyTranscriptUpdate(state, first)).toBe(state);
  const replacement = new TranscriptBuffer();
  replacement.append("Reprise");
  state = applyTranscriptUpdate(state, replacement.read(`${first.generation}:${first.version}`));
  expect(transcriptText(state)).toBe("Reprise\n");
});

test("long streams remain bounded without splitting surrogate pairs", () => {
  const buffer = new TranscriptBuffer(128);
  for (let index = 0; index < 10_000; index += 1) {
    buffer.append("😀", "", { itemId: "long", mode: "delta" });
  }
  expect(buffer.text().length).toBeLessThanOrEqual(128);
  const firstCode = buffer.text().charCodeAt(0);
  expect(firstCode >= 0xdc00 && firstCode <= 0xdfff).toBe(false);
  expect(buffer.read("invalid").reset).toBe(true);
});

test("long delta streams retain chunked suffixes without growing the block count", () => {
  const buffer = new TranscriptBuffer(200_000);
  for (let index = 0; index < 250_000; index += 1) {
    buffer.append("x", "", { itemId: "long", mode: "delta" });
  }
  expect(buffer.text()).toBe(`${"x".repeat(199_999)}\n`);
  expect(buffer.read().blocks).toHaveLength(1);
});

test("many standalone events remain bounded by block count", () => {
  const buffer = new TranscriptBuffer(1_000_000, 3);
  for (const message of ["one", "two", "three", "four"]) buffer.append(message);
  expect(buffer.text()).toBe("two\nthree\nfour\n");
  expect(buffer.read().truncated).toBe(true);
});
