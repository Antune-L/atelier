#!/usr/bin/env bash
# Vendored from the composer-implement skill. Keep in sync manually.
# Implement a plan/PRD in a repo using Cursor's headless CLI with Composer 2.5.
#
# Cursor edits the working tree directly; this script LEAVES ALL CHANGES
# UNCOMMITTED — it forbids git in the prompt and never commits itself.
# Also used for a targeted second pass: pass a gaps file instead of the plan.
#
# Usage:   run_composer.sh <project_dir> <plan_file> [model_slug]
#
# Exit:    0 success (changes in the working tree)
#          2 bad usage / missing inputs
#          3 cursor binary not found
#          4 not authenticated (no `agent login` session and no CURSOR_API_KEY)
#          5 cursor run failed or timed out
#          6 cursor ran but produced no changes (likely a context-limit no-op)
set -euo pipefail

project="${1:?usage: run_composer.sh <project_dir> <plan_file> [model_slug]}"
plan_file="${2:?usage: run_composer.sh <project_dir> <plan_file> [model_slug]}"
model_arg="${3:-}"

TIMEOUT_SECS=1800

[ -d "$project" ] || { echo "ERR: project dir not found: $project" >&2; exit 2; }
[ -f "$plan_file" ] || { echo "ERR: plan file not found: $plan_file" >&2; exit 2; }

# Cursor's headless binary installs as `cursor-agent` and is also invoked as `agent`.
bin=""
for c in cursor-agent agent; do
  if command -v "$c" >/dev/null 2>&1; then bin="$c"; break; fi
done
[ -n "$bin" ] || {
  echo "ERR: cursor headless CLI not found. Install: curl https://cursor.com/install -fsS | bash" >&2
  exit 3
}

# Auth: an existing `agent login` session OR a CURSOR_API_KEY (CI) both work.
if [ -z "${CURSOR_API_KEY:-}" ] && ! "$bin" status >/dev/null 2>&1; then
  echo "ERR: Cursor not authenticated — run 'agent login' or export CURSOR_API_KEY." >&2
  exit 4
fi

# Portable timeout: macOS ships no `timeout`/`gtimeout`. Use them if present,
# else fall back to a background-process watchdog (TERM, then KILL after 5s).
run_with_timeout() {
  local secs="$1"; shift
  if command -v timeout  >/dev/null 2>&1; then timeout  "$secs" "$@"; return $?; fi
  if command -v gtimeout >/dev/null 2>&1; then gtimeout "$secs" "$@"; return $?; fi
  "$@" &
  local cmd_pid=$!
  ( sleep "$secs"; kill -TERM "$cmd_pid" 2>/dev/null; sleep 5; kill -KILL "$cmd_pid" 2>/dev/null ) &
  local watch_pid=$!
  local rc=0
  wait "$cmd_pid" || rc=$?
  kill "$watch_pid" 2>/dev/null || true
  wait "$watch_pid" 2>/dev/null || true
  return "$rc"
}

# Resolve the Composer 2.5 slug: explicit arg > runtime list > fallback.
# `composer-2.5` is the standard slug; `composer-2.5-fast` is the pricier
# interactive default — never auto-pick it.
resolve_model() {
  if [ -n "$model_arg" ]; then printf '%s' "$model_arg"; return; fi
  local listed
  listed="$("$bin" --list-models 2>/dev/null || true)"
  local cand
  for cand in composer-2.5 composer-2; do
    if printf '%s\n' "$listed" | grep -qw "$cand" 2>/dev/null; then
      printf '%s' "$cand"; return
    fi
  done
  printf 'composer-2.5'
}
model="$(resolve_model)"

guard='IMPORTANT: Do NOT run git commit, git push, git add, git checkout, git pull, or create branches. Only modify files in the working tree. Follow the project CLAUDE.md / AGENTS.md / .cursorrules and its coding conventions. Run the project typecheck/lint/tests and fix issues with a minimal diff.'

prompt="$guard

Implement the following in this repository:

$(cat "$plan_file")"

cd "$project"
before="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"

set +e
run_with_timeout "$TIMEOUT_SECS" "$bin" -p "$prompt" \
  --model "$model" \
  --force \
  --trust \
  --output-format text
rc=$?
set -e
[ "$rc" -eq 0 ] || { echo "ERR: cursor run failed/timed out (exit $rc, model=$model)" >&2; exit 5; }

after="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
if [ "$after" -le "$before" ]; then
  echo "ERR: cursor produced no working-tree changes (context-limit no-op?, model=$model)" >&2
  exit 6
fi

echo "=== model: $model ==="
echo "=== uncommitted changes (left for review) ==="
git status --porcelain
git --no-pager diff --stat
