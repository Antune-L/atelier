import { z } from "zod";

import { getErrorMessage } from "../../shared/errors.ts";
import { createLogger } from "../logger.ts";

const JWT_ALGORITHM = "RS256";
const VERIFY_ALGORITHM = "RSASSA-PKCS1-v1_5";
const VERIFY_HASH = "SHA-256";
const CERTS_PATH = "/cdn-cgi/access/certs";
const CLOCK_SKEW_SECONDS = 60;
const MS_PER_SECOND = 1000;
const CERTS_FETCH_TIMEOUT_MS = 5000;
const CERTS_TTL_MS = 60 * 60 * 1000;
const CERTS_MAX_STALE_MS = 24 * 60 * 60 * 1000;
const CERTS_MIN_REFRESH_INTERVAL_MS = 60 * 1000;
const MAX_ASSERTION_LENGTH = 16_384;
const JWT_SEGMENT_COUNT = 3;

const headerSchema = z.object({ alg: z.literal(JWT_ALGORITHM), kid: z.string().min(1) });
const payloadSchema = z.object({
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  nbf: z.number().optional(),
});
const jwkSchema = z.object({
  kid: z.string().min(1),
  kty: z.literal("RSA"),
  n: z.string().min(1),
  e: z.string().min(1),
});
const certsSchema = z.object({ keys: z.array(z.unknown()) });

const log = createLogger("remote-mcp");

export interface AccessJwtVerifierOptions {
  teamDomain: string;
  aud: string;
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
  now?: () => number;
}

interface CertsCache {
  keys: Map<string, CryptoKey>;
  fetchedAt: number;
}

function decodeSegment(segment: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(segment)) return null;
  return new Uint8Array(Buffer.from(segment, "base64url"));
}

function parseJsonSegment(segment: string): unknown {
  const bytes = decodeSegment(segment);
  if (bytes === null) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

async function importKeys(raw: unknown): Promise<Map<string, CryptoKey>> {
  const certs = certsSchema.parse(raw);
  const keys = new Map<string, CryptoKey>();
  for (const entry of certs.keys) {
    const jwk = jwkSchema.safeParse(entry);
    if (!jwk.success) continue;
    const { kid, kty, n, e } = jwk.data;
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty, n, e, alg: JWT_ALGORITHM, ext: true },
      { name: VERIFY_ALGORITHM, hash: VERIFY_HASH },
      false,
      ["verify"],
    );
    keys.set(kid, key);
  }
  return keys;
}

/** Validates the Cloudflare Access application token (`Cf-Access-Jwt-Assertion`); fails closed. */
export class AccessJwtVerifier {
  private readonly issuer: string;
  private readonly certsUrl: string;
  private readonly fetchCerts: (url: string, init: RequestInit) => Promise<Response>;
  private readonly now: () => number;
  private cache: CertsCache | null = null;
  private lastAttemptAt = Number.NEGATIVE_INFINITY;
  private inflight: Promise<void> | null = null;

  constructor(private readonly options: AccessJwtVerifierOptions) {
    this.issuer = `https://${options.teamDomain}`;
    this.certsUrl = `${this.issuer}${CERTS_PATH}`;
    this.fetchCerts = options.fetch ?? ((url, init) => fetch(url, init));
    this.now = options.now ?? Date.now;
  }

  async verify(assertion: string | null): Promise<boolean> {
    if (assertion === null || assertion.length === 0 || assertion.length > MAX_ASSERTION_LENGTH) return false;
    const segments = assertion.split(".");
    if (segments.length !== JWT_SEGMENT_COUNT) return false;
    const [encodedHeader = "", encodedPayload = "", encodedSignature = ""] = segments;
    const header = headerSchema.safeParse(parseJsonSegment(encodedHeader));
    const payload = payloadSchema.safeParse(parseJsonSegment(encodedPayload));
    const signature = decodeSegment(encodedSignature);
    if (!header.success || !payload.success || signature === null) return false;
    if (!this.claimsValid(payload.data)) return false;
    const key = await this.keyFor(header.data.kid);
    if (key === null) return false;
    const signedData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    try {
      return await crypto.subtle.verify(VERIFY_ALGORITHM, key, signature, signedData);
    } catch {
      return false;
    }
  }

  private claimsValid(payload: z.infer<typeof payloadSchema>): boolean {
    const nowSeconds = this.now() / MS_PER_SECOND;
    const audiences = typeof payload.aud === "string" ? [payload.aud] : payload.aud;
    return payload.iss === this.issuer
      && audiences.includes(this.options.aud)
      && payload.exp > nowSeconds - CLOCK_SKEW_SECONDS
      && (payload.nbf === undefined || payload.nbf <= nowSeconds + CLOCK_SKEW_SECONDS);
  }

  private async keyFor(kid: string): Promise<CryptoKey | null> {
    const age = this.cache === null ? Number.POSITIVE_INFINITY : this.now() - this.cache.fetchedAt;
    const known = this.cache?.keys.get(kid) ?? null;
    if (known === null || age > CERTS_TTL_MS) await this.refresh();
    if (this.cache !== null && this.now() - this.cache.fetchedAt > CERTS_MAX_STALE_MS) this.cache = null;
    return this.cache?.keys.get(kid) ?? null;
  }

  private refresh(): Promise<void> {
    if (this.inflight !== null) return this.inflight;
    if (this.now() - this.lastAttemptAt < CERTS_MIN_REFRESH_INTERVAL_MS) return Promise.resolve();
    this.lastAttemptAt = this.now();
    this.inflight = this.load().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async load(): Promise<void> {
    try {
      const response = await this.fetchCerts(this.certsUrl, {
        redirect: "error",
        signal: AbortSignal.timeout(CERTS_FETCH_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const keys = await importKeys(await response.json());
      if (keys.size === 0) throw new Error("aucune clé RSA");
      this.cache = { keys, fetchedAt: this.now() };
    } catch (error) {
      log.warn("clés Access indisponibles", { error: getErrorMessage(error) });
    }
  }
}
