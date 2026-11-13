import type { QualityFunctionalBlockerCode } from "../../shared/quality.ts";

export class QualityBlockerError extends Error {
  constructor(readonly code: QualityFunctionalBlockerCode, message: string) {
    super(message);
    this.name = "QualityBlockerError";
  }
}

export class SourceAuditUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceAuditUnavailableError";
  }
}
