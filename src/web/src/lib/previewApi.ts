import type { CoolifyInventory, PreviewGithubSourceResolution, PreviewProjectSettings, PreviewReadiness, PreviewRecord, PreviewSettings, UpdatePreviewProjectSettingsInput, UpdatePreviewSettingsInput } from "@shared/preview";
import type { Ticket } from "@shared/schemas";

import { request } from "@/lib/api";

export const previewApi = {
  settings: () => request<{ settings: PreviewSettings }>("/api/settings/previews"),
  updateSettings: (input: UpdatePreviewSettingsInput) => request<{ settings: PreviewSettings }>("/api/settings/previews", { method: "PATCH", body: JSON.stringify(input) }),
  testConnection: () => request<{ ok: boolean; inventory: CoolifyInventory }>("/api/settings/previews/test", { method: "POST" }),
  projectSettings: (project: string) => request<{ settings: PreviewProjectSettings }>(`/api/projects/${encodeURIComponent(project)}/preview`),
  projectSource: (project: string) => request<{ resolution: PreviewGithubSourceResolution }>(`/api/projects/${encodeURIComponent(project)}/preview/source`),
  updateProjectSettings: (project: string, input: UpdatePreviewProjectSettingsInput) => request<{ settings: PreviewProjectSettings }>(`/api/projects/${encodeURIComponent(project)}/preview`, { method: "PATCH", body: JSON.stringify(input) }),
  projectReadiness: (project: string, branch?: string) => request<{ readiness: PreviewReadiness }>(`/api/projects/${encodeURIComponent(project)}/preview/readiness${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`),
  prepareProject: (project: string, branch?: string, retry = false) => request<{ created: boolean; ticket: Ticket | null; readiness: PreviewReadiness }>(`/api/projects/${encodeURIComponent(project)}/preview/prepare`, { method: "POST", body: JSON.stringify({ branch, retry }) }),
  list: () => request<{ previews: PreviewRecord[] }>("/api/previews"),
  createBranchPreview: (project: string, branch: string) => request<{ preview: PreviewRecord }>(`/api/projects/${encodeURIComponent(project)}/previews`, { method: "POST", body: JSON.stringify({ branch }) }),
  redeployPreview: (previewId: string) => request<{ preview: PreviewRecord }>(`/api/previews/${encodeURIComponent(previewId)}/redeploy`, { method: "POST" }),
  ticketPreview: (ticketId: string) => request<{ preview: PreviewRecord | null; projectSettings: PreviewProjectSettings; vcsProvider: "github" | "azureDevops"; cleanupWatchCount: number }>(`/api/tickets/${encodeURIComponent(ticketId)}/preview`),
  createPreview: (ticketId: string) => request<{ preview: PreviewRecord }>(`/api/tickets/${encodeURIComponent(ticketId)}/preview`, { method: "POST" }),
  stopPreview: (previewId: string) => request<{ preview: PreviewRecord }>(`/api/previews/${encodeURIComponent(previewId)}`, { method: "DELETE" }),
  retryCleanup: (previewId: string) => request<{ preview: PreviewRecord }>(`/api/previews/${encodeURIComponent(previewId)}/cleanup`, { method: "POST" }),
  validatePreview: (previewId: string, provider: "claude" | "codex") => request<{ run: { id: string } }>(`/api/previews/${encodeURIComponent(previewId)}/validate`, { method: "POST", body: JSON.stringify({ provider }) }),
};
