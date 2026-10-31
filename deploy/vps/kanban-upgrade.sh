#!/usr/bin/env bash
# Upgrades the VPS to the latest main (or --sha) in one command: build, check, back up, switch, health, rollback.
# Installed as /usr/local/sbin/kanban-upgrade (root only) from a reviewed commit (docs/vps-install.md). Neither
# this script nor kanban-release ever updates itself from a release.
#
# NOTE(ali): Exit codes: 0 upgraded/current, 1 failure, 2 unhealthy rollback, 64 bad usage, 75 active work (retryable).
set -euo pipefail

readonly REPO_URL=https://github.com/Antune-L/atelier.git
readonly RELEASE_BIN=/usr/local/sbin/kanban-release
readonly RELEASES=/opt/kanban/releases
readonly CURRENT=/opt/kanban/current
readonly BUILD_ROOT=/var/lib/kanban-release-build
readonly SERVICE=kanban
readonly SERVICE_USER=kanban
readonly SERVICE_HOME=/var/lib/kanban
readonly SERVICE_ENV_FILE=/etc/kanban/kanban.env
readonly DB=/var/lib/kanban/data/kanban.db
readonly BACKUPS=/var/lib/kanban/backups
readonly LOCK=/run/kanban-upgrade.lock
readonly SAFE_PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
readonly DEFAULT_PORT=52817
readonly MIN_FREE_MB=3072
readonly BACKUP_MARGIN_MB=256
readonly KEEP_RELEASES=5
readonly KEEP_BACKUPS=10
readonly HEALTH_OK_REQUIRED=5
readonly HEALTH_INTERVAL=4
readonly HEALTH_TIMEOUT=120
readonly EXIT_ACTIVE_WORK=75
readonly MCP_PATH=/mcp
readonly MCP_TIMEOUT=60
readonly MCP_PROBE_TIMEOUT=10
readonly MCP_ACCEPT='Accept: application/json, text/event-stream'
readonly MCP_TOOLS_LIST='{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
readonly HTTP_UNAUTHORIZED=401
readonly HTTP_METHOD_NOT_ALLOWED=405
readonly SANDBOX_FAILED=failed
readonly SANDBOX_PENDING=pending
readonly BRIDGE_SOURCE=deploy/vps/kanban-bridge
readonly BRIDGE_DEST=/usr/local/bin/kanban-bridge
readonly BRIDGE_OWNER_MODE='root:root 755'
# NOTE(ali): Prints remoteMcp.sandbox from the /health JSON on stdin, empty when absent or not a short word.
readonly SANDBOX_FIELD_PY='import json, re, sys
body = json.load(sys.stdin)
remote = body.get("remoteMcp") if isinstance(body, dict) else None
value = remote.get("sandbox") if isinstance(remote, dict) else None
print(value if isinstance(value, str) and re.fullmatch("[a-z-]{1,32}", value) else "")'

export PATH="$SAFE_PATH"
unset KANBAN_REPO_URL
umask 022

usage() {
  echo "usage: $0 [--sha <full 40-character commit sha>] [--force]" >&2
  echo "  --sha    upgrade to this commit instead of the tip of main" >&2
  echo "  --force  upgrade even if cards, validations, previews or slots are active" >&2
  exit 64
}

step() { echo "==> $*"; }
fail() {
  echo "kanban-upgrade: $*" >&2
  exit 1
}

requested_sha=""
force=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --sha)
      [[ $# -ge 2 ]] || usage
      requested_sha="$2"
      shift 2
      ;;
    --force)
      force=1
      shift
      ;;
    -h | --help) usage ;;
    *) usage ;;
  esac
done
if [[ -n "$requested_sha" && ! "$requested_sha" =~ ^[0-9a-f]{40}$ ]]; then
  usage
fi
[[ $EUID -eq 0 ]] || fail "run as root"

# Runs a command as the service user with a minimal environment. Root never opens the database itself.
as_service() {
  runuser -u "$SERVICE_USER" -- env -i -C "$SERVICE_HOME" HOME="$SERVICE_HOME" PATH="$SAFE_PATH" "$@"
}

# Strips control characters from text read out of the kanban-owned database before printing it.
sanitize() { tr -cd '[:print:]\n'; }

switch_current() {
  ln -sfn "$1" "$CURRENT.tmp"
  mv -T "$CURRENT.tmp" "$CURRENT"
}

free_mb() { df -Pm -- "$1" | awk 'NR == 2 { print $4 }'; }

# NOTE(ali): D15: the bridge program runs as the SSH user, who has sudo, so it comes from the commit itself
# (git show in a root-only scratch repository), never from the release tree the build user wrote, and it is only
# installed from a commit named with --sha. The tip of main is compared and reported, never installed.
bridge_work=""
cleanup_bridge() {
  if [[ -n "$bridge_work" ]]; then
    rm -rf -- "$bridge_work"
  fi
}
trap cleanup_bridge EXIT

as_root_git() {
  env -i PATH="$SAFE_PATH" HOME=/nonexistent GIT_TERMINAL_PROMPT=0 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null \
    git "$@"
}

fetch_bridge() {
  bridge_work="$(mktemp -d)"
  as_root_git init --quiet --bare "$bridge_work/repo"
  as_root_git -C "$bridge_work/repo" fetch --quiet --depth 1 "$REPO_URL" "$1" \
    && as_root_git -C "$bridge_work/repo" show "$1:$BRIDGE_SOURCE" >"$bridge_work/kanban-bridge" \
    && [[ -s "$bridge_work/kanban-bridge" ]]
}

bridge_is_current() {
  [[ -f "$BRIDGE_DEST" && ! -L "$BRIDGE_DEST" ]] && cmp -s "$bridge_work/kanban-bridge" "$BRIDGE_DEST" \
    && [[ "$(stat -c '%U:%G %a' "$BRIDGE_DEST")" == "$BRIDGE_OWNER_MODE" ]]
}

sync_bridge() {
  if [[ ! -s "$bridge_work/kanban-bridge" ]]; then
    echo "    warning: cannot read $BRIDGE_SOURCE at $1; $BRIDGE_DEST was left unchanged"
    return 0
  fi
  if bridge_is_current; then
    echo "    $BRIDGE_DEST is already the version of $1"
    return 0
  fi
  if [[ -z "$requested_sha" ]]; then
    echo "    $BRIDGE_DEST differs from $1 and was left unchanged: only a commit named with --sha is installed."
    echo "    Review $BRIDGE_SOURCE at $1 in your review clone, then run: sudo kanban-upgrade --sha $1"
    return 0
  fi
  install -o root -g root -m 0755 "$bridge_work/kanban-bridge" "$BRIDGE_DEST.tmp"
  mv -f -- "$BRIDGE_DEST.tmp" "$BRIDGE_DEST"
  echo "    installed $BRIDGE_DEST from $1"
}

# Prints the last value of a variable in the service environment file, without quotes or spaces.
env_file_value() {
  [[ -r "$SERVICE_ENV_FILE" ]] || return 0
  sed -n "s/^[[:space:]]*$1=//p" "$SERVICE_ENV_FILE" | tail -n 1 | tr -d "\"' "
}

service_port() {
  local port=""
  port="$(systemctl show -p Environment --value "$SERVICE" | tr ' ' '\n' | sed -n 's/^PORT=//p' | tail -n 1)"
  if [[ -z "$port" ]]; then
    port="$(env_file_value PORT)"
  fi
  if [[ ! "$port" =~ ^[0-9]+$ ]]; then
    port="$DEFAULT_PORT"
  fi
  echo "$port"
}

# Succeeds after HEALTH_OK_REQUIRED consecutive healthy probes, HEALTH_INTERVAL seconds apart.
check_health() {
  local port="$1" ok=0 deadline body
  deadline=$((SECONDS + HEALTH_TIMEOUT))
  while ((SECONDS < deadline)); do
    if systemctl is-active --quiet "$SERVICE" \
      && body="$(curl -fsS --max-time 3 "http://127.0.0.1:$port/health" 2>/dev/null)" \
      && [[ "$body" == *'"ok":true'* ]]; then
      ok=$((ok + 1))
      echo "    health $ok/$HEALTH_OK_REQUIRED ok"
      if ((ok >= HEALTH_OK_REQUIRED)); then
        return 0
      fi
    else
      ok=0
    fi
    sleep "$HEALTH_INTERVAL"
  done
  return 1
}

# Prints the HTTP status of a request, or 000 when no answer came back.
http_status() {
  curl -sS -o /dev/null -w '%{http_code}' --max-time "$MCP_PROBE_TIMEOUT" "$@" 2>/dev/null || true
}

# One pass of the remote MCP checks. Sets mcp_problem and fails on the first unexpected answer.
remote_mcp_ok() {
  local port="$1" local_url="http://127.0.0.1:$mcp_port$MCP_PATH" code sandbox
  code="$(http_status -X POST -H "Host: $mcp_host" -H 'Content-Type: application/json' -H "$MCP_ACCEPT" \
    --data "$MCP_TOOLS_LIST" "$local_url")"
  if [[ "$code" != "$HTTP_UNAUTHORIZED" ]]; then
    mcp_problem="local POST $MCP_PATH without an Access assertion answered $code, expected $HTTP_UNAUTHORIZED"
    return 1
  fi
  code="$(http_status -H "Host: $mcp_host" -H "$MCP_ACCEPT" "$local_url")"
  if [[ "$code" != "$HTTP_METHOD_NOT_ALLOWED" ]]; then
    mcp_problem="local GET $MCP_PATH answered $code, expected $HTTP_METHOD_NOT_ALLOWED"
    return 1
  fi
  code="$(http_status -X POST -H 'Content-Type: application/json' -H "$MCP_ACCEPT" \
    --data "$MCP_TOOLS_LIST" "https://$mcp_host$MCP_PATH")"
  if [[ "$code" != "$HTTP_UNAUTHORIZED" ]]; then
    mcp_problem="public POST https://$mcp_host$MCP_PATH without a token answered $code, expected $HTTP_UNAUTHORIZED"
    return 1
  fi
  sandbox="$(curl -fsS --max-time 3 "http://127.0.0.1:$port/health" 2>/dev/null \
    | python3 -I -c "$SANDBOX_FIELD_PY" 2>/dev/null)" || sandbox=""
  case "$sandbox" in
    "")
      mcp_problem="/health does not report remoteMcp.sandbox"
      return 1
      ;;
    "$SANDBOX_FAILED" | "$SANDBOX_PENDING")
      mcp_problem="/health reports remoteMcp.sandbox=$sandbox"
      return 1
      ;;
  esac
  echo "    remote MCP: local POST 401, local GET 405, public POST 401, sandbox $sandbox"
}

# Retries the remote MCP checks for MCP_TIMEOUT seconds, so a sandbox probe still pending can settle.
check_remote_mcp() {
  local port="$1" deadline
  deadline=$((SECONDS + MCP_TIMEOUT))
  mcp_problem=""
  until remote_mcp_ok "$port"; do
    if ((SECONDS >= deadline)); then
      echo "    remote MCP check failed: $mcp_problem" >&2
      return 1
    fi
    sleep "$HEALTH_INTERVAL"
  done
}

# Remote MCP settings. The listener only starts when all four are set, so a partial setup is refused
# before the service is touched.
mcp_port="$(env_file_value KANBAN_REMOTE_MCP_PORT)"
mcp_host="$(env_file_value KANBAN_REMOTE_MCP_HOSTNAME)"
if [[ -n "$mcp_port" ]]; then
  if [[ ! "$mcp_port" =~ ^[1-9][0-9]{0,4}$ ]] || ((mcp_port > 65535)); then
    fail "KANBAN_REMOTE_MCP_PORT in $SERVICE_ENV_FILE is not a TCP port"
  fi
  [[ "$mcp_host" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] \
    || fail "KANBAN_REMOTE_MCP_HOSTNAME in $SERVICE_ENV_FILE is missing or not a hostname"
  for name in KANBAN_REMOTE_MCP_ACCESS_TEAM_DOMAIN KANBAN_REMOTE_MCP_ACCESS_AUD; do
    [[ -n "$(env_file_value "$name")" ]] \
      || fail "$name is missing in $SERVICE_ENV_FILE while KANBAN_REMOTE_MCP_PORT is set"
  done
fi

# a. One upgrade at a time. The lock lives in /run, which only root can write.
step "Taking the upgrade lock"
[[ ! -L "$LOCK" ]] || fail "refusing a symlinked lock file $LOCK"
exec 9>"$LOCK"
flock -n 9 || fail "another kanban-upgrade is running"

# b. Target and current commits.
step "Resolving the target commit"
if [[ -n "$requested_sha" ]]; then
  sha="$requested_sha"
else
  sha="$(env -i PATH="$SAFE_PATH" GIT_TERMINAL_PROMPT=0 git ls-remote "$REPO_URL" refs/heads/main | awk 'NR == 1 { print $1 }')"
  [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || fail "cannot read main from $REPO_URL"
fi
[[ -L "$CURRENT" ]] || fail "$CURRENT is missing: install the first release with kanban-release"
previous="$(readlink -f "$CURRENT")"
before="$(basename "$previous")"
echo "    current: $before"
echo "    target:  $sha"
if [[ "$before" == "$sha" ]]; then
  step "Checking the bridge program against $sha"
  fetch_bridge "$sha" || true
  sync_bridge "$sha"
  echo "Already at $sha. Nothing else to do."
  exit 0
fi

# c. Disk space for the build, the release copy and the backup.
step "Checking free disk space"
build_dir="$BUILD_ROOT"
[[ -d "$build_dir" ]] || build_dir="$(dirname "$BUILD_ROOT")"
for path in "$RELEASES" "$build_dir" "$SERVICE_HOME"; do
  free="$(free_mb "$path")"
  echo "    $path: ${free} MB free"
  ((free >= MIN_FREE_MB)) || fail "less than $MIN_FREE_MB MB free on $path"
done
db_mb="$(as_service stat -c %s "$DB" | awk '{ print int($1 / 1048576) + 1 }')"
(($(free_mb "$BACKUPS") >= db_mb + BACKUP_MARGIN_MB)) || fail "not enough space in $SERVICE_HOME for a ${db_mb} MB backup"

# d. Build before touching the service.
step "Building release $sha"
if ! env -i PATH="$SAFE_PATH" "$RELEASE_BIN" --build-only "$sha"; then
  fail "build failed. The service was not touched and still runs $before"
fi
target="$RELEASES/$sha"
[[ -d "$target" && ! -L "$target" ]] || fail "build did not produce $target. The service still runs $before"
step "Reading the bridge program from $sha"
fetch_bridge "$sha" || echo "    warning: cannot read $BRIDGE_SOURCE at $sha; the bridge program will be left unchanged"

# e. Refuse while work is running. Accepted race: an automation or autonomous delivery can still start
# between this check and the stop below; a human runs this command, and there is no drain mode.
step "Checking for running work"
active_query="
SELECT 'execution run ' || e.id || ' (' || e.owner_type || ' ' || e.owner_id || ', ' || e.role || ')'
  FROM execution_runs e
  WHERE e.status = 'running' AND NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE e.owner_type = 'conversation' AND e.role = 'atelier'
      AND c.id = e.owner_id AND e.session_id IS NOT NULL AND c.session_id = e.session_id
      AND c.orchestrator = e.orchestrator AND c.session_status = 'idle'
      AND CASE WHEN json_valid(c.active_subagents)
        THEN json_type(c.active_subagents) = 'array' AND json_array_length(c.active_subagents) = 0
        ELSE 0 END
  )
UNION ALL
SELECT 'quality validation ' || id || ' (ticket ' || ticket_id || ', ' || status || ')'
  FROM quality_validation_runs WHERE status IN ('queued', 'running')
UNION ALL
SELECT 'preview ' || id || ' (project ' || project || ', ticket ' || COALESCE(ticket_id, '-') || ', '
    || json_extract(payload_json, '\$.status') || ')'
  FROM preview_runs
  WHERE json_extract(payload_json, '\$.status') IN ('queued', 'provisioning', 'building', 'deploying', 'stopping')
UNION ALL
SELECT 'slot ' || id || ' (ticket ' || COALESCE(ticket_id, '-') || ')'
  FROM slots WHERE status = 'busy';"
if ! active="$(as_service sqlite3 -readonly -init /dev/null -batch -noheader "$DB" "$active_query" 2>&1 | sanitize)"; then
  if [[ $force -eq 1 ]]; then
    echo "    warning: cannot read the database ($active); continuing because of --force"
    active=""
  else
    fail "cannot read the database: $active"
  fi
fi
if [[ -n "$active" ]]; then
  echo "    still running:"
  while IFS= read -r line; do
    echo "      - $line"
  done <<<"$active"
  if [[ $force -eq 1 ]]; then
    echo "    continuing because of --force: these will be interrupted"
  else
    echo "kanban-upgrade: work is running on the VPS. Wait for it to finish, or rerun with --force" >&2
    exit "$EXIT_ACTIVE_WORK"
  fi
else
  echo "    nothing running"
fi

# f. Back up as the service user.
step "Backing up the database"
backup="$BACKUPS/kanban-$(date -u +%Y%m%d-%H%M%S)-${sha:0:12}.db"
as_service sqlite3 -init /dev/null -batch "$DB" "VACUUM INTO '$backup'" \
  || fail "backup failed. The service was not touched and still runs $before"
echo "    $backup"

# g. Stop, switch, start.
step "Stopping $SERVICE"
if ! systemctl stop "$SERVICE"; then
  systemctl start "$SERVICE" || true
  fail "cannot stop $SERVICE. The current release is unchanged: $before"
fi
step "Switching $CURRENT to $sha"
switch_current "$target"
step "Starting $SERVICE"
systemctl start "$SERVICE" || true

# h. Health, then the remote MCP entry when it is configured.
port="$(service_port)"
step "Checking health on 127.0.0.1:$port"
failure=""
if ! check_health "$port"; then
  failure="Health check failed"
elif [[ -n "$mcp_port" ]]; then
  step "Checking the remote MCP on 127.0.0.1:$mcp_port and https://$mcp_host$MCP_PATH"
  check_remote_mcp "$port" || failure="Remote MCP check failed"
fi
if [[ -n "$failure" ]]; then
  # i. Roll back the code only. The database is never restored automatically.
  echo "$failure on $sha. Rolling back to $before." >&2
  systemctl stop "$SERVICE" || true
  switch_current "$previous"
  systemctl restart "$SERVICE" || true
  rollback_ok=1
  check_health "$port" || rollback_ok=0
  cat >&2 <<EOF

The upgrade to $sha failed and $CURRENT points back to $before.
The database was NOT restored. Backup taken before the upgrade:
  $backup
The database schema only migrates forward: the new release may already have migrated it.
Restore the backup only if $before fails on the migrated schema, with the service stopped and as $SERVICE_USER,
and never after new pull requests or previews were created.
See journalctl -u $SERVICE for the failure.
EOF
  if [[ -n "$mcp_port" ]]; then
    echo "Remote MCP: remove the Access policy of $mcp_host until a new qualification passes." >&2
  fi
  if [[ $rollback_ok -eq 1 ]]; then
    echo "Rolled back: $SERVICE is healthy on $before." >&2
    exit 1
  fi
  echo "Rollback health check failed too: $SERVICE is not healthy on $before." >&2
  exit 2
fi

# j. The bridge program follows the release only once it is healthy; a rollback keeps the previous program.
step "Checking the bridge program"
sync_bridge "$sha"

# k. Retention: never removes the new or the previous release; backups are pruned as the service user.
step "Pruning old releases and backups"
kept=0
while IFS= read -r dir; do
  name="$(basename "$dir")"
  [[ "$name" =~ ^[0-9a-f]{40}$ && ! -L "$dir" ]] || continue
  kept=$((kept + 1))
  if [[ "$dir" == "$target" || "$dir" == "$previous" ]] || ((kept <= KEEP_RELEASES)); then
    continue
  fi
  echo "    removing release $name"
  rm -rf -- "$dir"
done < <(find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)
as_service find "$BACKUPS" -mindepth 1 -maxdepth 1 -type f -name 'kanban-*.db' -printf '%T@ %p\n' \
  | sort -rn | tail -n "+$((KEEP_BACKUPS + 1))" | cut -d' ' -f2- \
  | while IFS= read -r file; do
    echo "    removing backup $(basename "$file" | sanitize)"
    as_service rm -f -- "$file"
  done

echo "Upgraded $before -> $sha. Backup: $backup"
