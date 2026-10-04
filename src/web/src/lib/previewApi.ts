import type { CoolifyInventory, PreviewProjectSettings, PreviewRecord, PreviewSettings, UpdatePreviewProjectSettingsInput, UpdatePreviewSettingsInput } from "@shared/preview";
import type { Ticket } from "@shared/schemas";

import { request } from "@/lib/api";

export const previewApi = {
  settings: () => request<{ settings: PreviewSettings }>("/api/settings/previews"),
  updateSettings: (input: UpdatePreviewSettingsInput) => request<{ settings: PreviewSettings }>("/api/settings/previews", { method: "PATCH", body: JSON.stringify(input) }),
  testConnection: () => request<{ ok: boolean; inventory: CoolifyInventory }>("/api/settings/previews/test", { method: "POST" }),
  projectSettings: (project: string) => request<{ settings: PreviewProjectSettings }>(`/api/projects/${encodeURIComponent(project)}/preview`),
  updateProjectSettings: (project: string, input: UpdatePreviewProjectSettingsInput) => request<{ settings: PreviewProjectSettings }>(`/api/projects/${encodeURIComponent(project)}/preview`, { method: "PATCH", body: JSON.stringify(input) }),
  prepareProject: (project: string) => request<{ created: boolean; ticket: Ticket }>(`/api/projects/${encodeURIComponent(project)}/preview/prepare`, { method: "POST" }),
  ticketPreview: (ticketId: string) => request<{ preview: PreviewRecord | null; projectSettings: PreviewProjectSettings; vcsProvider: "github" | "azureDevops" }>(`/api/tickets/${encodeURIComponent(ticketId)}/preview`),
  createPreview: (ticketId: string) => request<{ preview: PreviewRecord }>(`/api/tickets/${encodeURIComponent(ticketId)}/preview`, { method: "POST" }),
  stopPreview: (previewId: string) => request<{ preview: PreviewRecord }>(`/api/previews/${encodeURIComponent(previewId)}`, { method: "DELETE" }),
  retryCleanup: (previewId: string) => request<{ preview: PreviewRecord }>(`/api/previews/${encodeURIComponent(previewId)}/cleanup`, { method: "POST" }),
  validatePreview: (previewId: string, provider: "claude" | "codex") => request<{ run: { id: string } }>(`/api/previews/${encodeURIComponent(previewId)}/validate`, { method: "POST", body: JSON.stringify({ provider }) }),
};
