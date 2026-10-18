import { describe, expect, test } from "bun:test";

import { uploadAttachmentBatch, uploadSelectedAttachments } from "./AtelierAttachments";

describe("Atelier attachment selection", () => {
  test("preserves the draft on partial batch failure and appends each reference once on retry", async () => {
    const files = [new File(["first"], "first.txt"), new File(["second"], "second.txt")];
    let draft = "Existing draft";
    let appendCount = 0;
    let rejectSecond = true;
    const append = (markdown: string): void => {
      appendCount += 1;
      draft += `\n${markdown}`;
    };
    const upload = async (file: File): Promise<string> => {
      expect(draft).toBe("Existing draft");
      if (file.name === "second.txt" && rejectSecond) throw new Error("Upload failed");
      return `[${file.name}](/uploads/${file.name})`;
    };

    await expect(uploadAttachmentBatch(files, append, upload)).rejects.toThrow("Upload failed");
    expect(draft).toBe("Existing draft");
    expect(appendCount).toBe(0);

    rejectSecond = false;
    await uploadAttachmentBatch(files, append, upload);
    expect(appendCount).toBe(1);
    expect(draft).toBe("Existing draft\n[first.txt](/uploads/first.txt)\n[second.txt](/uploads/second.txt)");
  });

  test("clears a failed file selection so selecting the same file can trigger another upload", async () => {
    const file = new File(["retry"], "retry.txt");
    const files = {
      0: file,
      length: 1,
      item: (index: number) => index === 0 ? file : null,
      [Symbol.iterator]: () => [file][Symbol.iterator](),
    } satisfies FileList;
    const input = { files, value: "retry.txt" };
    const attempts: File[][] = [];
    const upload = async (selected: File[]): Promise<boolean> => {
      attempts.push(selected);
      return attempts.length > 1;
    };

    await uploadSelectedAttachments(input, upload);
    expect(input.value).toBe("");
    input.value = "retry.txt";
    await uploadSelectedAttachments(input, upload);
    expect(input.value).toBe("");
    expect(attempts).toEqual([[file], [file]]);
  });

  test("clears the file selection even when the upload unexpectedly rejects", async () => {
    const file = new File(["retry"], "retry.txt");
    const files = {
      0: file,
      length: 1,
      item: (index: number) => index === 0 ? file : null,
      [Symbol.iterator]: () => [file][Symbol.iterator](),
    } satisfies FileList;
    const input = { files, value: "retry.txt" };
    await expect(uploadSelectedAttachments(input, async () => {
      throw new Error("Upload rejected");
    })).rejects.toThrow("Upload rejected");
    expect(input.value).toBe("");
  });
});
