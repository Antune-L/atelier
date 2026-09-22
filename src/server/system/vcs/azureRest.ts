/**
 * The Azure DevOps REST vocabulary shared by the backend client (`azureDevops.ts`) and the agent
 * command table (`../../agents/vcsCommands.ts`), so a resource name or the API version is spelled
 * once. `az devops invoke` is the transport on both sides: the azure-devops extension holds its own
 * token cache, and `az account show` fails on a machine where `az repos` works, so no bearer token
 * exists for an SDK client.
 */

export const AZ_BINARY = "az";
export const AZ_API_VERSION = "7.1";
export const AZ_AREA_GIT = "git";
export const AZ_RESOURCE_PR_THREADS = "pullRequestThreads";
export const AZ_RESOURCE_PR_ITERATIONS = "pullRequestIterations";
export const AZ_RESOURCE_PR_ITERATION_CHANGES = "pullRequestIterationChanges";

export const HTTP_GET = "GET";
export const HTTP_POST = "POST";
export const HTTP_PATCH = "PATCH";

/** Thread statuses meaning the feedback is already settled: the clean flow skips those fils. */
export const AZ_SETTLED_THREAD_STATUSES = ["fixed", "closed", "wontFix", "byDesign"] as const;
/** `comments[0].commentType` of a thread Azure itself created (a push, a vote…): never a review. */
export const AZ_COMMENT_TYPE_SYSTEM = "system";
/** Body resolving a thread, the Azure equivalent of GitHub's `minimizeComment`. */
export const AZ_RESOLVE_THREAD_BODY = '{"status":"fixed"}';
