#!/usr/bin/env bash
# Upgrades the VPS to the latest main (or --sha) in one command: build, check, back up, switch, health, rollback.
# Installed as /usr/local/sbin/kanban-upgrade (root only) from a reviewed commit (docs/vps-install.md). Neither
# this script nor kanban-release ever updates itself from a release.
#
# Exit codes: 0 upgraded or already current, 1 refused or failed with the service on the previous release,
# 2 rollback health check failed too, 64 bad usage.
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
  runuser -u "$SERVICE_USER" -- env -i HOME="$SERVICE_HOME" PATH="$SAFE_PATH" "$@"
}

# Strips control characters from text read out of the kanban-owned database before printing it.
sanitize() { tr -cd '[:print:]\n'; }

switch_current() {
  ln -sfn "$1" "$CURRENT.tmp"
  mv -T "$CURRENT.tmp" "$CURRENT"
}

free_mb() { df -Pm -- "$1" | awk 'NR == 2 { print $4 }'; }

service_port() {
  local port=""
  port="$(systemctl show -p Environment --value "$SERVICE" | tr ' ' '\n' | sed -n 's/^PORT=//p' | tail -n 1)"
  if [[ -z "$port" && -r "$SERVICE_ENV_FILE" ]]; then
    port="$(sed -n 's/^[[:space:]]*PORT=//p' "$SERVICE_ENV_FILE" | tail -n 1 | tr -d "\"' ")"
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
  echo "Already at $sha. Nothing to do."
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

# e. Refuse while work is running. Accepted race: an automation or autonomous delivery can still start
# between this check and the stop below; a human runs this command, and there is no drain mode.
step "Checking for running work"
active_query="
SELECT 'execution run ' || id || ' (' || owner_type || ' ' || owner_id || ', ' || role || ')'
  FROM execution_runs WHERE status = 'running'
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
    fail "work is running on the VPS. Wait for it to finish, or rerun with --force"
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

# h. Health.
port="$(service_port)"
step "Checking health on 127.0.0.1:$port"
if ! check_health "$port"; then
  # i. Roll back the code only. The database is never restored automatically.
  echo "Health check failed on $sha. Rolling back to $before." >&2
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
  if [[ $rollback_ok -eq 1 ]]; then
    echo "Rolled back: $SERVICE is healthy on $before." >&2
    exit 1
  fi
  echo "Rollback health check failed too: $SERVICE is not healthy on $before." >&2
  exit 2
fi

# j. Retention: never removes the new or the previous release; backups are pruned as the service user.
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
