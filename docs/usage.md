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
