import { afterEach, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ensureMcpToken, regenerateMcpToken } from "./bootstrap.ts";

const TOKEN_FILE = "mcp-token";
const PRIVATE_FILE_MODE = 0o600;
const TOKEN_HEX_LENGTH = 64;

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "atelier-mcp-token-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("ensureMcpToken creates and reuses a private persistent token", () => {
  const dataRoot = createTemporaryDirectory();
  const tokenPath = join(dataRoot, TOKEN_FILE);

  const token = ensureMcpToken(dataRoot);

  expect(token).toHaveLength(TOKEN_HEX_LENGTH);
  expect(token).toMatch(/^[a-f0-9]+$/);
  expect(readFileSync(tokenPath, "utf8")).toBe(`${token}\n`);
  expect(statSync(tokenPath).mode & 0o777).toBe(PRIVATE_FILE_MODE);

  chmodSync(tokenPath, 0o644);
  expect(ensureMcpToken(dataRoot)).toBe(token);
  expect(statSync(tokenPath).mode & 0o777).toBe(PRIVATE_FILE_MODE);
});

test("regenerateMcpToken replaces the token and keeps the file private", () => {
  const dataRoot = createTemporaryDirectory();
  const tokenPath = join(dataRoot, TOKEN_FILE);
  writeFileSync(tokenPath, "previous-token\n", { mode: 0o644 });

  const token = regenerateMcpToken(dataRoot);

  expect(token).toHaveLength(TOKEN_HEX_LENGTH);
  expect(token).not.toBe("previous-token");
  expect(readFileSync(tokenPath, "utf8")).toBe(`${token}\n`);
  expect(statSync(tokenPath).mode & 0o777).toBe(PRIVATE_FILE_MODE);
});
