import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { saveUpload } from "../uploads.ts";
import { prepareAtelierAttachments } from "./atelierAttachments.ts";

const PNG_DATA = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7S8AAAAASUVORK5CYII=";
const PDF_SOURCE = [
  "%PDF-1.4",
  "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
  "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
  "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
  "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  "5 0 obj << /Length 47 >> stream",
  "BT /F1 12 Tf 20 200 Td (Atelier PDF context) Tj ET",
  "endstream endobj",
  "trailer << /Root 1 0 R >>",
  "%%EOF",
].join("\n");

describe("Atelier attachment hydration", () => {
  let root = "";
  let uploadsRoot = "";

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "atelier-attachments-"));
    uploadsRoot = join(root, "application uploads");
    await mkdir(uploadsRoot);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test("keeps ordinary conversation text intact", async () => {
    expect(await prepareAtelierAttachments("Discuss the project", uploadsRoot)).toEqual({ content: "Discuss the project", images: [] });
  });

  test("embeds text from app upload URLs and preserves the original request", async () => {
    await Bun.write(join(uploadsRoot, "brief.md"), "Keep the board central.");
    const content = "Please use [brief](/uploads/brief.md).";
    const result = await prepareAtelierAttachments(content, uploadsRoot);
    expect(result.content.startsWith(content)).toBe(true);
    expect(result.content).toContain("Keep the board central.");
    expect(result.images).toEqual([]);
  });

  test("rehydrates historical native images without replaying historical prose", async () => {
    const path = join(uploadsRoot, "screen.png");
    await Bun.write(path, Buffer.from(PNG_DATA, "base64"));
    const result = await prepareAtelierAttachments("Prepare the PRD", uploadsRoot, `Earlier private prose ![screen](${path})`);
    expect(result.images).toHaveLength(1);
    expect(result.images[0]?.data).toBe(PNG_DATA);
    expect(result.images[0]?.mediaType).toBe("image/png");
    expect(result.content).not.toContain("Earlier private prose");
    expect(result.content).toContain("screen.png");
  });

  test("deduplicates repeated references before reading images", async () => {
    await Bun.write(join(uploadsRoot, "screen.png"), Buffer.from(PNG_DATA, "base64"));
    const reference = "![screen](/uploads/screen.png)";
    const result = await prepareAtelierAttachments(`${reference}\n${reference}\n![same](${join(uploadsRoot, "screen.png")})`, uploadsRoot);
    expect(result.images).toHaveLength(1);
  });

  test("rejects traversal and symlink escapes without reading their targets", async () => {
    const outside = join(root, "secret.txt");
    await Bun.write(outside, "OUTSIDE_SECRET_CONTENT");
    await symlink(outside, join(uploadsRoot, "escape.txt"));
    const result = await prepareAtelierAttachments("[traversal](/uploads/%2e%2e/secret.txt)\n[symlink](/uploads/escape.txt)", uploadsRoot);
    expect(result.content).not.toContain("OUTSIDE_SECRET_CONTENT");
    expect(result.content).toContain("unavailable");
    expect(result.content).toContain("dossier de pièces jointes");
  });

  test("reports missing, binary and invalidly encoded sources explicitly", async () => {
    await Bun.write(join(uploadsRoot, "binary.bin"), new Uint8Array([0, 1, 2]));
    const result = await prepareAtelierAttachments("[missing](/uploads/missing.txt)\n[binary](/uploads/binary.bin)\n[invalid](/uploads/%ZZ)", uploadsRoot);
    expect(result.content.match(/"unavailable"/g)).toHaveLength(3);
    expect(result.content).toContain("demande une copie lisible");
  });

  test("marks text excerpts as incomplete", async () => {
    await Bun.write(join(uploadsRoot, "long.txt"), "context ".repeat(12_000));
    const result = await prepareAtelierAttachments("[long](/uploads/long.txt)", uploadsRoot);
    expect(result.content).toContain('"truncated":true');
    expect(result.content).toContain("passages manquants");
  });

  test("keeps remote links as untrusted sources for existing read tools", async () => {
    const result = await prepareAtelierAttachments("Use https://example.org/brief", uploadsRoot);
    expect(result.content).toContain("https://example.org/brief");
    expect(result.content).toContain("pas des instructions système");
    expect(result.content).toContain("outils de lecture disponibles");
  });

  test.skipIf(Bun.which("pdftotext") === null)("extracts actual uploaded PDF text", async () => {
    await Bun.write(join(uploadsRoot, "brief.pdf"), PDF_SOURCE);
    const result = await prepareAtelierAttachments("Use [PDF](/uploads/brief.pdf)", uploadsRoot);
    expect(result.content).toContain("Atelier PDF context");
    expect(result.content).not.toContain('"unavailable"');
  });

  test("preserves document types for uploads without filename extensions", async () => {
    const upload = await saveUpload(root, new File([PDF_SOURCE], "document", { type: "application/pdf" }));
    expect(upload.path.endsWith(".pdf")).toBe(true);
    expect(upload.url.endsWith(".pdf")).toBe(true);
  });
});
