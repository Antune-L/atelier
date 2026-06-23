import type {
  AnalyzeTicketsInput,
  AppSettings,
  Capabilities,
  Comment,
  CreateAskInput,
  CreateCleanInput,
  CreateCommentInput,
  CreateProfileInput,
  CreateReviewInput,
  CreateTicketInput,
  ImportTicketsInput,
  OpenPr,
  Profile,
  ProjectInfo,
  StartWorktreeSessionBody,
  StatRecord,
  TerminalDescriptor,
  TerminalOutput,
  Ticket,
  UpdateAppSettingsInput,
  UpdateMode,
  UpdateProfileInput,
  UpdateTicketInput,
  UploadResult,
  WorktreeSession,
} from "@shared/schemas";
import type { Column } from "@shared/constants";

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
  capabilities: (): Promise<Capabilities> => request("/api/capabilities"),
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
  projectPrs: (key: string): Promise<OpenPr[]> => request(`/api/projects/${key}/prs`),
  projectBranches: (key: string): Promise<string[]> => request(`/api/projects/${key}/branches`),
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
  checkMerged: (id: string): Promise<{ merged: boolean; state: string; ticket?: Ticket }> =>
    request(`/api/tickets/${id}/check-merged`, { method: "POST" }),
  appUpdate: (): Promise<{ ok: boolean; mode: UpdateMode }> =>
    request("/api/internal/update", { method: "POST" }),
  quitApp: (): Promise<{ ok: boolean }> => request("/api/internal/quit", { method: "POST" }),
  retry: (id: string): Promise<Ticket> => request(`/api/tickets/${id}/retry`, { method: "POST" }),
  resolveConflicts: (id: string): Promise<Ticket> =>
    request(`/api/tickets/${id}/resolve-conflicts`, { method: "POST" }),
  relaunch: (id: string): Promise<Ticket> => request(`/api/tickets/${id}/relaunch`, { method: "POST" }),
  startTest: (id: string): Promise<Ticket> => request(`/api/tickets/${id}/test`, { method: "POST" }),
  stopTest: (id: string): Promise<Ticket> => request(`/api/tickets/${id}/stop-test`, { method: "POST" }),
  triage: (id: string): Promise<{ started: boolean }> =>
    request(`/api/tickets/${id}/triage`, { method: "POST" }),
  triagePlus: (id: string): Promise<{ started: boolean }> =>
    request(`/api/tickets/${id}/triage-plus`, { method: "POST" }),
  deleteTicket: (id: string): Promise<{ ok: boolean }> =>
    request(`/api/tickets/${id}`, { method: "DELETE" }),
  terminal: (id: string): Promise<TerminalOutput> => request(`/api/tickets/${id}/terminal`),
  listTerminals: (projectKey?: string): Promise<TerminalDescriptor[]> =>
    request(`/api/terminals${projectKey ? `?projectKey=${encodeURIComponent(projectKey)}` : ""}`),
  createTerminal: (projectKey: string): Promise<TerminalDescriptor> =>
    request("/api/terminals", { method: "POST", body: JSON.stringify({ projectKey }) }),
  deleteTerminal: (id: string): Promise<{ ok: boolean }> =>
    request(`/api/terminals/${id}`, { method: "DELETE" }),
  startWorktreeSession: (input: StartWorktreeSessionBody): Promise<{ started: boolean }> =>
    request("/api/worktree-sessions", { method: "POST", body: JSON.stringify(input) }),
  listWorktreeSessions: (): Promise<WorktreeSession[]> => request("/api/worktree-sessions"),
  stopWorktreeSession: (slotId: number): Promise<{ ok: boolean }> =>
    request(`/api/worktree-sessions/${slotId}`, { method: "DELETE" }),
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
