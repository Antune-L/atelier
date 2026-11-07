const URL_PATTERN = /https?:\/\/[^\s"'<>]+/g;

/** Strip credentials, query strings and fragments from a URL so no identifier or token leaks (FR13). */
export function redactUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return raw;
  }
}

/** Deep copy of a value where every embedded http(s) URL is redacted. */
export function redactCampaignUrls(value: unknown): unknown {
  if (typeof value === "string") return value.replace(URL_PATTERN, (match) => redactUrl(match));
  if (Array.isArray(value)) return value.map(redactCampaignUrls);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactCampaignUrls(entry)]));
  }
  return value;
}
