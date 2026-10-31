#!/usr/bin/env bash
# Sets up, or only checks with --check, a VPS for Kanban: Coolify, Phase A, the Cloudflare connector, the remote MCP
# and Phase B previews. Installed as /usr/local/sbin/kanban-bootstrap from a reviewed commit (docs/vps-bootstrap.md).
# Every root-run file comes from the commit named with --sha, fetched into a root-only scratch repository.
#
# NOTE(ali): Exit codes: 0 everything in place, 1 something missing or failing, 64 bad usage.
set -euo pipefail

readonly REPO_URL=https://github.com/Antune-L/atelier.git
readonly SAFE_PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
readonly BUN_VERSION=1.3.14
readonly SERVICE=kanban
readonly SERVICE_USER=kanban
readonly BUILD_USER=kanban-build
readonly PREVIEW_USER=kanban-preview
readonly CONNECTOR_USER=cloudflared
readonly SERVICE_HOME=/var/lib/kanban
readonly BUILD_HOME=/var/lib/kanban-build
readonly ENV_FILE=/etc/kanban/kanban.env
readonly CURRENT=/opt/kanban/current
readonly UI_SOCKET=/run/kanban/ui.sock
readonly DEFAULT_PORT=52817
readonly CONNECTOR_SERVICE=cloudflared-kanban
readonly CONNECTOR_DIR=/etc/cloudflared
readonly CONNECTOR_TOKEN=/etc/cloudflared/kanban.token
readonly MIN_CLOUDFLARED_VERSION=2025.4.0
readonly CLOUDFLARE_KEYRING=/usr/share/keyrings/cloudflare-main.gpg
readonly CLOUDFLARE_LIST=/etc/apt/sources.list.d/cloudflared.list
readonly CLOUDFLARE_REPO_LINE="deb [signed-by=$CLOUDFLARE_KEYRING] https://pkg.cloudflare.com/cloudflared any main"
readonly APPARMOR_PROFILE=/etc/apparmor.d/bwrap-userns-restrict
readonly APPARMOR_EXTRA=/usr/share/apparmor/extra-profiles/bwrap-userns-restrict
readonly BROKER_DIR=/opt/kanban-preview
readonly BROKER_CONFIG_DIR=/etc/kanban-preview
readonly BROKER_CONFIG=/etc/kanban-preview/config.json
readonly BROKER_SERVICE=kanban-preview-broker
readonly CLEANUP_SOCKET=kanban-preview-cleanup.socket
readonly PLAYWRIGHT_MCP=@playwright/mcp@0.0.83
# NOTE(ali): the playwright version that @playwright/mcp@0.0.83 depends on, so Chrome matches what the MCP drives.
readonly PLAYWRIGHT=playwright@1.64.0-alpha-1790635538000
readonly COOLIFY_INSTALLER_URL=https://cdn.coollabs.io/coolify/install.sh
readonly COOLIFY_SOURCE=/data/coolify/source
readonly COOLIFY_CUSTOM_COMPOSE=/data/coolify/source/docker-compose.custom.yml
readonly COOLIFY_ADMIN_ENV=/root/coolify-admin.env
readonly COOLIFY_CONTAINER=coolify
readonly COOLIFY_DIRECT_PORTS="8000 6001 6002"
# NOTE(ali): appended to the random part so the generated password always has upper case, lower case, a digit and a
# symbol, whatever Coolify's password rules are.
readonly COOLIFY_PASSWORD_SUFFIX=-Kb7
readonly QUALIFIED_RELEASE=24.04
readonly CHROME_ARCH=x86_64
readonly HTTP_OK=200
readonly HTTP_UNAUTHORIZED=401
readonly MCP_TOOLS_LIST='{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
readonly EXIT_INCOMPLETE=1
readonly EXIT_USAGE=64
readonly PACKAGES=(git gh tmux zsh python3 bubblewrap sqlite3 nodejs npm curl unzip apparmor-profiles apparmor-utils)
readonly CRON_DENY_FILES=(/etc/cron.deny /etc/at.deny)
# NOTE(ali): the same validation as parseTunnelToken in scripts/lib/setupReport.ts: base64 JSON with a, t (uuid), s.
readonly TUNNEL_TOKEN_PY='import base64, json, re, sys
raw = sys.stdin.read().strip()
raw += "=" * (-len(raw) % 4)
try:
    body = json.loads(base64.b64decode(raw, validate=True))
except Exception:
    sys.exit(1)
ok = isinstance(body, dict) and all(isinstance(body.get(k), str) and body[k] for k in ("a", "t", "s"))
sys.exit(0 if ok and re.fullmatch(r"[0-9a-f-]{36}", body["t"]) else 1)'
readonly JSON_PY='import json, sys
json.load(sys.stdin)'

export PATH="$SAFE_PATH"
umask 022

usage() {
  cat >&2 <<EOF
usage: $0 --sha <full commit sha> [options]

Sets up the VPS from the reviewed commit, or only checks it with --check. A second run changes nothing.

  --sha <sha>                    Reviewed commit to install the root files from (required).
  --check                        Change nothing; list what is missing.
  --admin-user <user>            Admin account added to the kanban group (default: \$SUDO_USER).
  --restart                      Restart kanban when its configuration changed (only when no card runs).
  --coolify-admin-email <email>  Install Coolify on a host without it, with this admin email.
  --coolify-lock-ports           Bind the Coolify ports 8000, 6001 and 6002 to 127.0.0.1 (once its domain works).
  --board-host <host>            Public hostname of the VPS board: installs the Cloudflare connector, sets DEV_HOST.
  --tunnel-token-stdin           Read the VPS tunnel token on stdin. Never printed.
  --tunnel-token-file <path>     Read the VPS tunnel token from a file, then delete the file.
  --mcp-host <host>              Remote MCP hostname; needs --mcp-port, --access-team-domain and --mcp-aud.
  --mcp-port <port>              Local port of the remote MCP listener.
  --access-team-domain <domain>  <team>.cloudflareaccess.com.
  --mcp-aud <aud>                AUD tag of the MCP Access application.
  --with-previews                Install the Phase B preview broker, its cleanup helper and Chrome.
  --broker-config-stdin          Read the broker config.json on stdin (only with --with-previews). Never printed.
EOF
  exit "$EXIT_USAGE"
}

sha=""
apply=1
admin_user="${SUDO_USER:-}"
allow_restart=0
coolify_email=""
coolify_lock_ports=0
board_host=""
token_stdin=0
token_file=""
mcp_host=""
mcp_port=""
team_domain=""
mcp_aud=""
with_previews=0
broker_config_stdin=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --sha | --admin-user | --coolify-admin-email | --board-host | --tunnel-token-file | --mcp-host | --mcp-port | --access-team-domain | --mcp-aud)
      [[ $# -ge 2 ]] || usage
      case "$1" in
        --sha) sha="$2" ;;
        --admin-user) admin_user="$2" ;;
        --coolify-admin-email) coolify_email="$2" ;;
        --board-host) board_host="$2" ;;
        --tunnel-token-file) token_file="$2" ;;
        --mcp-host) mcp_host="$2" ;;
        --mcp-port) mcp_port="$2" ;;
        --access-team-domain) team_domain="$2" ;;
        --mcp-aud) mcp_aud="$2" ;;
      esac
      shift 2
      ;;
    --check) apply=0 && shift ;;
    --restart) allow_restart=1 && shift ;;
    --coolify-lock-ports) coolify_lock_ports=1 && shift ;;
    --tunnel-token-stdin) token_stdin=1 && shift ;;
    --with-previews) with_previews=1 && shift ;;
    --broker-config-stdin) broker_config_stdin=1 && shift ;;
    *) usage ;;
  esac
done
readonly HOSTNAME_PATTERN='^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || usage
[[ -z "$board_host" || "$board_host" =~ $HOSTNAME_PATTERN ]] || usage
[[ -z "$mcp_host" || "$mcp_host" =~ $HOSTNAME_PATTERN ]] || usage
[[ -z "$team_domain" || "$team_domain" =~ $HOSTNAME_PATTERN ]] || usage
[[ -z "$mcp_port" || "$mcp_port" =~ ^[0-9]{2,5}$ ]] || usage
[[ -z "$mcp_aud" || "$mcp_aud" =~ ^[0-9a-f]{64}$ ]] || usage
[[ -z "$coolify_email" || "$coolify_email" =~ ^[^[:space:]@]+@[^[:space:]@]+$ ]] || usage
[[ -z "$admin_user" || "$admin_user" =~ ^[a-z_][a-z0-9_-]*$ ]] || usage
if [[ -n "$mcp_host$mcp_port$team_domain$mcp_aud" ]] && [[ -z "$mcp_host" || -z "$mcp_port" || -z "$team_domain" || -z "$mcp_aud" ]]; then
  usage
fi
if ((token_stdin + broker_config_stdin > 1)) || [[ $token_stdin -eq 1 && -n "$token_file" ]]; then
  usage
fi
if [[ $apply -eq 0 && ($token_stdin -eq 1 || -n "$token_file" || $broker_config_stdin -eq 1) ]]; then
  usage
fi
if [[ ($token_stdin -eq 1 || -n "$token_file") && -z "$board_host" ]] || [[ $broker_config_stdin -eq 1 && $with_previews -eq 0 ]]; then
  usage
fi
if [[ $EUID -ne 0 ]]; then
  echo "kanban-bootstrap: run as root" >&2
  exit 1
fi

blocking=0
restart_kanban=0
restart_broker=0
restart_connector=0
units_changed=0

report() {
  local status="$1" section="$2" label="$3" detail="${4:-}" tag
  case "$status" in
    ok) tag="ok" ;;
    changed) tag="fixed" ;;
    missing) tag="MISSING" && blocking=$((blocking + 1)) ;;
    failed) tag="FAILED" && blocking=$((blocking + 1)) ;;
    skipped) tag="skipped" ;;
    *) tag="warning" ;;
  esac
  printf '%-9s %-8s %s%s\n' "[$tag]" "$section" "$label" "${detail:+ - $detail}"
}

work="$(mktemp -d)"
cleanup() { rm -rf -- "$work"; }
trap cleanup EXIT

as_root_git() {
  env -i PATH="$SAFE_PATH" HOME=/nonexistent GIT_TERMINAL_PROMPT=0 GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null \
    git "$@"
}

as_service() {
  runuser -u "$SERVICE_USER" -- env -i -C "$SERVICE_HOME" HOME="$SERVICE_HOME" PATH="$SAFE_PATH" "$@"
}

# Fetches the reviewed commit once; every installed file is read from it, never from a release tree.
fetch_commit() {
  command -v git >/dev/null || return 1
  as_root_git init --quiet --bare "$work/repo"
  as_root_git -C "$work/repo" fetch --quiet --depth 1 "$REPO_URL" "$sha"
}

commit_file() {
  as_root_git -C "$work/repo" show "$sha:$1"
}

is_package_installed() {
  [[ "$(dpkg-query -W -f='${Status}' "$1" 2>/dev/null)" == "install ok installed" ]]
}

file_matches() {
  local source="$1" dest="$2" owner_mode="$3"
  [[ -f "$dest" && ! -L "$dest" ]] && cmp -s "$source" "$dest" && [[ "$(stat -c '%U:%G %a' "$dest")" == "$owner_mode" ]]
}

# Installs <commit path> at <dest> with root ownership and <mode> when it differs. Sets file_changed, and the
# variable named by the optional fifth argument (a restart flag) when the file changed.
ensure_commit_file() {
  local path="$1" dest="$2" mode="$3" section="$4" restart_flag="${5:-}" source="$work/files/${1//\//_}"
  file_changed=0
  mkdir -p "$work/files"
  if ! commit_file "$path" >"$source" 2>/dev/null || [[ ! -s "$source" ]]; then
    report failed "$section" "$dest" "cannot read $path at $sha"
    return 0
  fi
  if file_matches "$source" "$dest" "root:root $mode"; then
    report ok "$section" "$dest" "version of $sha"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing "$section" "$dest" "differs from $path at $sha"
    return 0
  fi
  install -d -o root -g root -m 0755 "$(dirname "$dest")"
  install -o root -g root -m "$mode" "$source" "$dest.tmp"
  mv -f -- "$dest.tmp" "$dest"
  file_changed=1
  if [[ -n "$restart_flag" ]]; then
    printf -v "$restart_flag" 1
  fi
  report changed "$section" "$dest" "installed from $sha"
}

# <owner> is user or user:group.
ensure_dir() {
  local path="$1" owner="$2" mode="$3" section="$4" user group
  user="${owner%%:*}"
  group="${owner#*:}"
  if [[ -d "$path" && ! -L "$path" && "$(stat -c '%U:%G %a' "$path")" == "$user:$group ${mode#0}" ]]; then
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing "$section" "$path" "not a $user:$group directory with mode $mode"
    return 0
  fi
  install -d -o "$user" -g "$group" -m "$mode" "$path"
  report changed "$section" "$path" "$user:$group $mode"
}

ensure_system_user() {
  local user="$1" home="$2" section="$3"
  if id -u "$user" >/dev/null 2>&1; then
    report ok "$section" "user $user"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing "$section" "user $user"
    return 0
  fi
  if [[ -n "$home" ]]; then
    useradd --system --create-home --home-dir "$home" --shell /usr/sbin/nologin "$user"
  else
    useradd --system --no-create-home --shell /usr/sbin/nologin "$user"
  fi
  report changed "$section" "user $user" "created"
}

apt_updated=0

ensure_packages() {
  local section="$1" missing=() package
  shift
  for package in "$@"; do
    is_package_installed "$package" || missing+=("$package")
  done
  if [[ ${#missing[@]} -eq 0 ]]; then
    report ok "$section" "packages" "$*"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing "$section" "packages" "${missing[*]}"
    return 0
  fi
  if [[ $apt_updated -eq 0 ]]; then
    apt-get update >/dev/null
    apt_updated=1
  fi
  DEBIAN_FRONTEND=noninteractive apt-get install -y "${missing[@]}" >/dev/null
  report changed "$section" "packages" "installed ${missing[*]}"
}

# Sets KEY=VALUE in the service environment file, replacing an existing line. Sets restart_kanban on change.
ensure_env() {
  local key="$1" value="$2" section="$3" current=""
  if [[ -f "$ENV_FILE" ]]; then
    current="$(sed -n "s/^$key=//p" "$ENV_FILE" | tail -n 1)"
  fi
  if [[ "$current" == "$value" ]]; then
    report ok "$section" "$key" "set in $ENV_FILE"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing "$section" "$key" "not set to the expected value in $ENV_FILE"
    return 0
  fi
  local temporary="$ENV_FILE.tmp"
  { grep -v "^$key=" "$ENV_FILE" || true; echo "$key=$value"; } >"$temporary"
  chmod 0600 "$temporary"
  mv -f -- "$temporary" "$ENV_FILE"
  restart_kanban=1
  report changed "$section" "$key" "set in $ENV_FILE"
}

ensure_unit_file() {
  ensure_commit_file "$1" "$2" 644 "$3" "${4:-}"
  if [[ $file_changed -eq 1 ]]; then
    units_changed=1
  fi
}

reload_units() {
  if [[ $units_changed -eq 1 ]]; then
    systemctl daemon-reload
    units_changed=0
  fi
}

ensure_enabled() {
  local unit="$1" section="$2"
  if systemctl is-enabled --quiet "$unit" 2>/dev/null && systemctl is-active --quiet "$unit"; then
    report ok "$section" "$unit" "enabled and active"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing "$section" "$unit" "not enabled and active"
    return 0
  fi
  reload_units
  if systemctl enable --now "$unit" >/dev/null 2>&1; then
    report changed "$section" "$unit" "enabled and started"
  else
    report failed "$section" "$unit" "systemctl enable --now failed: journalctl -u $unit"
  fi
}

version_at_least() {
  [[ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n 1)" == "$2" ]]
}

stage_host() {
  local release arch userns
  release="$(lsb_release -rs 2>/dev/null || echo unknown)"
  arch="$(uname -m)"
  if [[ "$release" == "$QUALIFIED_RELEASE" ]]; then
    report ok Host "Ubuntu" "$release $arch"
  else
    report warning Host "Ubuntu" "$release $arch; the fresh-host flow is qualified on $QUALIFIED_RELEASE $CHROME_ARCH"
  fi
  userns="$(sysctl -n kernel.apparmor_restrict_unprivileged_userns 2>/dev/null || echo absent)"
  report ok Host "apparmor_restrict_unprivileged_userns" "$userns"
  local listening
  listening="$(ss -tlnH 2>/dev/null | awk '$4 !~ /^(127\.|\[::1\]|::1)/ { print $4 }' | sort -u | tr '\n' ' ' || true)"
  report ok Host "public listening ports" "${listening:-none} (Docker-published ports bypass ufw)"
}

coolify_present() {
  [[ -d "$COOLIFY_SOURCE" ]] || docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$COOLIFY_CONTAINER"
}

# Downloads the official installer into the scratch directory and runs it with the admin variables, loaded from a
# root-only file so the password never sits on a command line.
run_coolify_installer() {
  local installer="$work/coolify-install.sh" admin_env="/dev/null"
  curl -fsSL "$COOLIFY_INSTALLER_URL" -o "$installer"
  echo "    Coolify installer sha256: $(sha256sum "$installer" | cut -d' ' -f1)"
  if [[ -f "$COOLIFY_ADMIN_ENV" ]]; then
    admin_env="$COOLIFY_ADMIN_ENV"
  fi
  env -i PATH="$SAFE_PATH" HOME=/root bash -c 'set -a; . "$1"; set +a; exec bash "$2"' _ "$admin_env" "$installer"
}

write_coolify_admin_env() {
  local password
  password="$(openssl rand -base64 24 | tr -d '/+=\n')$COOLIFY_PASSWORD_SUFFIX"
  install -m 0600 -o root -g root /dev/null "$COOLIFY_ADMIN_ENV"
  printf 'ROOT_USERNAME=admin\nROOT_USER_EMAIL=%s\nROOT_USER_PASSWORD=%s\n' "$coolify_email" "$password" >"$COOLIFY_ADMIN_ENV"
}

stage_coolify() {
  if coolify_present; then
    report ok Coolify "installed" "detected in $COOLIFY_SOURCE; the installer is never run again here"
    if [[ -f "$COOLIFY_ADMIN_ENV" ]]; then
      report warning Coolify "$COOLIFY_ADMIN_ENV" "move the admin password to your password manager, then delete the file"
    fi
    return 0
  fi
  if [[ -z "$coolify_email" ]]; then
    report skipped Coolify "install" "not installed; pass --coolify-admin-email to install it"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing Coolify "install" "not installed"
    return 0
  fi
  if [[ ! -f "$COOLIFY_ADMIN_ENV" ]]; then
    write_coolify_admin_env
  fi
  if run_coolify_installer; then
    report changed Coolify "install" "admin credentials in $COOLIFY_ADMIN_ENV (root, 0600): move them to your password manager, then delete the file"
  else
    report failed Coolify "install" "the official installer failed; read its output above before any rerun"
  fi
}

coolify_custom_compose() {
  cat <<'EOF'
services:
  coolify:
    ports: !override
      - "127.0.0.1:${APP_PORT:-8000}:8080"
      - "127.0.0.1:${SOKETI_PORT:-6001}:6001"
      - "127.0.0.1:6002:6002"
EOF
}

coolify_public_ports() {
  local port found=""
  for port in $COOLIFY_DIRECT_PORTS; do
    if ss -tlnH "sport = :$port" 2>/dev/null | awk '{ print $4 }' | grep -qvE '^(127\.|\[::1\]|::1)'; then
      found="$found $port"
    fi
  done
  echo "${found# }"
}

stage_coolify_ports() {
  if ! coolify_present; then
    report skipped Coolify "direct ports" "Coolify is not installed"
    return 0
  fi
  local public
  public="$(coolify_public_ports)"
  if [[ $coolify_lock_ports -eq 0 ]]; then
    if [[ -n "$public" ]]; then
      report warning Coolify "direct ports" "$public public; once the Coolify domain works, rerun with --coolify-lock-ports"
    else
      report ok Coolify "direct ports" "not public"
    fi
    return 0
  fi
  coolify_custom_compose >"$work/coolify-custom.yml"
  if cmp -s "$work/coolify-custom.yml" "$COOLIFY_CUSTOM_COMPOSE" && [[ -z "$public" ]]; then
    report ok Coolify "direct ports" "bound to 127.0.0.1 by $COOLIFY_CUSTOM_COMPOSE"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing Coolify "direct ports" "${public:-none} public; $COOLIFY_CUSTOM_COMPOSE not in place"
    return 0
  fi
  install -m 0644 -o root -g root "$work/coolify-custom.yml" "$COOLIFY_CUSTOM_COMPOSE"
  # NOTE(ali): Coolify applies docker-compose.custom.yml by rerunning its installer, which also upgrades Coolify.
  if ! run_coolify_installer; then
    report failed Coolify "direct ports" "the installer run that applies $COOLIFY_CUSTOM_COMPOSE failed"
    return 0
  fi
  public="$(coolify_public_ports)"
  if [[ -z "$public" ]]; then
    report changed Coolify "direct ports" "bound to 127.0.0.1; check the dashboard, live updates and the terminal on its domain"
  else
    report failed Coolify "direct ports" "$public still public after the installer run"
  fi
}

ensure_apparmor_profile() {
  if [[ -f "$APPARMOR_PROFILE" ]]; then
    report ok Kanban "AppArmor bwrap profile" "$APPARMOR_PROFILE"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing Kanban "AppArmor bwrap profile" "$APPARMOR_PROFILE"
    return 0
  fi
  install -m 0644 "$APPARMOR_EXTRA" "$APPARMOR_PROFILE"
  if apparmor_parser -r "$APPARMOR_PROFILE" >/dev/null 2>&1; then
    report changed Kanban "AppArmor bwrap profile" "installed and loaded"
  else
    report failed Kanban "AppArmor bwrap profile" "installed, but apparmor_parser -r $APPARMOR_PROFILE failed"
  fi
}

ensure_bun() {
  local current
  current="$(/usr/local/bin/bun --version 2>/dev/null || true)"
  if [[ "$current" == "$BUN_VERSION" ]]; then
    report ok Kanban "bun" "$current"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing Kanban "bun" "${current:-absent}, expected $BUN_VERSION"
    return 0
  fi
  curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash -s "bun-v$BUN_VERSION" >/dev/null
  report changed Kanban "bun" "installed $BUN_VERSION"
}

check_service_user_isolation() {
  local groups
  if ! groups=" $(id -nG "$SERVICE_USER" 2>/dev/null) "; then
    report skipped Kanban "isolation" "no $SERVICE_USER user yet"
    return 0
  fi
  if [[ "$groups" == *" sudo "* || "$groups" == *" docker "* ]]; then
    report failed Kanban "isolation" "$SERVICE_USER is in the sudo or docker group"
  elif sudo -l -U "$SERVICE_USER" 2>/dev/null | grep -q "may run"; then
    report failed Kanban "isolation" "sudo -l -U $SERVICE_USER lists commands"
  else
    report ok Kanban "isolation" "$SERVICE_USER has no sudo and no docker group"
  fi
}

ensure_cron_deny() {
  local file user missing=0
  for file in "${CRON_DENY_FILES[@]}"; do
    for user in "$SERVICE_USER" "$BUILD_USER"; do
      grep -qx "$user" "$file" 2>/dev/null || missing=1
    done
  done
  if [[ $missing -eq 0 ]]; then
    report ok Kanban "cron and at denied" "$SERVICE_USER, $BUILD_USER"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing Kanban "cron and at denied" "${CRON_DENY_FILES[*]}"
    return 0
  fi
  for file in "${CRON_DENY_FILES[@]}"; do
    for user in "$SERVICE_USER" "$BUILD_USER"; do
      grep -qx "$user" "$file" 2>/dev/null || echo "$user" >>"$file"
    done
  done
  report changed Kanban "cron and at denied" "${CRON_DENY_FILES[*]}"
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" && "$(stat -c '%U:%G %a' "$ENV_FILE")" == "root:root 600" ]]; then
    report ok Kanban "$ENV_FILE" "root 0600"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing Kanban "$ENV_FILE" "not a root 0600 file"
    return 0
  fi
  install -d -o root -g root -m 0755 "$(dirname "$ENV_FILE")"
  if [[ -f "$ENV_FILE" ]]; then
    chown root:root "$ENV_FILE" && chmod 0600 "$ENV_FILE"
  else
    install -m 0600 -o root -g root /dev/null "$ENV_FILE"
  fi
  report changed Kanban "$ENV_FILE" "root 0600"
}

ensure_release() {
  local current=""
  if [[ -L "$CURRENT" ]]; then
    current="$(basename "$(readlink -f "$CURRENT")")"
  fi
  if [[ "$current" == "$sha" ]]; then
    report ok Kanban "release" "$CURRENT is $sha"
    return 0
  fi
  if [[ -n "$current" ]]; then
    report warning Kanban "release" "$CURRENT is $current; to move it: sudo kanban-upgrade --sha $sha"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing Kanban "release" "$CURRENT is missing"
    return 0
  fi
  if /usr/local/sbin/kanban-release "$sha"; then
    report changed Kanban "release" "built and made current: $sha"
  else
    report failed Kanban "release" "kanban-release $sha failed"
  fi
}

ensure_admin_group() {
  if [[ -z "$admin_user" ]]; then
    report skipped Kanban "admin in group $SERVICE_USER" "no --admin-user and no SUDO_USER"
    return 0
  fi
  if id -nG "$admin_user" 2>/dev/null | tr ' ' '\n' | grep -qx "$SERVICE_USER"; then
    report ok Kanban "admin in group $SERVICE_USER" "$admin_user"
    return 0
  fi
  if [[ $apply -eq 0 ]]; then
    report missing Kanban "admin in group $SERVICE_USER" "$admin_user"
    return 0
  fi
  usermod -aG "$SERVICE_USER" "$admin_user"
  report changed Kanban "admin in group $SERVICE_USER" "$admin_user added: log out and back in"
}

check_logins() {
  if as_service gh auth status >/dev/null 2>&1; then
    report ok Kanban "GitHub login" "gh auth status succeeds as $SERVICE_USER"
  else
    report missing Kanban "GitHub login" "log in as $SERVICE_USER (docs/vps-install.md A4)"
  fi
  if [[ -d "$SERVICE_HOME/.codex/skills" && -L "$SERVICE_HOME/.claude/skills" ]]; then
    report ok Kanban "skills" "$SERVICE_HOME/.codex/skills, linked from .claude/skills"
  else
    report missing Kanban "skills" "copy them from the Mac (docs/vps-install.md A4)"
  fi
  report warning Kanban "Claude and Codex logins" "not checked here: Settings > Fournisseurs on the board (docs/vps-install.md A4)"
}

stage_kanban() {
  ensure_packages Kanban "${PACKAGES[@]}"
  ensure_apparmor_profile
  ensure_bun
  ensure_system_user "$SERVICE_USER" "$SERVICE_HOME" Kanban
  ensure_system_user "$BUILD_USER" "$BUILD_HOME" Kanban
  local dir
  for dir in data tmp projects backups; do
    ensure_dir "$SERVICE_HOME/$dir" "$SERVICE_USER" 0700 Kanban
  done
  ensure_env_file
  ensure_cron_deny
  check_service_user_isolation
  ensure_commit_file deploy/vps/kanban-release.sh /usr/local/sbin/kanban-release 755 Kanban
  ensure_commit_file deploy/vps/kanban-upgrade.sh /usr/local/sbin/kanban-upgrade 755 Kanban
  ensure_commit_file deploy/vps/kanban-bridge /usr/local/bin/kanban-bridge 755 Kanban
  ensure_commit_file deploy/vps/kanban-bootstrap.sh /usr/local/sbin/kanban-bootstrap 755 Kanban
  ensure_unit_file deploy/vps/kanban.service /etc/systemd/system/kanban.service Kanban restart_kanban
  ensure_release
  ensure_admin_group
}

read_tunnel_token() {
  if [[ $token_stdin -eq 1 ]]; then
    cat
  elif [[ -n "$token_file" ]]; then
    cat -- "$token_file"
    rm -f -- "$token_file"
  fi
}

ensure_connector_token() {
  local token=""
  token="$(read_tunnel_token | tr -d '[:space:]' || true)"
  if [[ -n "$token" ]]; then
    if ! python3 -I -c "$TUNNEL_TOKEN_PY" <<<"$token"; then
      report failed Access "tunnel token" "the input is not a Cloudflare tunnel token (nothing written)"
      return 0
    fi
    if [[ ! -f "$CONNECTOR_TOKEN" ]] || [[ "$(cat "$CONNECTOR_TOKEN")" != "$token" ]]; then
      (umask 077 && printf '%s\n' "$token" >"$work/tunnel.token")
      install -m 0600 -o "$CONNECTOR_USER" -g "$CONNECTOR_USER" "$work/tunnel.token" "$CONNECTOR_TOKEN"
      restart_connector=1
      report changed Access "tunnel token" "stored in $CONNECTOR_TOKEN"
      return 0
    fi
  fi
  if [[ -s "$CONNECTOR_TOKEN" && "$(stat -c '%U:%G %a' "$CONNECTOR_TOKEN")" == "$CONNECTOR_USER:$CONNECTOR_USER 600" ]]; then
    report ok Access "tunnel token" "$CONNECTOR_TOKEN ($CONNECTOR_USER, 0600)"
  else
    report missing Access "tunnel token" "pipe it with --tunnel-token-stdin (docs/vps-bootstrap.md)"
  fi
}

ensure_cloudflared_package() {
  if ! is_package_installed cloudflared && [[ $apply -eq 1 ]]; then
    install -d -m 0755 "$(dirname "$CLOUDFLARE_KEYRING")"
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o "$CLOUDFLARE_KEYRING"
    echo "$CLOUDFLARE_REPO_LINE" >"$CLOUDFLARE_LIST"
    apt_updated=0
  fi
  ensure_packages Access cloudflared
  local version
  version="$(cloudflared --version 2>/dev/null | grep -oE '[0-9]{4}\.[0-9]+\.[0-9]+' | head -n 1 || true)"
  if [[ -n "$version" ]] && version_at_least "$version" "$MIN_CLOUDFLARED_VERSION"; then
    report ok Access "cloudflared version" "$version"
  elif [[ -n "$version" ]]; then
    report failed Access "cloudflared version" "$version is older than $MIN_CLOUDFLARED_VERSION, needed for --token-file"
  fi
}

stage_access() {
  if [[ -z "$board_host" ]]; then
    report skipped Access "Cloudflare connector" "no --board-host"
    return 0
  fi
  ensure_cloudflared_package
  ensure_system_user "$CONNECTOR_USER" "" Access
  # NOTE(ali): root owns the directory so the cloudflared user cannot plant a symlink where root writes the token.
  ensure_dir "$CONNECTOR_DIR" "root:$CONNECTOR_USER" 0750 Access
  ensure_connector_token
  ensure_unit_file deploy/vps/cloudflared-kanban.service "/etc/systemd/system/$CONNECTOR_SERVICE.service" Access restart_connector
  ensure_env DEV_HOST "$board_host" Access
}

stage_mcp() {
  if [[ -z "$mcp_host" ]]; then
    report skipped MCP "remote MCP" "no --mcp-host"
    return 0
  fi
  ensure_packages MCP ripgrep
  ensure_env KANBAN_REMOTE_MCP_PORT "$mcp_port" MCP
  ensure_env KANBAN_REMOTE_MCP_HOSTNAME "$mcp_host" MCP
  ensure_env KANBAN_REMOTE_MCP_ACCESS_TEAM_DOMAIN "$team_domain" MCP
  ensure_env KANBAN_REMOTE_MCP_ACCESS_AUD "$mcp_aud" MCP
}

ensure_broker_config() {
  if [[ $broker_config_stdin -eq 1 ]]; then
    cat >"$work/broker-config.json"
    if ! python3 -I -c "$JSON_PY" <"$work/broker-config.json" 2>/dev/null; then
      report failed Previews "$BROKER_CONFIG" "stdin is not valid JSON (nothing written)"
      return 0
    fi
    if ! cmp -s "$work/broker-config.json" "$BROKER_CONFIG"; then
      install -m 0600 -o root -g root "$work/broker-config.json" "$BROKER_CONFIG.tmp"
      mv -f -- "$BROKER_CONFIG.tmp" "$BROKER_CONFIG"
      restart_broker=1
      report changed Previews "$BROKER_CONFIG" "written (root 0600)"
      return 0
    fi
  fi
  commit_file deploy/preview-broker/config.example.json >"$work/broker-example.json" 2>/dev/null || true
  if [[ ! -f "$BROKER_CONFIG" ]]; then
    if [[ $apply -eq 1 && -s "$work/broker-example.json" ]]; then
      install -m 0600 -o root -g root "$work/broker-example.json" "$BROKER_CONFIG"
      report missing Previews "$BROKER_CONFIG" "example installed: fill it (docs/vps-install.md B1), then rerun"
    else
      report missing Previews "$BROKER_CONFIG" "absent; pipe it with --broker-config-stdin"
    fi
  elif cmp -s "$work/broker-example.json" "$BROKER_CONFIG"; then
    report missing Previews "$BROKER_CONFIG" "still the example: fill it (docs/vps-install.md B1)"
  elif [[ "$(stat -c '%U:%G %a' "$BROKER_CONFIG")" != "root:root 600" ]]; then
    report failed Previews "$BROKER_CONFIG" "not root 0600"
  else
    report ok Previews "$BROKER_CONFIG" "root 0600"
  fi
}

ensure_browser() {
  if [[ "$(uname -m)" != "$CHROME_ARCH" ]]; then
    report warning Previews "Chrome" "Google Chrome exists for $CHROME_ARCH only: quality validation has no browser here"
    return 0
  fi
  if command -v google-chrome >/dev/null; then
    report ok Previews "Chrome" "$(google-chrome --version 2>/dev/null)"
  elif [[ $apply -eq 0 ]]; then
    report missing Previews "Chrome" "not installed"
  elif (cd "$work" && npx -y "$PLAYWRIGHT" install --with-deps chrome) >/dev/null 2>&1; then
    report changed Previews "Chrome" "installed with playwright"
  else
    report failed Previews "Chrome" "npx $PLAYWRIGHT install --with-deps chrome failed"
  fi
  if (cd /tmp && as_service npx --offline -y "$PLAYWRIGHT_MCP" --help) >/dev/null 2>&1; then
    report ok Previews "Playwright MCP cache" "$PLAYWRIGHT_MCP cached for $SERVICE_USER"
  elif [[ $apply -eq 0 ]]; then
    report missing Previews "Playwright MCP cache" "$PLAYWRIGHT_MCP not cached for $SERVICE_USER"
  elif (cd /tmp && as_service npx -y "$PLAYWRIGHT_MCP" --help) >/dev/null 2>&1; then
    report changed Previews "Playwright MCP cache" "$PLAYWRIGHT_MCP cached for $SERVICE_USER"
  else
    report failed Previews "Playwright MCP cache" "npx $PLAYWRIGHT_MCP --help failed as $SERVICE_USER"
  fi
}

stage_previews() {
  if [[ $with_previews -eq 0 ]]; then
    report skipped Previews "Phase B" "no --with-previews"
    return 0
  fi
  if ! coolify_present; then
    report missing Previews "Coolify" "install it first (--coolify-admin-email)"
  fi
  ensure_system_user "$PREVIEW_USER" "" Previews
  local file
  for file in deploy/preview-broker/broker.ts deploy/preview-broker/kanban-preview-cleanup.py src/server/system/previewCleanup.py; do
    ensure_commit_file "$file" "$BROKER_DIR/$(basename "$file")" 644 Previews restart_broker
  done
  ensure_dir "$BROKER_CONFIG_DIR" root:root 0755 Previews
  ensure_broker_config
  for file in kanban-preview-broker.service kanban-preview-cleanup.socket kanban-preview-cleanup@.service; do
    ensure_unit_file "deploy/vps/$file" "/etc/systemd/system/$file" Previews restart_broker
  done
  ensure_unit_file deploy/vps/kanban.service.d/preview-broker.conf /etc/systemd/system/kanban.service.d/preview-broker.conf Previews restart_kanban
  ensure_browser
  if as_service cat "$BROKER_CONFIG" >/dev/null 2>&1; then
    report failed Previews "broker config isolation" "$SERVICE_USER can read $BROKER_CONFIG"
  else
    report ok Previews "broker config isolation" "$SERVICE_USER cannot read $BROKER_CONFIG"
  fi
  report warning Previews "Coolify side" "API enabled, IP allowlist, token, source and board settings stay manual (docs/vps-bootstrap.md)"
}

# Starts what is not running and restarts only what changed: kanban only with --restart, since it stops running cards.
apply_services() {
  [[ $apply -eq 1 ]] || return 0
  reload_units
  if [[ -L "$CURRENT" ]]; then
    if ! systemctl is-active --quiet "$SERVICE"; then
      ensure_enabled "$SERVICE" Services
    elif [[ $restart_kanban -eq 1 && $allow_restart -eq 1 ]]; then
      systemctl restart "$SERVICE"
      report changed Services "$SERVICE" "restarted for the new configuration"
    elif [[ $restart_kanban -eq 1 ]]; then
      report missing Services "$SERVICE" "configuration changed: when no card runs, rerun with --restart"
    fi
  fi
  if [[ $with_previews -eq 1 && -f "$BROKER_CONFIG" ]]; then
    ensure_enabled "$CLEANUP_SOCKET" Services
    ensure_enabled "$BROKER_SERVICE" Services
    if [[ $restart_broker -eq 1 ]]; then
      systemctl restart "$BROKER_SERVICE"
      report changed Services "$BROKER_SERVICE" "restarted"
    fi
  fi
  if [[ -n "$board_host" && -s "$CONNECTOR_TOKEN" ]]; then
    ensure_enabled "$CONNECTOR_SERVICE" Services
    if [[ $restart_connector -eq 1 ]]; then
      systemctl restart "$CONNECTOR_SERVICE"
      report changed Services "$CONNECTOR_SERVICE" "restarted"
    fi
  fi
}

service_port() {
  local port
  port="$(sed -n 's/^PORT=//p' "$ENV_FILE" 2>/dev/null | tail -n 1 || true)"
  [[ "$port" =~ ^[0-9]+$ ]] && echo "$port" || echo "$DEFAULT_PORT"
}

socket_status() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 5 --unix-socket "$UI_SOCKET" -H "Host: $1" "http://$1/health" || true
}

final_checks() {
  if ! systemctl is-active --quiet "$SERVICE"; then
    report failed Checks "$SERVICE" "not active: journalctl -u $SERVICE"
    return 0
  fi
  local body
  body="$(curl -fsS --max-time 5 "http://127.0.0.1:$(service_port)/health" 2>/dev/null || true)"
  if [[ "$body" == *'"ok":true'* ]]; then
    report ok Checks "/health" "healthy"
  else
    report failed Checks "/health" "not healthy on 127.0.0.1:$(service_port)"
  fi
  local code
  code="$(socket_status localhost)"
  if [[ "$code" == "$HTTP_OK" ]]; then
    report ok Checks "ui.sock" "/health answers $HTTP_OK"
  else
    report failed Checks "ui.sock" "/health answers ${code:-nothing}"
  fi
  if [[ -n "$board_host" ]]; then
    code="$(socket_status "$board_host")"
    if [[ "$code" == "$HTTP_OK" ]]; then
      report ok Checks "DEV_HOST" "the service accepts Host: $board_host"
    else
      report failed Checks "DEV_HOST" "Host: $board_host answers ${code:-nothing}: restart kanban when idle"
    fi
  fi
  if [[ -n "$mcp_host" ]]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -X POST -H "Host: $mcp_host" -H 'Content-Type: application/json' \
      -H 'Accept: application/json, text/event-stream' --data "$MCP_TOOLS_LIST" "http://127.0.0.1:$mcp_port/mcp" || true)"
    if [[ "$code" == "$HTTP_UNAUTHORIZED" ]]; then
      report ok Checks "remote MCP listener" "POST without an Access assertion answers $HTTP_UNAUTHORIZED"
    else
      report failed Checks "remote MCP listener" "POST without an Access assertion answers ${code:-nothing}, expected $HTTP_UNAUTHORIZED"
    fi
  fi
  local bridge_version
  bridge_version="$(/usr/local/bin/kanban-bridge program-version 2>/dev/null || true)"
  report ok Checks "bridge program" "version ${bridge_version:-absent}"
}

echo "kanban-bootstrap $([[ $apply -eq 1 ]] && echo setup || echo check) from $sha"
if ! fetch_commit; then
  if [[ $apply -eq 1 ]] && ! command -v git >/dev/null; then
    apt-get update >/dev/null
    DEBIAN_FRONTEND=noninteractive apt-get install -y git >/dev/null
  fi
  fetch_commit || {
    echo "kanban-bootstrap: cannot fetch $sha from $REPO_URL" >&2
    exit 1
  }
fi
stage_host
stage_coolify
stage_kanban
check_logins
stage_access
stage_mcp
stage_previews
stage_coolify_ports
apply_services
final_checks

echo
echo "Manual steps: Google OAuth client, provider logins, Coolify token and source, Access MFA enrollment, qualification (docs/vps-bootstrap.md)."
if ((blocking > 0)); then
  echo "$blocking item(s) missing or failing."
  exit "$EXIT_INCOMPLETE"
fi
echo "Everything is in place."
