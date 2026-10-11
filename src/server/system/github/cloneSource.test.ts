import { describe, expect, test } from "bun:test";

import { parseCloneSource } from "./cloneSource.ts";
import { isSshRemote, parseGithubRemote } from "./remote.ts";

describe("parseCloneSource", () => {
  test.each([
    "git@github.com:Org/Repo.git",
    "git@github.com:Org/Repo",
    "https://github.com/Org/Repo",
    "https://github.com/Org/Repo.git",
    "https://github.com/Org/Repo/",
    "ssh://git@github.com/Org/Repo.git",
    "Org/Repo",
  ])("rebuilds the HTTPS URL from %s", (source) => {
    const parsed = parseCloneSource(source, "alice");
    expect(parsed).toEqual({
      ok: true,
      owner: "Org",
      repo: "Repo",
      cloneUrl: "https://github.com/Org/Repo.git",
      relativePath: "alice/org/repo",
    });
  });

  test("uses the machine segment without an account and differs per account", () => {
    const machine = parseCloneSource("Org/Repo", null);
    const alice = parseCloneSource("Org/Repo", "Alice");
    const bob = parseCloneSource("Org/Repo", "bob");
    expect(machine.ok && machine.relativePath).toBe("_machine/org/repo");
    expect(alice.ok && alice.relativePath).toBe("alice/org/repo");
    expect(bob.ok && bob.relativePath).toBe("bob/org/repo");
  });

  test.each([
    "-uOrg/Repo",
    "--upload-pack=x",
    "ext::sh -c touch",
    "ext::git",
    "file:///etc/passwd",
    "https://alice:secret@github.com/o/r.git",
    "https://token@github.com/o/r.git",
    "https://github.com/o/r.git?x=1",
    "https://github.com/o/r#main",
    "https://github.com/o/../r",
    "o/..",
    "../r",
    "o r/x",
    "https://github.com/o/r/tree/main",
    "http://github.com/o/r",
    "https://github.com:8443/o/r",
    "",
  ])("refuses %s", (source) => {
    expect(parseCloneSource(source, null).ok).toBe(false);
  });

  test.each([
    "https://dev.azure.com/org/project/_git/repo",
    "git@ssh.dev.azure.com:v3/org/project/repo",
    "https://org.visualstudio.com/project/_git/repo",
    "https://github.example.com/o/r",
    "git@gitlab.com:o/r.git",
  ])("refuses another host with a pointer to the local folder mode: %s", (source) => {
    const parsed = parseCloneSource(source, null);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reason).toContain("Dossier local");
  });

  test("refuses an invalid account", () => {
    expect(parseCloneSource("o/r", "-bad").ok).toBe(false);
  });
});

describe("remote helpers", () => {
  test("parses scp and URL remotes alike", () => {
    expect(parseGithubRemote("git@github.com:o/r.git")).toEqual({ host: "github.com", owner: "o", repository: "r" });
    expect(parseGithubRemote("https://github.com/o/r.git\n")).toEqual({ host: "github.com", owner: "o", repository: "r" });
  });

  test("detects SSH remotes", () => {
    expect(isSshRemote("git@github.com:o/r.git")).toBe(true);
    expect(isSshRemote("ssh://git@github.com/o/r.git")).toBe(true);
    expect(isSshRemote("https://github.com/o/r.git")).toBe(false);
  });
});
