#!/usr/bin/env bash
set -euo pipefail

readonly REPO_URL="${KANBAN_REPO_URL:-https://github.com/Antune-L/atelier.git}"
readonly RELEASES=/opt/kanban/releases
readonly CURRENT=/opt/kanban/current
readonly BUILD_USER=kanban-build
readonly BUILD_ROOT=/var/lib/kanban-release-build
readonly BUILD_PATH=/usr/local/bin:/usr/bin:/bin

sha="${1:-}"
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: $0 <full 40-character commit sha>" >&2
  exit 64
fi
if [[ $EUID -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi

target="$RELEASES/$sha"
if [[ ! -d "$target" ]]; then
  work="$BUILD_ROOT/$sha"
  if [[ -L "$BUILD_ROOT" || -L "$RELEASES" ]]; then
    echo "refusing a symlinked build or release directory" >&2
    exit 1
  fi
  install -d -o root -g root -m 0755 "$BUILD_ROOT"
  rm -rf "$work"
  install -d -o "$BUILD_USER" -g "$BUILD_USER" -m 0700 "$work"
  as_builder() { runuser -u "$BUILD_USER" -- env -i -C "$work" HOME="$work" PATH="$BUILD_PATH" "$@"; }
  as_builder git clone --quiet --no-checkout "$REPO_URL" repo
  as_builder git -C repo -c advice.detachedHead=false checkout --quiet "$sha"
  as_builder bun install --cwd repo --frozen-lockfile --ignore-scripts
  as_builder bun run --cwd repo build:web
  pkill -KILL -u "$BUILD_USER" || true
  while pgrep -u "$BUILD_USER" >/dev/null; do sleep 0.2; done
  install -d -o root -g root -m 0755 "$RELEASES"
  rm -rf "$target.tmp"
  cp -a --no-preserve=ownership "$work/repo" "$target.tmp"
  rm -rf "$target.tmp/.git"
  chown -R -h root:root "$target.tmp"
  chmod -R go-w,a+rX "$target.tmp"
  mv "$target.tmp" "$target"
  rm -rf "$work"
fi
ln -sfn "$target" "$CURRENT.tmp"
mv -T "$CURRENT.tmp" "$CURRENT"
echo "Release $sha is current. Restart with: systemctl restart kanban"
