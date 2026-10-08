export const PLAYWRIGHT_MCP_VERSION = "0.0.83";

export function playwrightMcpArgs(extra: readonly string[] = []): string[] {
  const browser = process.env.KANBAN_PLAYWRIGHT_BROWSER?.trim();
  return ["-y", `@playwright/mcp@${PLAYWRIGHT_MCP_VERSION}`, "--isolated", "--headless", ...(browser ? ["--browser", browser] : []), ...extra];
}
