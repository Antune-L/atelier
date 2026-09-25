import type { z } from "zod";

import type {
  AnalyzeTicketsInput,
  AppSettings,
  Automation,
  Capabilities,
  Comment,
  CreateAskInput,
  CreateAutomationInput,
  CreateCleanInput,
  CreateCommentInput,
  CreateProfileInput,
  CreateProjectInput,
  CreateReviewInput,
  CreateTicketInput,
  Conversation,
  ConversationMessage,
  ImportNotionInput,
  ImportTicketsInput,
  InspectProjectInput,
  ManagedProject,
  OpenPr,
  PrdDocumentRecord,
  Profile,
  ProjectInfo,
  RepoInspection,
  StartWorktreeSessionBody,
  StatRecord,
  TerminalOutput,
  TestConnectionDraftInput,
  Ticket,
  UpdateAppSettingsInput,
  UpdateAutomationInput,
  UpdateConversationInput,
  UpdateMode,
  UpdatePrdDocumentInput,
  UpdateProfileInput,
  UpdateProjectInput,
  UpdateTicketInput,
  UploadResult,
  VcsConnectionResult,
  WorktreeSession,
} from "@shared/schemas";
import type { createConversationSchema, createTicketsFromPrdSchema } from "@shared/schemas";
import type { Column, PrState } from "@shared/constants";

const HTTP_CONFLICT = 409;
const HTTP_NOT_FOUND = 404;
const PROJECT_IN_USE_MESSAGE = "Ce projet a des tickets associés";
const ATELIER_BASE = "/api/atelier";

export type CreateConversationBody = z.input<typeof createConversationSchema>;
export type CreateTicketsFromPrdBody = z.input<typeof createTicketsFromPrdSchema>;

export interface ConversationDetail {
  conversation: Conversation;
  messages: ConversationMessage[];
  prds: PrdDocumentRecord[];
}

function atelierConversationPath(id: string): string {
  return `${ATELIER_BASE}/conversations/${encodeURIComponent(id)}`;
}

function atelierPrdPath(id: string): string {
  return `${ATELIER_BASE}/prd/${encodeURIComponent(id)}`;
}

export function atelierPrdExportUrl(id: string, format: "json" | "html"): string {
  return `${atelierPrdPath(id)}/export.${format}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : response.statusText;
    throw new Error(message);
  }
  return response.json();
}

export const api = {
  projects: (): Promise<ProjectInfo[]> => request("/api/projects"),
  manageProjects: (): Promise<ManagedProject[]> => request("/api/projects/manage"),
  reorderProjects: (keys: string[]): Promise<{ ok: boolean }> =>
    request("/api/projects/order", { method: "PUT", body: JSON.stringify({ keys }) }),
  updateProjectGroupColor: (group: string, color: string): Promise<{ group: string; color: string }> =>
    request("/api/project-groups/color", { method: "PUT", body: JSON.stringify({ group, color }) }),
  createProject: (input: CreateProjectInput): Promise<ManagedProject> =>
    request("/api/projects", { method: "POST", body: JSON.stringify(input) }),
  inspectProject: (input: InspectProjectInput): Promise<RepoInspection> =>
    request("/api/projects/inspect", { method: "POST", body: JSON.stringify(input) }),
  testDraftConnection: (input: TestConnectionDraftInput): Promise<VcsConnectionResult> =>
    request("/api/projects/test-connection", { method: "POST", body: JSON.stringify(input) }),
  updateProject: (key: string, patch: UpdateProjectInput): Promise<ManagedProject> =>
    request(`/api/projects/${encodeURIComponent(key)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteProject: async (key: string): Promise<void> => {
    const response = await fetch(`/api/projects/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
    });
    if (response.status === HTTP_CONFLICT) throw new Error(PROJECT_IN_USE_MESSAGE);
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: response.statusText }));
      const message = body && typeof body === "object" && "error" in body ? String(body.error) : response.statusText;
      throw new Error(message);
    }
  },
  pickFolder: async (): Promise<string | null> => {
    const response = await fetch("/api/native/pick-folder", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    if (response.status === HTTP_NOT_FOUND) return null;
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: response.statusText }));
      const message = body && typeof body === "object" && "error" in body ? String(body.error) : response.statusText;
      throw new Error(message);
    }
    const body: unknown = await response.json().catch(() => null);
    if (body && typeof body === "object" && "path" in body && typeof body.path === "string") return body.path;
    return null;
  },
  capabilities: (refresh = false): Promise<Capabilities> => request(`/api/capabilities${refresh ? "?refresh=1" : ""}`),
  settings: (): Promise<AppSettings> => request("/api/settings"),
  updateSettings: (input: UpdateAppSettingsInput): Promise<AppSettings> =>
    request("/api/settings", { method: "PATCH", body: JSON.stringify(input) }),
  profiles: (): Promise<Profile[]> => request("/api/profiles"),
  createProfile: (input: CreateProfileInput): Promise<Profile> =>
    request("/api/profiles", { method: "POST", body: JSON.stringify(input) }),
  updateProfile: (id: string, input: UpdateProfileInput): Promise<Profile> =>
    request(`/api/profiles/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteProfile: (id: string): Promise<{ ok: boolean }> =>
    request(`/api/profiles/${id}`, { method: "DELETE" }),
  automations: (): Promise<Automation[]> => request("/api/automations"),
  createAutomation: (input: CreateAutomationInput): Promise<Automation> =>
    request("/api/automations", { method: "POST", body: JSON.stringify(input) }),
  updateAutomation: (id: string, patch: UpdateAutomationInput): Promise<Automation> =>
    request(`/api/automations/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteAutomation: (id: string): Promise<{ ok: boolean }> =>
    request(`/api/automations/${id}`, { method: "DELETE" }),
  runAutomation: (id: string): Promise<{ started: boolean }> =>
    request(`/api/automations/${id}/run`, { method: "POST" }),
  tickets: (): Promise<Ticket[]> => request("/api/tickets"),
  stats: (): Promise<StatRecord[]> => request("/api/stats"),
  ticketDetail: (id: string): Promise<{ ticket: Ticket; comments: Comment[] }> =>
    request(`/api/tickets/${id}`),
  createTicket: (input: CreateTicketInput): Promise<Ticket> =>
    request("/api/tickets", { method: "POST", body: JSON.stringify(input) }),
  importTickets: (input: ImportTicketsInput): Promise<{ created: Ticket[]; feasibilityStarted: boolean }> =>
    request("/api/tickets/import", { method: "POST", body: JSON.stringify(input) }),
  analyzeTickets: (input: AnalyzeTicketsInput): Promise<{ started: number }> =>
    request("/api/tickets/analyze", { method: "POST", body: JSON.stringify(input) }),
  projectPrs: (key: string, refresh = false): Promise<OpenPr[]> =>
    request(`/api/projects/${key}/prs${refresh ? "?refresh=1" : ""}`),
  projectReviewCounts: (refresh = false): Promise<{ counts: Record<string, number | null>; checkedAt: number }> =>
    request(`/api/projects/review-counts${refresh ? "?refresh=1" : ""}`),
  projectBranches: (key: string): Promise<string[]> => request(`/api/projects/${key}/branches`),
  testProjectConnection: (key: string): Promise<VcsConnectionResult> =>
    request(`/api/projects/${key}/test-connection`),
  createReviews: (input: CreateReviewInput): Promise<Ticket[]> =>
    request("/api/reviews", { method: "POST", body: JSON.stringify(input) }),
  createCleaners: (input: CreateCleanInput): Promise<Ticket[]> =>
    request("/api/cleaners", { method: "POST", body: JSON.stringify(input) }),
  createAsk: (input: CreateAskInput): Promise<Ticket> =>
    request("/api/asks", { method: "POST", body: JSON.stringify(input) }),
  updateTicket: (id: string, input: UpdateTicketInput): Promise<Ticket> =>
    request(`/api/tickets/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  moveTicket: (id: string, column: Column, confirmed = false): Promise<Ticket> =>
    request(`/api/tickets/${id}/move`, { method: "POST", body: JSON.stringify({ column, confirmed }) }),
  addComment: (id: string, input: CreateCommentInput): Promise<Comment> =>
    request(`/api/tickets/${id}/comments`, { method: "POST", body: JSON.stringify(input) }),
  validatePrd: (id: string, note = ""): Promise<Ticket> =>
    request(`/api/tickets/${id}/validate-prd`, { method: "POST", body: JSON.stringify({ note }) }),
  markMerged: (id: string): Promise<Ticket> =>
    request(`/api/tickets/${id}/merged`, { method: "POST" }),
  checkMerged: (id: string): Promise<{ merged: boolean; state: PrState; ticket?: Ticket }> =>
    request(`/api/tickets/${id}/check-merged`, { method: "POST" }),
  appUpdate: (): Promise<{ ok: boolean; mode: UpdateMode }> =>
    request("/api/internal/update", { method: "POST" }),
  retry: (id: string): Promise<Ticket> => request(`/api/tickets/${id}/retry`, { method: "POST" }),
  resolveConflicts: (id: string): Promise<Ticket> =>
    request(`/api/tickets/${id}/resolve-conflicts`, { method: "POST" }),
  relaunch: (id: string): Promise<Ticket> => request(`/api/tickets/${id}/relaunch`, { method: "POST" }),
  startTest: (id: string): Promise<Ticket> => request(`/api/tickets/${id}/test`, { method: "POST" }),
  stopTest: (id: string): Promise<Ticket> => request(`/api/tickets/${id}/stop-test`, { method: "POST" }),
  createStealthPr: (id: string): Promise<Ticket> => request(`/api/tickets/${id}/create-pr`, { method: "POST" }),
  triage: (id: string): Promise<{ started: boolean }> =>
    request(`/api/tickets/${id}/triage`, { method: "POST" }),
  triagePlus: (id: string): Promise<{ started: boolean }> =>
    request(`/api/tickets/${id}/triage-plus`, { method: "POST" }),
  split: (id: string): Promise<{ created: Ticket[]; mother: Ticket }> =>
    request(`/api/tickets/${id}/split`, { method: "POST" }),
  reformulate: (id: string): Promise<{ started: boolean }> =>
    request(`/api/tickets/${id}/reformulate`, { method: "POST" }),
  importNotion: (input: ImportNotionInput): Promise<{ markdown: string }> =>
    request(`/api/notion/import`, { method: "POST", body: JSON.stringify(input) }),
  deleteTicket: (id: string): Promise<{ ok: boolean }> =>
    request(`/api/tickets/${id}`, { method: "DELETE" }),
  terminal: (id: string, cursor?: string, incremental = false, signal?: AbortSignal): Promise<TerminalOutput> => {
    const query = new URLSearchParams();
    if (incremental) query.set("incremental", "1");
    if (cursor) query.set("cursor", cursor);
    return request(`/api/tickets/${id}/terminal?${query}`, { signal });
  },
  startWorktreeSession: (input: StartWorktreeSessionBody): Promise<{ started: boolean }> =>
    request("/api/worktree-sessions", { method: "POST", body: JSON.stringify(input) }),
  listWorktreeSessions: (): Promise<WorktreeSession[]> => request("/api/worktree-sessions"),
  stopWorktreeSession: (slotId: number): Promise<{ ok: boolean }> =>
    request(`/api/worktree-sessions/${slotId}`, { method: "DELETE" }),
  relaunchWorktreeSession: (slotId: number): Promise<{ ok: boolean }> =>
    request(`/api/worktree-sessions/${slotId}/relaunch`, { method: "POST" }),
  atelierConversations: (project?: string): Promise<Conversation[]> =>
    request(`${ATELIER_BASE}/conversations${project ? `?project=${encodeURIComponent(project)}` : ""}`),
  atelierCreateConversation: (input: CreateConversationBody): Promise<Conversation> =>
    request(`${ATELIER_BASE}/conversations`, { method: "POST", body: JSON.stringify(input) }),
  atelierConversation: (id: string): Promise<ConversationDetail> => request(atelierConversationPath(id)),
  atelierUpdateConversation: (id: string, patch: UpdateConversationInput): Promise<Conversation> =>
    request(atelierConversationPath(id), { method: "PATCH", body: JSON.stringify(patch) }),
  atelierDeleteConversation: (id: string): Promise<{ ok: boolean }> =>
    request(atelierConversationPath(id), { method: "DELETE" }),
  atelierPostMessage: (id: string, content: string): Promise<{ message: ConversationMessage }> =>
    request(`${atelierConversationPath(id)}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
  atelierInterrupt: (id: string): Promise<{ ok: boolean }> =>
    request(`${atelierConversationPath(id)}/interrupt`, { method: "POST" }),
  atelierConsolidate: (id: string, feedback?: string): Promise<{ ok: boolean }> =>
    request(`${atelierConversationPath(id)}/consolidate`, { method: "POST", body: JSON.stringify({ feedback }) }),
  atelierUpdatePrd: (id: string, patch: UpdatePrdDocumentInput): Promise<PrdDocumentRecord> =>
    request(atelierPrdPath(id), { method: "PATCH", body: JSON.stringify(patch) }),
  atelierRegeneratePrd: (id: string): Promise<{ ok: boolean }> =>
    request(`${atelierPrdPath(id)}/regenerate`, { method: "POST" }),
  atelierCreateTickets: (id: string, input: CreateTicketsFromPrdBody): Promise<{ tickets: Ticket[] }> =>
    request(`${atelierPrdPath(id)}/tickets`, { method: "POST", body: JSON.stringify(input) }),
  uploadFile: async (file: File): Promise<UploadResult> => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: response.statusText }));
      const message = body && typeof body === "object" && "error" in body ? String(body.error) : response.statusText;
      throw new Error(message);
    }
    return response.json();
  },
};
