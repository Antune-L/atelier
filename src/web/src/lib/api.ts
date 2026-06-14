import type {
  AppSettings,
  Capabilities,
  Comment,
  CreateCommentInput,
  CreateProfileInput,
  CreateReviewInput,
  CreateTicketInput,
  OpenPr,
  Profile,
  ProjectInfo,
  TerminalOutput,
  Ticket,
  UpdateAppSettingsInput,
  UpdateMode,
  UpdateProfileInput,
  UpdateTicketInput,
  UploadResult,
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
  ticketDetail: (id: string): Promise<{ ticket: Ticket; comments: Comment[] }> =>
    request(`/api/tickets/${id}`),
  createTicket: (input: CreateTicketInput): Promise<Ticket> =>
    request("/api/tickets", { method: "POST", body: JSON.stringify(input) }),
  projectPrs: (key: string): Promise<OpenPr[]> => request(`/api/projects/${key}/prs`),
  projectBranches: (key: string): Promise<string[]> => request(`/api/projects/${key}/branches`),
  createReviews: (input: CreateReviewInput): Promise<Ticket[]> =>
    request("/api/reviews", { method: "POST", body: JSON.stringify(input) }),
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
  appUpdate: (): Promise<{ ok: boolean; mode: UpdateMode }> =>
    request("/api/internal/update", { method: "POST" }),
  retry: (id: string): Promise<Ticket> => request(`/api/tickets/${id}/retry`, { method: "POST" }),
  resolveConflicts: (id: string): Promise<Ticket> =>
    request(`/api/tickets/${id}/resolve-conflicts`, { method: "POST" }),
  relaunch: (id: string): Promise<Ticket> => request(`/api/tickets/${id}/relaunch`, { method: "POST" }),
  triage: (id: string): Promise<{ started: boolean }> =>
    request(`/api/tickets/${id}/triage`, { method: "POST" }),
  deleteTicket: (id: string): Promise<{ ok: boolean }> =>
    request(`/api/tickets/${id}`, { method: "DELETE" }),
  terminal: (id: string): Promise<TerminalOutput> => request(`/api/tickets/${id}/terminal`),
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
