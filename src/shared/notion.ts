const NOTION_HOSTS = ["notion.so", "notion.site", "notion.com"] as const;

/** True when the string is an http(s) URL whose host is or ends with a Notion domain. */
export function isNotionUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return NOTION_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
