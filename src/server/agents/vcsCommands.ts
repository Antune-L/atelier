/**
 * Per-provider command fragments interpolated into the agent contracts and sub-agent prompts.
 *
 * The prose itself stays single-sourced in `contract.ts`/`sessionConfig.ts`: this table only supplies
 * the shell commands and the provider label those sentences embed, so adding a provider never forks
 * a French paragraph. The GitHub entries reproduce the previous literals verbatim.
 */

import { VCS_PROVIDER_LABELS } from "../../shared/constants.ts";
import type { VcsProvider } from "../../shared/constants.ts";
import {
  AZ_API_VERSION,
  AZ_AREA_GIT,
  AZ_BINARY,
  AZ_COMMENT_TYPE_SYSTEM,
  AZ_RESOLVE_THREAD_BODY,
  AZ_RESOURCE_PR_THREADS,
  AZ_SETTLED_THREAD_STATUSES,
  HTTP_GET,
  HTTP_PATCH,
} from "../system/vcs/azureRest.ts";

export interface PrDiffContext {
  /** PR identifier, null on a legacy card whose URL could not be parsed. */
  prNumber: number | null;
  /** The PR's target branch — the diff base when the provider has no PR-diff command. */
  baseBranch: string;
}

/** Commands the clean flow needs. */
export interface VcsCleanCommands {
  /** CLI the fetch/collapse fragments below drive (`gh`, `az`). */
  cli: string;
  /**
   * Whether the external `minos-pr-feedback` skill covers this provider. It is GitHub-only (it
   * triages through the GitHub GraphQL API), so any other provider runs the inline instructions on
   * BOTH agent providers instead, and the skill is not even listed for its sessions.
   */
  minosSkill: boolean;
  /** Read every feedback thread of the PR (used inline whenever `minosSkill` is false). */
  feedbackFetch: (ctx: { prNumber: number | null; prUrl: string | null }) => string;
  /** Collapse (or resolve) one reviewer comment the session actually addressed. */
  collapseComment: (ctx: { prNumber: number | null }) => string;
}

export interface VcsCommandTable {
  /** Provider name used in prose ("GitHub", "Azure DevOps"). */
  readonly label: string;
  /** Command opening the PR against `baseBranch`. */
  readonly createPr: (opts: { draft: boolean; baseBranch: string }) => string;
  /** Extra line the agent needs to run `createPr` (empty when the command is self-contained). */
  readonly createPrHint: string;
  /** Bare command name the no-PR flows (stealth, direct push) forbid. */
  readonly bannedCreatePr: string;
  /** Command producing the full diff of the PR under review. */
  readonly prDiff: (ctx: PrDiffContext) => string;
  /** How a sub-agent may re-read the review feedback already posted on the PR. */
  readonly prFeedbackRead: string;
  /** Commands the PR-feedback clean flow drives on this provider. */
  readonly clean: VcsCleanCommands;
}

/**
 * Placeholders the Azure `az repos pr create` template carries: unlike `gh`, `az` needs the
 * organisation/project/repository triple spelled out, and the contract is built before any git
 * command has run, so the agent substitutes them from its own `origin` remote.
 */
const AZURE_ORG_PLACEHOLDER = "<URL_ORG>";
const AZURE_PROJECT_PLACEHOLDER = "<PROJET>";
const AZURE_REPO_PLACEHOLDER = "<DEPOT>";
const AZURE_COMMON_FLAGS =
  `--org ${AZURE_ORG_PLACEHOLDER} --project ${AZURE_PROJECT_PLACEHOLDER} --repository ${AZURE_REPO_PLACEHOLDER} --detect false`;

/** One-liner telling the agent where the three Azure placeholders come from. */
const AZURE_REPO_REF_HINT =
  `Remplace ${AZURE_ORG_PLACEHOLDER}, ${AZURE_PROJECT_PLACEHOLDER} et ${AZURE_REPO_PLACEHOLDER} par les valeurs lues dans \`git remote get-url origin\` (de la forme \`https://dev.azure.com/<org>/<projet>/_git/<depot>\`, où ${AZURE_ORG_PLACEHOLDER} vaut \`https://dev.azure.com/<org>\`).`;

/**
 * `az devops invoke` needs the repository GUID, never its name, so the thread commands carry a fourth
 * placeholder resolved by a read on the PR itself.
 */
const AZURE_REPO_ID_PLACEHOLDER = "<ID_DEPOT>";
const AZURE_THREAD_ID_PLACEHOLDER = "<ID_FIL>";

/** Where the org URL, the project and the repository GUID of the thread commands come from. */
function azureThreadRefHint(prNumber: number | null): string {
  return `${AZURE_ORG_PLACEHOLDER} vaut \`https://dev.azure.com/<org>\`, lu dans \`git remote get-url origin\`.`
    + ` Obtiens ${AZURE_REPO_ID_PLACEHOLDER} et ${AZURE_PROJECT_PLACEHOLDER} avec`
    + ` \`${AZ_BINARY} repos pr show --id ${prNumber} --org ${AZURE_ORG_PLACEHOLDER} --detect false --query repository.id -o tsv\``
    + ` et la même commande avec \`--query repository.project.name\`.`;
}

/**
 * `az devops invoke` call on the PR's comment threads. The route parameters MUST stay separate
 * tokens: joined into one string the CLI answers with a misleading "requires user authentication".
 */
function azureThreadsCommand(prNumber: number | null, method: string, opts?: { threadId: true }): string {
  const threadRoute = opts === undefined ? "" : ` threadId=${AZURE_THREAD_ID_PLACEHOLDER}`;
  return `${AZ_BINARY} devops invoke --area ${AZ_AREA_GIT} --resource ${AZ_RESOURCE_PR_THREADS}`
    + ` --route-parameters project=${AZURE_PROJECT_PLACEHOLDER} repositoryId=${AZURE_REPO_ID_PLACEHOLDER} pullRequestId=${prNumber}${threadRoute}`
    + ` --org ${AZURE_ORG_PLACEHOLDER} --api-version ${AZ_API_VERSION} --detect false --http-method ${method} -o json`;
}

const GITHUB_COMMANDS: VcsCommandTable = {
  label: VCS_PROVIDER_LABELS.github,
  createPr: ({ draft, baseBranch }) => `${draft ? "gh pr create --draft" : "gh pr create"} --base ${baseBranch}`,
  createPrHint: "",
  bannedCreatePr: "gh pr create",
  prDiff: ({ prNumber }) => `gh pr diff ${prNumber}`,
  prFeedbackRead:
    "Tu peux aussi lire les commentaires de review postés via `gh pr view <url> --json reviews` et `gh api`.",
  clean: {
    cli: "gh",
    minosSkill: true,
    feedbackFetch: ({ prNumber, prUrl }) =>
      `commentaires inline (\`gh api /repos/{owner}/{repo}/pulls/${prNumber}/comments\`), reviews (\`gh pr view ${prUrl} --json reviews\`) et commentaires de conversation (\`gh api /repos/{owner}/{repo}/issues/${prNumber}/comments\`)`,
    collapseComment: ({ prNumber }) =>
      `Récupère le \`node_id\` de chaque commentaire traité : les commentaires inline via \`gh api /repos/{owner}/{repo}/pulls/${prNumber}/comments\` (champ \`node_id\`), les commentaires de conversation top-level via \`gh api /repos/{owner}/{repo}/issues/${prNumber}/comments\` (champ \`node_id\`). Pour chacun, replie-le avec la mutation GraphQL \`minimizeComment\` (\`classifier: RESOLVED\`, \`subjectId\` = le \`node_id\`), ex. : \`gh api graphql -f query='mutation($id:ID!){minimizeComment(input:{subjectId:$id,classifier:RESOLVED}){minimizedComment{isMinimized}}}' -f id=<node_id>\``,
  },
};

const AZURE_COMMANDS: VcsCommandTable = {
  label: VCS_PROVIDER_LABELS.azureDevops,
  createPr: ({ draft, baseBranch }) =>
    `az repos pr create ${AZURE_COMMON_FLAGS} --source-branch <branche-courante> --target-branch ${baseBranch}`
    + ` --title "<titre>" --description "<description>" --draft ${String(draft)}`,
  createPrHint: `${AZURE_REPO_REF_HINT} Il n'existe pas d'équivalent de \`--fill\` : rédige toi-même le titre (sujet du dernier commit) et la description (liste des commits de \`git log origin/<base>..HEAD\`).`,
  bannedCreatePr: "az repos pr create",
  // Azure has no PR-diff command and no diff endpoint: the review worktree is already on the PR head,
  // so a plain-git diff against the target branch is the provider-neutral equivalent.
  prDiff: ({ baseBranch }) => `git diff origin/${baseBranch}...HEAD`,
  prFeedbackRead:
    "Les fils de retours Azure DevOps ne sont pas lisibles depuis ce sous-agent : appuie-toi uniquement sur les findings transmis dans ton prompt.",
  clean: {
    cli: AZ_BINARY,
    // The minos-pr-feedback skill triages through the GitHub GraphQL API: it cannot see an Azure
    // thread, so an Azure session gets the inline instructions whatever its agent provider.
    minosSkill: false,
    feedbackFetch: ({ prNumber }) =>
      `les fils de commentaires via \`${azureThreadsCommand(prNumber, HTTP_GET)}\`. ${azureThreadRefHint(prNumber)}`
      + ` Ignore les fils système (\`comments[0].commentType\` vaut \`${AZ_COMMENT_TYPE_SYSTEM}\`), les fils supprimés (\`isDeleted\`)`
      + ` et ceux dont le \`status\` vaut déjà ${AZ_SETTLED_THREAD_STATUSES.join("/")}`,
    collapseComment: ({ prNumber }) =>
      `Note l'\`id\` de chaque fil traité, écris \`${AZ_RESOLVE_THREAD_BODY}\` dans un fichier JSON temporaire (\`mktemp\`),`
      + ` puis résous le fil avec \`${azureThreadsCommand(prNumber, HTTP_PATCH, { threadId: true })} --in-file <fichier.json>\``
      + ` (équivalent Azure DevOps du repli d'un commentaire GitHub)`,
  },
};

const COMMANDS_BY_PROVIDER: Record<VcsProvider, VcsCommandTable> = {
  github: GITHUB_COMMANDS,
  azureDevops: AZURE_COMMANDS,
};

export function vcsCommands(provider: VcsProvider): VcsCommandTable {
  return COMMANDS_BY_PROVIDER[provider];
}
