import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ProviderQuota } from "../../shared/providerQuota.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { FIXTURE_PROJECT_KEY } from "../testing/fixtures.ts";

import type { CampaignSkillRoots } from "./campaignSkills.ts";
import { CampaignService } from "./campaignService.ts";
import type { CampaignReadinessDeps } from "./readiness.ts";
import { FakeCampaignRepositoryProbe } from "./repositoryProbe.ts";
import type { CampaignRepositoryInspection } from "./repositoryProbe.ts";

export function okQuota(provider: "claude" | "codex", now = Date.now()): ProviderQuota {
  return { provider, state: "ok", source: "live", observedAt: now, planType: "max", message: null, windows: [{ id: `${provider}:five_hour`, kind: "session", model: null, usedPercent: 10, windowDurationMins: 300, resetsAt: now + 3_600_000 }] };
}

export function makeSkillRoots(): CampaignSkillRoots {
  const root = mkdtempSync(join(tmpdir(), "kanban-campaign-skills-"));
  const claude = join(root, "claude");
  const agents = join(root, "agents");
  return { install: [claude, agents], search: [claude, agents] };
}

export function writeSkill(root: string, name: string, manifest: string): void {
  mkdirSync(join(root, name), { recursive: true });
  writeFileSync(join(root, name, "SKILL.md"), manifest);
}

export interface HarnessOptions {
  inspection?: Partial<CampaignRepositoryInspection>;
  pilot?: boolean;
  quota?: ProviderQuota | null;
  occupiedPreviews?: number;
}

export function makeCampaignHarness(options: HarnessOptions = {}) {
  const store = new Store(createDatabase(":memory:"));
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const skillRoots = makeSkillRoots();
  const readiness: CampaignReadinessDeps = {
    project: (key) => (key === FIXTURE_PROJECT_KEY ? { repoPath: "/tmp/repo", baseBranch: "main", vcsProvider: "github" } : null),
    pilotEnabled: () => options.pilot ?? true,
    previewReadiness: (_project, branch) => Promise.resolve({ status: "ready", branch, revision: "a".repeat(40), diagnostics: [], preparationTicketId: null, preparationRetryAvailable: false }),
    occupiedPreviewSlots: () => options.occupiedPreviews ?? 0,
    maxActivePreviews: 3,
    quota: (provider) => Promise.resolve(options.quota === undefined ? okQuota(provider) : options.quota),
    probe: new FakeCampaignRepositoryProbe({ inspection: options.inspection }),
    skillRoots,
    host: "vps",
    now: () => Date.now(),
  };
  const changes: string[] = [];
  const service = new CampaignService({
    store: store.campaigns,
    readiness,
    skillRoots,
    projectExists: (key) => key === FIXTURE_PROJECT_KEY,
    projectBaseBranch: () => "main",
    fetchSkillzer: (name) => Promise.resolve(name === "argus-review" ? [{ path: "SKILL.md", contentBase64: Buffer.from("# argus from skillzer").toString("base64") }] : null),
    onChange: (id) => changes.push(id),
  });
  return { store, service, skillRoots, changes };
}
