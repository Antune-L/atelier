# Usage and subscription limits

The Consumption page works automatically with the provider connections and history available to the Atelier server. It requires no separate sharing token or machine synchronization setup.

## Subscription limits

The Limits tab reads Claude and Codex subscription allowances directly from their authenticated runtimes, without starting a model turn. It displays account identity when available, the plan, remaining allowances and reset times.

Provider allowances can include activity outside Atelier and on other devices. Reading a shared account allowance does not require copying history between those devices. API-key connections may not provide subscription limits. Failed reads keep explicitly labeled last-known allowances when available; detected account changes and sign-outs invalidate incompatible cached data.

## Costs and tokens

The Cost and Tokens tabs combine recorded Atelier executions with local provider histories for the selected period, up to 90 days. Recorded executions include tickets, conversations, actions, batches and audits. Provider calls already represented by recorded sessions are excluded from the history total.

Claude history is read from `projects` under `CLAUDE_CONFIG_DIR`, defaulting to `~/.claude`. Codex history is read from `sessions` and `archived_sessions` under `CODEX_HOME`, defaulting to `~/.codex`. Recognized duplicate provider calls are counted once, including copies in active and archived Codex history. Only usage counters are retained; conversation contents are not returned by the usage API.

The page warns when unreadable files, inaccessible directories or read limits make totals incomplete. An absent provider history directory is treated as no local history. Model pricing is described in [pricing.md](pricing.md); estimated API-equivalent costs are not subscription invoices.

Opening the same Atelier server from several browsers or devices shows the same data. Independent Atelier installations and provider sessions on other machines have separate histories. Web/mobile provider conversations and uncollected direct API calls are outside these historical totals. Current account identity does not establish which account was used for older local calls.

## Mac and VPS consumption

On the VPS board (cloud host), the Cost and Tokens tabs can also include the Mac's consumption. A Mac linked to the VPS over SSH (see [mac-vps-link-setup.md](mac-vps-link-setup.md)) publishes its own 24h, 7d, 30d and 90d summaries through the bridge operation `usage_publish`: on the first link sync after start-up, then once per hour, so the VPS can tell a running Mac (fresh data, even without new usage) from a sleeping one. The VPS keeps the last snapshot and `GET /api/usage/summary?scope=all` (the default) sums it with the VPS's own figures; `scope=local` returns the VPS figures alone. The response then carries `machines.server` and `machines.mac` (null until the Mac publishes) so the page can show the split.

The Mac's periods are frozen at publication time, so a sleeping or closed Mac keeps showing its last figures; they are flagged as stale after 2 hours without a publication. A VPS whose bridge does not know `usage_publish` yet simply never shows Mac figures; the rest of the link keeps working. Web/mobile conversations and Codex cloud tasks are still not included, and copying provider history between machines would count it twice.
