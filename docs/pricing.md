# Pricing grid

Last verified: 2026-10-28

The usage page and `/stats` show an **indicative** API cost. Neither SDK reports prices for every
run, so a local price grid lives in [`src/shared/pricing.ts`](../src/shared/pricing.ts). Tokens are
the source of truth; costs are recomputed from them, so a price fix applies retroactively.

When the SDK reports a cost (`costUsd` on an execution's model usage, i.e. the Claude SDK
`costUSD`), that value wins. Otherwise the cost is recomputed from tokens with the grid.

## Claude (Anthropic)

Rates are USD per million tokens (MTok), per family (`PRICING`) with per-id overrides
(`MODEL_PRICING`, matched by prefix so dated ids resolve).

```
cost = (input × in + output × out + cacheRead × in × 0.1 + cacheCreate × in × 1.25) / 1e6
```

Opus 5.5 cache reads bill at 0.05× instead of 0.1×. Claude ignores the FAST flag.

## GPT (Codex / OpenAI)

Explicit per-bucket rates (`GPT_PRICING`, `GPT_FAST_PRICING`), keyed by exact model-id prefix: an id
matches when it equals the prefix or continues with `-` (`gpt-6.1-sol-2026-…`), so `gpt-6-sol` never
matches another entry by accident. `gpt-6-sol` has no separate published price and is billed at the
`gpt-6.1-sol` rates (product decision). Claude's 1.25× / 0.1× multipliers never apply.

| Model | Input | Output | Cached input | Write 30m | Write 12h |
| --- | --- | --- | --- | --- | --- |
| gpt-6-astra | 10 | 50 | 1 | 12.5 | 25 |
| gpt-6.1-sol | 2 | 10 | 0.10 | 2.5 | 5 |
| gpt-6-sol | 2 | 10 | 0.10 | 2.5 | 5 |
| gpt-6.1-terra | 1 | 5 | 0.05 | 1.25 | 2.5 |
| gpt-6-luna | 0.10 | 0.50 | 0.01 | 0.125 | 0.25 |

FAST (priority service tier, `codexFast` or a `fast`/`priority` configured tier):

| Model | Input | Output | Cached input | Write 30m | Write 12h |
| --- | --- | --- | --- | --- | --- |
| gpt-6-astra | 20 | 100 | 2 | 25 | 50 |
| gpt-6.1-sol | 4 | 20 | 0.20 | 5 | 10 |
| gpt-6-sol | 4 | 20 | 0.20 | 5 | 10 |
| gpt-6.1-terra | 2 | 10 | 0.10 | 2.5 | 5 |
| gpt-6-luna | 0.20 | 1 | 0.02 | 0.25 | 0.50 |

```
uncached = max(0, input − cacheRead − cacheCreate)
cost = (uncached × input + cacheRead × cachedInput + cacheCreate × write30m + output × output) / 1e6
```

- **Uncached-input assumption.** The Codex App Server `inputTokens` includes cached tokens (OpenAI
  convention), so cached and written tokens are subtracted before applying the input rate. The
  usage page applies the same split (`exclusiveTokenBuckets`) so its Codex « Entrée » bucket shows
  only uncached input and token totals do not count cached tokens twice.
- **30-minute write rate.** Reported tokens do not say which cache lifetime was used, so cache
  creation is billed at the 30m write rate. The 12h rate is kept in the table for reference only.

## Unpriced models

A model with no entry (for example a new `gpt-7-*` id before it is added) returns `null`: it is
shown as « non tarifé », its tokens are still counted, and the provider/ticket total is marked
partial (known subtotal only). Never invent a zero price.

## Sources

- https://www.anthropic.com/pricing
- https://openai.com/api/pricing/

## Update procedure

Required on every `@anthropic-ai/claude-agent-sdk` or `@openai/codex-sdk` bump and whenever a new
model becomes selectable:

1. List the model ids the SDKs can now report (`AGENT_MODELS`, `CODEX_MODELS` and the runtime catalog).
2. Open both pricing pages above and read the current list prices for each id, including FAST rates.
3. Update `PRICING` / `MODEL_PRICING` (Claude) or `GPT_PRICING` / `GPT_FAST_PRICING` (GPT) in
   `src/shared/pricing.ts`. Add new ids; leave a model out rather than guessing when no price is published.
4. Check whether the cache conventions changed (cached tokens included in input, cache multipliers,
   write lifetimes) and adjust the formulas and this document if so.
5. Update the tables above and the `Last verified` date.
6. Update `src/shared/pricing.test.ts` expectations and run `bun test src/shared`, `bun run typecheck`, `bun run lint`.
