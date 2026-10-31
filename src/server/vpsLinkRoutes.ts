import { Elysia } from "elysia";

import { getErrorMessage } from "../shared/errors.ts";

import { createLogger } from "./logger.ts";
import { VpsLinkError } from "./vpsLinkSync.ts";
import type { VpsLinkErrorKind, VpsLinkSync } from "./vpsLinkSync.ts";

const HTTP_CREATED = 201;
const HTTP_ACCEPTED = 202;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE = 422;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_BAD_GATEWAY = 502;

const VPS_LINK_ERROR_STATUS: Record<VpsLinkErrorKind, number> = {
  not_configured: HTTP_CONFLICT,
  not_found: HTTP_NOT_FOUND,
  invalid_request: HTTP_BAD_REQUEST,
  rejected: HTTP_UNPROCESSABLE,
  auth: HTTP_BAD_GATEWAY,
  host_key: HTTP_BAD_GATEWAY,
  unreachable: HTTP_BAD_GATEWAY,
  timeout: HTTP_BAD_GATEWAY,
  remote_missing: HTTP_BAD_GATEWAY,
  version_mismatch: HTTP_BAD_GATEWAY,
  remote_unavailable: HTTP_BAD_GATEWAY,
  bad_output: HTTP_BAD_GATEWAY,
};

const log = createLogger("vps-link-routes");

type StatusSetter = { status?: number | string };

async function handle<T>(set: StatusSetter, action: () => T | Promise<T>): Promise<T | { error: string }> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof VpsLinkError) {
      set.status = VPS_LINK_ERROR_STATUS[error.kind];
      return { error: error.message };
    }
    log.error("requête vers le VPS échouée", { error: getErrorMessage(error) });
    set.status = HTTP_INTERNAL_ERROR;
    return { error: getErrorMessage(error) };
  }
}

// NOTE(ali): Mac-only routes of the "Board cible" VPS mode; never mounted on the cloud host.
export function createVpsLinkRoutes({ vpsLink }: { vpsLink: VpsLinkSync }) {
  return new Elysia({ prefix: "/vps-link" })
    .get("/projects", ({ set }) => handle(set, () => vpsLink.listProjects()))
    .post("/tickets", ({ body, set }) => handle(set, async () => {
      const response = await vpsLink.createTicket(body);
      set.status = response.status === "created" ? HTTP_CREATED : HTTP_ACCEPTED;
      return response;
    }))
    .get("/sends", () => vpsLink.listSends())
    .delete("/sends/:id", ({ params, set }) => handle(set, () => {
      vpsLink.dismissSend(params.id);
      return { ok: true };
    }));
}
