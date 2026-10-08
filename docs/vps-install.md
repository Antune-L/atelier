# Running Kanban on a VPS

This guide installs a second, independent Kanban instance on an Ubuntu 24.04 VPS that already runs Coolify. Cards created on the VPS board keep running while the Mac is off.

Two phases:
- **Phase A** runs ordinary cards in PR-only mode, without previews.
- **Phase B** adds Devin cards with Coolify previews on the same VPS, through a preview broker.

## What protects what

- The service and its agents run as `kanban`, a user with no sudo, no docker group and no SSH key. Agents can read the service's data and provider logins, but nothing on the VPS that leads to root.
- The interface is only reachable through a Unix socket that you open with an SSH tunnel. No port is published.
- On this host (`KANBAN_HOST_ROLE=cloud`), Kanban refuses every merge and direct push: cards end with a pull request that you merge yourself.
- Only one host runs quality validations and Devin cards. Set this in **Settings → Agents par défaut → Validation qualité sur ce poste** on each host.
- In Phase B, the Coolify token lives in the preview broker, under the `kanban-preview` user. The broker only creates Dockerfile previews from its own configuration and only touches resources it created. A root helper cleans leftovers after checking the broker's registry.

Not covered: agents on the Mac can still reach the VPS through your own SSH key. Kernel, Docker or Coolify vulnerabilities remain a residual risk.

Placeholders: `<vps>` is the VPS address and `<ssh-port>` its SSH port. All VPS commands run as your admin account.

## 0. Check the host

```bash
uname -m
lsb_release -ds
sysctl kernel.apparmor_restrict_unprivileged_userns
sudo ss -tlnp
```

Note the architecture: browser validation in Phase B uses Google Chrome, available on `x86_64` only. Review the listening ports. Docker-published ports bypass `ufw`, so keep the Coolify dashboard behind its own authentication.

## Phase A

### A1. System packages, sandbox and Bun

```bash
sudo apt update && sudo apt install -y git gh tmux zsh python3 bubblewrap sqlite3 nodejs npm curl unzip apparmor-profiles apparmor-utils
sudo install -m 0644 /usr/share/apparmor/extra-profiles/bwrap-userns-restrict /etc/apparmor.d/bwrap-userns-restrict
sudo apparmor_parser -r /etc/apparmor.d/bwrap-userns-restrict
curl -fsSL https://bun.sh/install | sudo BUN_INSTALL=/usr/local bash -s "bun-v1.3.14"
```

The AppArmor profile lets the Codex sandbox (bubblewrap) work without disabling the user-namespace restriction for the whole host.

### A2. Users and directories

```bash
sudo useradd --system --create-home --home-dir /var/lib/kanban --shell /usr/sbin/nologin kanban
sudo useradd --system --create-home --home-dir /var/lib/kanban-build --shell /usr/sbin/nologin kanban-build
sudo install -d -o kanban -g kanban -m 0700 /var/lib/kanban/data /var/lib/kanban/tmp /var/lib/kanban/projects /var/lib/kanban/backups
sudo install -d -o root -g root -m 0755 /opt/kanban /etc/kanban
sudo install -m 0600 -o root -g root /dev/null /etc/kanban/kanban.env
echo kanban | sudo tee -a /etc/cron.deny /etc/at.deny
```

Then check that `kanban` has no extra power: `sudo -l -U kanban` must list nothing and `id kanban` must show no `sudo` or `docker` group.

### A3. Install a release

Copy `deploy/vps/kanban-release.sh` from the repository to `/usr/local/sbin/kanban-release`, then build a reviewed commit of `main`:

```bash
sudo install -m 0755 kanban-release.sh /usr/local/sbin/kanban-release
sudo kanban-release <full-commit-sha>
```

The script builds as `kanban-build` with `bun install --frozen-lockfile --ignore-scripts`, copies the result to `/opt/kanban/releases/<sha>` owned by root, then points `/opt/kanban/current` at it.

### A4. Logins for the `kanban` user

**GitHub.** Create a fine-grained token on your account, limited to the repositories this VPS works on, with these repository permissions:
- Contents: read and write.
- Pull requests: read and write.
- Issues: read and write.
- Checks, Commit statuses and Actions: read.

Leave Workflows unset, so agents cannot change `.github/workflows`. For an organization repository where you are only a collaborator, a classic token with the `repo` scope is the fallback; it opens every repository your account can reach.

```bash
sudo -u kanban -H gh auth login --hostname github.com --with-token < gh-token.txt
sudo -u kanban -H gh auth setup-git
sudo -u kanban -H git config --global user.name "Your Name"
sudo -u kanban -H git config --global user.email "you@example.com"
```

Delete `gh-token.txt` afterwards.

**Codex.** Device login must be enabled in your ChatGPT security settings.

```bash
sudo -u kanban -H /opt/kanban/current/node_modules/.bin/codex login --device-auth
```

**Claude.** On the Mac, run `claude setup-token` and copy the token. On the VPS, add one line `CLAUDE_CODE_OAUTH_TOKEN=<token>` to `/etc/kanban/kanban.env` with `sudo nano /etc/kanban/kanban.env`.

**Skills.** On the Mac:

```bash
tar -C ~/.codex/skills -czhf /tmp/kanban-skills.tgz argus-review regression-check minos-pr-feedback mockup-fidelity-review simplifier
scp -P <ssh-port> /tmp/kanban-skills.tgz <vps>:/tmp/
```

On the VPS:

```bash
sudo -u kanban mkdir -p /var/lib/kanban/.codex/skills /var/lib/kanban/.claude
sudo -u kanban tar -C /var/lib/kanban/.codex/skills -xzf /tmp/kanban-skills.tgz
sudo -u kanban ln -sfn /var/lib/kanban/.codex/skills /var/lib/kanban/.claude/skills
```

**Project clone.**

```bash
sudo -u kanban -H git clone https://github.com/Antune-L/atelier.git /var/lib/kanban/projects/atelier
```

### A5. Start the service

Copy `deploy/vps/kanban.service` to `/etc/systemd/system/`, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kanban
sudo systemctl status kanban --no-pager
sudo journalctl -u kanban -n 50 --no-pager
```

Let your admin account open the interface socket: `sudo usermod -aG kanban "$USER"`, then log out and back in.

### A6. Open the board from the Mac

```bash
ssh -N -L 52819:/run/kanban/ui.sock -p <ssh-port> <vps>
```

Open http://localhost:52819. Then, on the VPS board:
1. Add the project with the path `/var/lib/kanban/projects/atelier`.
2. In **Settings → Agents par défaut**, turn off **Validation qualité sur ce poste**. The Mac stays the quality owner in Phase A.
3. In **Settings → Fournisseurs** and **Settings → Skills**, check that Claude, Codex and the skills are detected.

### A7. Acceptance checks

- From the Mac, `curl -s -o /dev/null -w '%{http_code}\n' http://<vps>:52817/health` fails to connect: nothing is published.
- On the VPS, `curl -s http://127.0.0.1:52817/api/settings` returns `forbidden`: the API only answers on the socket.
- A card created with auto-merge or direct push is refused. A normal card ends with an open pull request, with your Mac off.
- `sudo systemctl restart kanban` interrupts the running card, which can be resumed without a duplicate PR.

## Phase B: previews through the broker

Prerequisites: Phase A works, a Coolify API token with the `write` and `deploy` permissions (not `root`), and the kanban-agents preview recipe (`Dockerfile.preview`).

### B1. Broker user, files and configuration

```bash
sudo useradd --system --no-create-home --home-dir /var/lib/kanban-preview --shell /usr/sbin/nologin kanban-preview
sudo install -d -o root -g root -m 0755 /opt/kanban-preview /etc/kanban-preview
sudo install -m 0644 /opt/kanban/current/deploy/preview-broker/broker.ts /opt/kanban/current/deploy/preview-broker/kanban-preview-cleanup.py /opt/kanban/current/src/server/system/previewCleanup.py /opt/kanban-preview/
sudo install -m 0600 -o root -g root /opt/kanban/current/deploy/preview-broker/config.example.json /etc/kanban-preview/config.json
sudo nano /etc/kanban-preview/config.json
```

Fill in the Coolify URL, token, server, project, environment name, preview domain and, for each project, the repository and its Coolify source (`github_app`, `deploy_key` or `public` with its uuid). The project key must match the project key on the VPS board. The broker copies are only updated when you run the `install` line again, never by a release upgrade.

### B2. Units

Copy `kanban-preview-broker.service`, `kanban-preview-cleanup.socket` and `kanban-preview-cleanup@.service` to `/etc/systemd/system/`, and `kanban.service.d/preview-broker.conf` to `/etc/systemd/system/kanban.service.d/`. Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kanban-preview-cleanup.socket kanban-preview-broker.service
sudo systemctl restart kanban
sudo journalctl -u kanban-preview-broker -n 20 --no-pager
```

### B3. Preview settings on the VPS board

In **Settings → Coolify**, fill in the same Coolify URL, server, project, environment and domain as the broker, plus the preview username and password. Leave the token and SSH alias empty: the broker holds the token and performs the cleanup. Enable previews for the project with the recipe `.coolify/preview.json` (the Dockerfile recipe). Compose recipes are refused on this host.

### B4. Make the VPS the quality owner

When no validation is running on either host:
1. On the Mac, turn off **Validation qualité sur ce poste**.
2. On the VPS, turn it on.

Devin cards then run on the VPS and stay unavailable on the Mac.

### B5. Browser for quality validation (x86_64)

```bash
sudo npx -y playwright install --with-deps chrome
sudo -u kanban -H npx -y @playwright/mcp@0.0.83 --help
```

The second command caches the pinned Playwright MCP for the `kanban` user, because quality validation runs it offline.

### B6. Acceptance checks

- A Devin card gets a ready preview, then the preview is stopped and cleaned completely.
- `sudo cat /var/lib/kanban-preview/registry.json` lists the preview with `deletedAt` set after cleanup.
- `sudo -u kanban cat /etc/kanban-preview/config.json` is refused.

## Upgrade

1. Check that no card, quality validation or preview is running on the VPS board.
2. Back up, then stop the service:

   ```bash
   sudo -u kanban sqlite3 /var/lib/kanban/data/kanban.db "VACUUM INTO '/var/lib/kanban/backups/kanban-$(date +%F-%H%M).db'"
   sudo systemctl stop kanban
   ```

3. Install the new release, then start the service again:

   ```bash
   sudo kanban-release <full-commit-sha>
   sudo systemctl start kanban
   ```

Roll back by running `kanban-release` with the previous commit, but only if the database schema is compatible. Never restore an older database after new pull requests or previews were created.
