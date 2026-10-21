import { Elysia } from "elysia";

import { auditRunNowInputSchema } from "../shared/audit.ts";
import { getErrorMessage } from "../shared/errors.ts";

import { AuditError } from "./agents/auditManager.ts";
import type { AuditErrorCode, AuditManager } from "./agents/auditManager.ts";
import { createLogger } from "./logger.ts";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE = 422;
const HTTP_INTERNAL_ERROR = 500;
const INVALID_BODY = "Requête invalide.";

const AUDIT_ERROR_STATUS: Record<AuditErrorCode, number> = {
  invalid: HTTP_BAD_REQUEST,
  not_found: HTTP_NOT_FOUND,
  conflict: HTTP_CONFLICT,
  unsupported: HTTP_UNPROCESSABLE,
};

const log = createLogger("audit-routes");

type StatusSetter = { status?: number | string };

async function handle<T>(set: StatusSetter, action: () => T | Promise<T>): Promise<T | { error: string }> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof AuditError) {
      set.status = AUDIT_ERROR_STATUS[error.code];
      return { error: error.message };
    }
    log.error("requête d'audit échouée", { error: getErrorMessage(error) });
    set.status = HTTP_INTERNAL_ERROR;
    return { error: getErrorMessage(error) };
  }
}

export function createAuditRoutes({ audits }: { audits: AuditManager }) {
  return new Elysia()
    .get("/audits", ({ set }) => handle(set, () => audits.overview()))
    .get("/audits/runs/:id", ({ params, set }) => handle(set, () => audits.runDetail(params.id)))
    .post("/audits/runs/:id/stop", ({ params, set }) => handle(set, () => audits.stopRun(params.id)))
    .patch("/projects/:key/audit", ({ params, body, set }) => handle(set, () => audits.updateSettings(params.key, body)))
    .post("/projects/:key/audit/run", ({ params, body, set }) => handle(set, () => {
      if (!auditRunNowInputSchema.safeParse(body ?? {}).success) throw new AuditError("invalid", INVALID_BODY);
      return audits.runNow(params.key);
    }))
    .post("/projects/:key/audit/start", ({ params, body, set }) => handle(set, () => audits.setStart(params.key, body)))
    .post("/audits/findings/:id/card", ({ params, body, set }) => handle(set, () => audits.createCard(params.id, body)))
    .post("/audits/findings/:id/decision", ({ params, body, set }) => handle(set, () => audits.decide(params.id, body)))
    .delete("/audits/findings/:id/decision", ({ params, set }) => handle(set, () => audits.clearDecision(params.id)))
    .post("/audits/findings/:id/recheck", ({ params, set }) => handle(set, () => audits.review(params.id, "recheck")))
    .post("/audits/findings/:id/arbitrate", ({ params, set }) => handle(set, () => audits.review(params.id, "arbiter")));
}
