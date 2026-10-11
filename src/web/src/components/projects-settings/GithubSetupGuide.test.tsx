import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { ManagedProject } from "@shared/schemas";
import { copyGithubLoginCommand, GITHUB_LOGIN_COMMAND, GithubSetupGuide } from "./GithubSetupGuide";
import { connectionHint } from "@/lib/projectConnection";

test("guide renders collapsed and uses a selectable command", () => {
  const html = renderToStaticMarkup(<GithubSetupGuide provider="github" />);
  expect(html).toContain("<details");
  expect(html).toContain("Configurer l’authentification GitHub");
  expect(html).toContain(GITHUB_LOGIN_COMMAND);
  expect(html).toContain("select-all");
  expect(html).not.toContain('<details open=""');
  expect(renderToStaticMarkup(<GithubSetupGuide provider="azureDevops" />)).toBe("");
});

test("saved and initial creation panels both wire GitHub-only guidance", async () => {
  const source = await Bun.file(new URL("./ProjectPanel.tsx", import.meta.url)).text();
  expect(source.match(/<GithubSetupGuide provider=\{vcsProvider\} \/>/g)).toHaveLength(2);
  const initialCreation = source.slice(source.indexOf('if (creating && step === "folder")'), source.indexOf("const advancedFields"));
  expect(initialCreation).toContain("<GithubSetupGuide provider={vcsProvider} />");
  const providerField = source.slice(source.indexOf('<Field label="Fournisseur"'), source.indexOf('<Field label="Compte GitHub"'));
  expect(providerField).toContain("Tester la connexion");
  expect(providerField).toContain("<GithubSetupGuide provider={vcsProvider} />");
  expect(providerField).toContain('vcsProvider === "github" && dirty');
  expect(providerField).toContain("pas le sélecteur non enregistré");
});

test("draft tests preserve their repository/provider-only contract", async () => {
  const source = await Bun.file(new URL("./ProjectPanel.tsx", import.meta.url)).text();
  const draftCalls = source.match(/api\.testDraftConnection\(\{[^}]+\}\)/g);
  expect(draftCalls).toHaveLength(2);
  for (const call of draftCalls ?? []) {
    expect(call).toContain("repoPath:");
    expect(call).toContain("vcsProvider");
    expect(call).not.toContain("githubAccount");
  }
  expect(source).toContain("project !== null && !dirty");
  expect(source).toContain("api.testProjectConnection(project.key)");
});

test("external links reuse the desktop new-window handler (static integration evidence)", async () => {
  const source = await Bun.file(new URL("../../../../../desktop/index.ts", import.meta.url)).text();
  expect(source).toContain('const NEW_WINDOW_OPEN_EVENT = "new-window-open"');
  expect(source).toContain("Electrobun.events.on(NEW_WINDOW_OPEN_EVENT");
  expect(source).toContain("const url = externalUrlFromNewWindowEvent(event)");
  expect(source).toContain("Utils.openExternal(url)");
});

test("guide has named external token and documentation links and qualifies server/account scope", () => {
  const html = renderToStaticMarkup(<GithubSetupGuide provider="github" />);
  for (const href of [
    "https://github.com/settings/personal-access-tokens/new",
    "https://github.com/settings/personal-access-tokens",
    "https://github.com/settings/tokens",
    "https://cli.github.com/manual/gh_auth_login",
    "https://cli.github.com/manual/gh_help_environment",
    "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
  ]) expect(html).toContain(`href="${href}" target="_blank" rel="noopener noreferrer"`);
  expect(html).toContain("Créer un jeton fine-grained sur github.com");
  expect(html).toContain("Gérer les jetons classic sur github.com");
  expect(html).toContain("terminal sur le serveur");
  expect(html).toContain("kanban sur le VPS");
  expect(html).toContain("n’authentifie pas le serveur");
  expect(html).toContain("Enregistrez le projet puis retestez");
  expect(html).toContain("pas depuis le sélecteur non enregistré");
  expect(html).toContain("configuration isolée");
  expect(html).toContain("GH_TOKEN puis GITHUB_TOKEN");
  expect(html).toContain("repo, read:org et gist");
  expect(html).toContain("sans --show-token");
  expect(html).not.toContain("<input");
});

test("clipboard copies only the command and confirms success", async () => {
  const copied: string[] = [];
  let selected = false;
  const status = await copyGithubLoginCommand(async (text) => { copied.push(text); }, () => { selected = true; });
  expect(copied).toEqual(["gh auth login --web"]);
  expect(selected).toBe(false);
  expect(status).toBe("Commande copiée");
});

test("clipboard rejection invokes manual selection and reports fallback", async () => {
  let selected = false;
  const status = await copyGithubLoginCommand(async () => { throw new Error("Clipboard denied"); }, () => { selected = true; });
  expect(selected).toBe(true);
  expect(status).toContain("copiez-la manuellement");
});

test("GitHub success confirms PR reads only; Azure successes and all failures are unchanged", () => {
  const success = { ok: true, message: "Connexion OK", checkedAt: 1 };
  const github = connectionHint(false, success, "github");
  expect(github.message).toContain("Lecture des PR GitHub confirmée");
  expect(github.message).toContain("push, création de PR, publication de review");
  expect(github.message).toContain("non vérifiées");
  expect(connectionHint(false, success, "azureDevops").message).toBe(success.message);
  for (const provider of ["github", "azureDevops"] satisfies ManagedProject["vcsProvider"][]) {
    const failure = { ok: false, message: "Original server failure", checkedAt: 2 };
    expect(connectionHint(false, failure, provider)).toEqual({ message: failure.message, className: "text-destructive" });
    expect(connectionHint(true, failure, provider).message).toBe("Test en cours…");
    expect(connectionHint(false, null, provider).message).toBe("");
  }
});
