import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { VcsProvider } from "@shared/constants";

import { Button } from "@/components/ui/button";

export const GITHUB_LOGIN_COMMAND = "gh auth login --web";

/** Copy only the login command; a blocked clipboard leaves a selectable manual fallback. */
export async function copyGithubLoginCommand(writeText: (text: string) => Promise<void>, select: () => void): Promise<string> {
  try {
    await writeText(GITHUB_LOGIN_COMMAND);
    return "Commande copiée";
  } catch {
    select();
    return "Copie impossible : commande sélectionnée, copiez-la manuellement.";
  }
}

function GuideLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{children}</a>;
}

/** Manual GitHub setup help, shared by saved projects and project creation. */
export function GithubSetupGuide({ provider }: { provider: VcsProvider }) {
  const commandRef = useRef<HTMLElement>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const copy = async (): Promise<void> => {
    setCopyStatus(await copyGithubLoginCommand(
      (text) => navigator.clipboard.writeText(text),
      () => {
        const selection = window.getSelection();
        if (commandRef.current === null || selection === null) return;
        const range = document.createRange();
        range.selectNodeContents(commandRef.current);
        selection.removeAllRanges();
        selection.addRange(range);
      },
    ));
  };

  if (provider !== "github") return null;

  return (
    <details className="w-full rounded-md border p-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-medium text-foreground">Configurer l’authentification GitHub</summary>
      <div className="mt-3 space-y-3">
        <p>En local, ouvrez un terminal sur la machine qui exécute Kanban, sous le même utilisateur système, puis lancez :</p>
        <div className="flex flex-wrap items-center gap-2">
          <code ref={commandRef} className="select-all rounded bg-muted px-2 py-1">{GITHUB_LOGIN_COMMAND}</code>
          <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>Copier la commande</Button>
        </div>
        <p role="status">{copyStatus}</p>
        <p>Dans le navigateur, utilisez l’identité GitHub prévue pour ce projet. Choisissez l’hôte de votre dépôt dans gh.</p>
        <p>Sur un serveur distant, ouvrez un terminal sur le serveur sous l’utilisateur système qui exécute Kanban (kanban sur le VPS). Ouvrir les liens de jetons ou le navigateur sur votre poste client n’authentifie pas le serveur : terminez la procédure gh initiée sur le serveur.</p>
        <p>Autre possibilité : créer un token GitHub, puis configurer gh manuellement hors de Kanban. Aucun jeton GitHub n’est demandé dans ce guide.</p>
        <ul className="list-disc space-y-1 pl-4">
          <li><GuideLink href="https://github.com/settings/personal-access-tokens/new">Créer un jeton fine-grained sur github.com</GuideLink></li>
          <li><GuideLink href="https://github.com/settings/personal-access-tokens">Gérer les jetons fine-grained sur github.com</GuideLink></li>
          <li><GuideLink href="https://github.com/settings/tokens">Gérer les jetons classic sur github.com</GuideLink></li>
        </ul>
        <p>Ces liens ouvrent github.com, pas un hôte détecté. Pour GitHub Enterprise, choisissez votre propre hôte de dépôt et ses instructions officielles ; les formulaires de jetons ne sont pas universels.</p>
        <p>Pour un jeton classic, gh auth login --with-token lit le jeton sur l’entrée standard ; gh documente les scopes minimum repo, read:org et gist. Pour un jeton fine-grained, gh recommande GH_TOKEN dans l’environnement du serveur. Les permissions dépendent des opérations et du dépôt ; des limites existent pour les collaborateurs externes, plusieurs organisations et l’API Checks, et une approbation de l’organisation peut être nécessaire.</p>
        <p>Pour le compte par défaut de la machine sur github.com, GH_TOKEN puis GITHUB_TOKEN prennent priorité sur les identifiants enregistrés. Vérifiez uniquement la présence de ces variables, jamais leurs valeurs. Vérifiez gh avec <code>gh auth status</code>, sans --show-token, dans le même contexte serveur.</p>
        <p>Les comptes gérés déjà enregistrés dans Kanban utilisent leur configuration isolée et retirent ces variables ambiantes. Ce guide concerne le compte par défaut ; il ne remplace pas les réglages des comptes gérés.</p>
        <p>Un test de brouillon (création ou projet modifié) résout le compte depuis le dépôt et la configuration du serveur, pas depuis le sélecteur non enregistré. Enregistrez le projet puis retestez pour vérifier le compte enregistré.</p>
        <p>Le test confirme la lecture des PR. Les écritures (push, création de PR, publication de review) restent non vérifiées.</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          <GuideLink href="https://cli.github.com/manual/gh_auth_login">Documentation officielle gh : authentification</GuideLink>
          <GuideLink href="https://cli.github.com/manual/gh_help_environment">Documentation officielle gh : environnement</GuideLink>
          <GuideLink href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens">Documentation GitHub : limites des jetons</GuideLink>
        </p>
      </div>
    </details>
  );
}
