import { createPublicKey, verify } from "node:crypto";

import { z } from "zod";

import { ADOPTION_REPOSITORY, ADOPTION_WORKFLOW, adoptionReceiptSchema } from "../../shared/providerAdoption.ts";
import type { AdoptionReceipt } from "../../shared/providerAdoption.ts";

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 1_000_000;
const API_ROOT = `https://api.github.com/repos/${ADOPTION_REPOSITORY}/`;
const REJECTED_DISPATCH_STATUSES = new Set([401, 403, 404, 422, 429]);
export class AdoptionRequestError extends Error {
  constructor(readonly status: number) { super(`Preparation service returned HTTP ${status}.`); }
  get rejected(): boolean { return REJECTED_DISPATCH_STATUSES.has(this.status); }
}
export async function adoptionFetch(url: string, token?: string, body?: unknown): Promise<unknown> {
  if (!url.startsWith(API_ROOT) && !url.startsWith(`https://registry.npmjs.org/`)) throw new Error("Untrusted preparation host.");
  const headers: Record<string, string> = { accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body) headers["content-type"] = "application/json";
  const response = await fetch(url, { method: body ? "POST" : "GET", body: body ? JSON.stringify(body) : undefined, headers, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
  if (!response.ok) throw new AdoptionRequestError(response.status);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty preparation response.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) throw new Error("Preparation response exceeds limit.");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export const adoptionApi = (path: string, token: string, body?: unknown) => {
  if (path.startsWith("registry/")) return adoptionFetch(`https://registry.npmjs.org/${path.slice("registry/".length)}`);
  return adoptionFetch(`${API_ROOT}${path}`, token, body);
};
export async function readAdoptionReceipt(runId: number, publicKey: string, token?: string, request: typeof adoptionApi = adoptionApi): Promise<AdoptionReceipt> {
  const release = z.object({ draft: z.literal(false), tag_name: z.literal(`v0.1.${runId}`), body: z.string() }).parse(await request(`releases/tags/v0.1.${runId}`, token ?? ""));
  const content = z.object({ payload: z.string().max(32_768), signature: z.string().max(1024) }).parse(JSON.parse(release.body));
  const key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== "ed25519" || !verify(null, Buffer.from(content.payload), key, Buffer.from(content.signature, "base64"))) throw new Error("Invalid qualification signature.");
  const receipt = adoptionReceiptSchema.parse(JSON.parse(content.payload));
  if (receipt.runId !== runId || receipt.version !== `0.1.${runId}`) throw new Error("Qualification run mismatch.");
  return receipt;
}
export const adoptionDispatchPath = `actions/workflows/${ADOPTION_WORKFLOW}/dispatches`;
