#!/usr/bin/env bash
# Builds a reviewed commit into /opt/kanban/releases/<sha> and, unless --build-only, makes it current.
# Installed as /usr/local/sbin/kanban-release from a reviewed commit only (docs/vps-install.md); it never
# updates itself from a release.
set -euo pipefail

readonly DEFAULT_REPO_URL=https://github.com/Antune-L/atelier.git
readonly RELEASES=/opt/kanban/releases
readonly CURRENT=/opt/kanban/current
readonly BUILD_USER=kanban-build
readonly BUILD_ROOT=/var/lib/kanban-release-build
readonly BUILD_PATH=/usr/local/bin:/usr/bin:/bin
# Same filter as kanban.service: the build reaches the internet, never the internal network (Docker, Coolify).
readonly BUILD_IP_DENY="169.254.0.0/16 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 fe80::/10 fc00::/7"

usage() {
  echo "usage: $0 <full 40-character commit sha>" >&2
  echo "       $0 --build-only <full 40-character commit sha>" >&2
  exit 64
}

build_only=0
if [[ "${1:-}" == "--build-only" ]]; then
  build_only=1
  shift
fi
[[ $# -eq 1 ]] || usage
sha="$1"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || usage
if [[ $EUID -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi
# --build-only is the kanban-upgrade path: the repository is hard-coded there, never taken from the environment.
if [[ $build_only -eq 1 ]]; then
  repo_url="$DEFAULT_REPO_URL"
else
  repo_url="${KANBAN_REPO_URL:-$DEFAULT_REPO_URL}"
fi

target="$RELEASES/$sha"
work="$BUILD_ROOT/$sha"

kill_builder() {
  pkill -KILL -u "$BUILD_USER" || true
  while pgrep -u "$BUILD_USER" >/dev/null; do sleep 0.2; done
}

cleanup() {
  kill_builder
  rm -rf "$work" "$target.tmp"
}

# Each step runs in a transient unit: when it exits, systemd kills its whole cgroup, even on failure.
as_builder() {
  systemd-run --quiet --wait --pipe --collect --service-type=exec \
    -p User="$BUILD_USER" -p Group="$BUILD_USER" -p WorkingDirectory="$work" \
    -p "IPAddressDeny=$BUILD_IP_DENY" -p KillMode=control-group \
    -p PrivateTmp=yes -p NoNewPrivileges=yes \
    -E HOME="$work" -E PATH="$BUILD_PATH" \
    -- "$@"
}

if [[ ! -d "$target" ]]; then
  if [[ -L "$BUILD_ROOT" || -L "$RELEASES" ]]; then
    echo "refusing a symlinked build or release directory" >&2
    exit 1
  fi
  install -d -o root -g root -m 0755 "$BUILD_ROOT"
  trap cleanup EXIT
  rm -rf "$work"
  install -d -o "$BUILD_USER" -g "$BUILD_USER" -m 0700 "$work"
  as_builder git clone --quiet --no-checkout "$repo_url" repo
  as_builder git -C repo -c advice.detachedHead=false checkout --quiet "$sha"
  as_builder bun install --cwd repo --frozen-lockfile --ignore-scripts
  as_builder bun run --cwd repo build:web
  kill_builder
  install -d -o root -g root -m 0755 "$RELEASES"
  rm -rf "$target.tmp"
  cp -a --no-preserve=ownership "$work/repo" "$target.tmp"
  rm -rf "$target.tmp/.git"
  chown -R -h root:root "$target.tmp"
  chmod -R go-w,a+rX "$target.tmp"
  mv "$target.tmp" "$target"
  rm -rf "$work"
  trap - EXIT
fi
if [[ $build_only -eq 1 ]]; then
  echo "Release $sha is built in $target. Current release unchanged."
  exit 0
fi
ln -sfn "$target" "$CURRENT.tmp"
mv -T "$CURRENT.tmp" "$CURRENT"
echo "Release $sha is current. Restart with: systemctl restart kanban"
