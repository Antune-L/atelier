import { join } from "node:path";

import { EXECUTING_CAMPAIGN_STATUSES } from "../../shared/campaign.ts";
import type { PreviewReadiness } from "../../shared/preview.ts";
import type { ProviderQuota, QuotaProvider } from "../../shared/providerQuota.ts";
import { getProject, isProjectKey } from "../config.ts";
import type { Store } from "../db/store.ts";
import { isCloudHost } from "../hostRole.ts";
import { autonomousPilotEnabled } from "../ticketOperations.ts";

import { defaultCampaignSkillRoots } from "./campaignSkills.ts";
import type { CampaignSkillRoots } from "./campaignSkills.ts";
import { CampaignService } from "./campaignService.ts";
import { DEFAULT_MAX_ACTIVE_PREVIEWS } from "./readiness.ts";
import { FakeCampaignRepositoryProbe, GithubCampaignRepositoryProbe } from "./repositoryProbe.ts";

const MAX_PREVIEWS_ENV = "KANBAN_PREVIEW_MAX_ACTIVE";

function maxActivePreviews(): number {
  const parsed = Number.parseInt(process.env[MAX_PREVIEWS_ENV] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ACTIVE_PREVIEWS;
}

/** Dry-run campaigns read and write skills under the data root so tests never touch the user's skill folders. */
export function campaignSkillRoots(dryRun: boolean, dataRoot: string): CampaignSkillRoots {
  if (!dryRun) return defaultCampaignSkillRoots();
  const claude = join(dataRoot, "campaign-skills", "claude");
  const agents = join(dataRoot, "campaign-skills", "agents");
  return { install: [claude, agents], search: [claude, agents] };
}

export interface CampaignWiringDeps {
  store: Store;
  dryRun: boolean;
  dataRoot: string;
  previewReadiness(project: string, branch: string): Promise<PreviewReadiness>;
  quota(provider: QuotaProvider): Promise<ProviderQuota | null>;
  onChange?(campaignId: string): void;
}

export function buildCampaignService(deps: CampaignWiringDeps): CampaignService {
  const { store } = deps;
  const skillRoots = campaignSkillRoots(deps.dryRun, deps.dataRoot);
  return new CampaignService({
    store: store.campaigns,
    skillRoots,
    projectExists: (key) => isProjectKey(key),
    projectBaseBranch: (key) => getProject(key).baseBranch,
    onChange: deps.onChange,
    readiness: {
      project: (key) => (isProjectKey(key) ? getProject(key) : null),
      pilotEnabled: (vcsProvider) => autonomousPilotEnabled(vcsProvider),
      previewReadiness: deps.previewReadiness,
      occupiedPreviewSlots: (excluding) => {
        const active = store.listPreviews().filter((preview) => preview.cleanupStatus !== "complete").length;
        const reserved = store.campaigns.listExecuting().filter((campaign) => campaign.id !== excluding && EXECUTING_CAMPAIGN_STATUSES.includes(campaign.status) && campaign.runtime.finalization?.previewId == null).length
          + store.campaigns.listQueued().filter((campaign) => campaign.id !== excluding).length;
        return active + reserved;
      },
      maxActivePreviews: maxActivePreviews(),
      quota: deps.quota,
      probe: deps.dryRun ? new FakeCampaignRepositoryProbe() : new GithubCampaignRepositoryProbe(),
      skillRoots,
      host: isCloudHost() ? "vps" : "mac",
      now: () => Date.now(),
    },
  });
}
