import type { PreviewGithubRepository, PreviewGithubSourceResolution } from "../../shared/preview.ts";

import type { CoolifyClient } from "./coolifyClient.ts";

const MAX_COOLIFY_GITHUB_REPOSITORIES = 10_000;

function githubHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function resolvePreviewGithubSource(client: CoolifyClient, repository: PreviewGithubRepository, overrideUuid: string | null, defaultUuid: string | null, privateKeyUuid: string | null = null): Promise<PreviewGithubSourceResolution> {
  const result: PreviewGithubSourceResolution = { ...repository, status: "no_match", source: null, githubAppUuid: null, privateKeyUuid, candidates: [], message: null };
  if (privateKeyUuid) {
    try {
      const key = (await client.privateKeys()).find((candidate) => candidate.uuid === privateKeyUuid);
      if (!key) return { ...result, source: "deploy_key", message: "La clé de déploiement sélectionnée est introuvable dans Coolify. Sélectionnez une autre clé ou désactivez ce choix pour utiliser les connexions GitHub." };
      return { ...result, status: "resolved", source: "deploy_key", message: "La clé de déploiement est disponible dans Coolify. Son accès au dépôt sera vérifié lors du clonage." };
    } catch {
      return { ...result, status: "incomplete", source: "deploy_key", message: "Impossible de lire les clés de déploiement Coolify. Vérifiez la connexion et les droits du jeton Coolify. La clé sélectionnée ne sera pas remplacée automatiquement." };
    }
  }
  if (!overrideUuid && repository.visibility === "public") return { ...result, status: "resolved", source: "public" };
  let apps;
  try {
    apps = await client.githubApps();
  } catch {
    return { ...result, status: "incomplete", message: "Impossible de lire les connexions GitHub de Coolify. Vérifiez la connexion et les droits du jeton Coolify." };
  }
  let incomplete = false;
  const selectedApps = overrideUuid ? apps.filter((app) => app.uuid === overrideUuid) : apps;
  for (const app of selectedApps) {
    if (app.is_public || !app.installation_id || Number(app.installation_id) === 0) continue;
    const host = githubHost(app.html_url);
    if (!host) { incomplete = true; continue; }
    if (host !== repository.host.toLowerCase()) continue;
    try {
      const repositories = await client.githubRepositories(app.id);
      const matches = repositories.some((candidate) => githubHost(candidate.html_url) === repository.host.toLowerCase() && new URL(candidate.html_url).pathname.replace(/\/$/, "").toLowerCase() === `/${repository.repository}`.toLowerCase() && candidate.full_name.toLowerCase() === repository.repository.toLowerCase());
      if (matches) result.candidates.push({ uuid: app.uuid, name: app.name ?? app.uuid });
      if (repositories.length >= MAX_COOLIFY_GITHUB_REPOSITORIES && (!overrideUuid || !matches)) incomplete = true;
    } catch {
      incomplete = true;
    }
  }
  if (incomplete) return { ...result, status: "incomplete", message: "La vérification des dépôts Coolify est incomplète. Vérifiez les droits des connexions GitHub ou sélectionnez une connexion précise pour ce projet." };
  const preferred = overrideUuid ?? defaultUuid;
  const candidate = result.candidates.find((app) => app.uuid === preferred) ?? (result.candidates.length === 1 ? result.candidates[0] : undefined);
  if (candidate) return { ...result, status: "resolved", source: "github_app", githubAppUuid: candidate.uuid };
  if (result.candidates.length > 1) return { ...result, status: "choice_required", message: "Plusieurs connexions Coolify ont accès à ce dépôt. Sélectionnez celle à utiliser pour ce projet." };
  const message = overrideUuid ? "La connexion GitHub sélectionnée n’a pas accès à ce dépôt dans Coolify. Choisissez une autre connexion ou le mode automatique." : "Aucune connexion GitHub Coolify installée n’a accès à ce dépôt privé. Ajoutez le dépôt à une connexion Coolify puis vérifiez à nouveau.";
  return { ...result, message };
}
