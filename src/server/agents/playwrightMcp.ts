export const PLAYWRIGHT_MCP_VERSION = "0.0.83";
const PLAYWRIGHT_MCP_IDLE_TIMEOUT_MS = 300_000;

export function playwrightMcpArgs(extra: readonly string[] = []): string[] {
  const browser = process.env.KANBAN_PLAYWRIGHT_BROWSER?.trim();
  return ["-y", `@playwright/mcp@${PLAYWRIGHT_MCP_VERSION}`, "--isolated", "--headless", "--idle-timeout", String(PLAYWRIGHT_MCP_IDLE_TIMEOUT_MS), ...(browser ? ["--browser", browser] : []), ...extra];
}
