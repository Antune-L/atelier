# Running Kanban on a VPS

This guide installs a second, independent Kanban instance on an Ubuntu 24.04 or 26.04 VPS that already runs Coolify. Cards created on the VPS board keep running while the Mac is off.

Two phases:
- **Phase A** runs ordinary cards in PR-only mode, without previews.
- **Phase B** adds Devin cards with Coolify previews on the same VPS, through a preview broker.

## What protects what

- The service and its agents run as `kanban`, a user with no sudo, no docker group and no SSH key. Agents can read the service's data and provider logins, but nothing on the VPS that leads to root.
- The interface is only reachable through a Unix socket that you open with an SSH tunnel. No port is published. To open it from any device instead, see [vps-remote-access.md](./vps-remote-access.md).
- On this host (`KANBAN_HOST_ROLE=cloud`), Kanban refuses every automatic merge and direct push: auto-merge, direct push, autonomous merge delivery and the re-merge after a conflict resolution. Cards end with a pull request that you merge yourself, either on the forge or with the **Merger la PR** button on the board, which stays allowed. The board hides the refused options on this host.
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
[ -f /etc/apparmor.d/bwrap-userns-restrict ] || sudo install -m 0644 /usr/share/apparmor/extra-profiles/bwrap-userns-restrict /etc/apparmor.d/bwrap-userns-restrict
sudo apparmor_parser -r /etc/apparmor.d/bwrap-userns-restrict
curl -fsSL https://bun.sh/install | sudo BUN_INSTALL=/usr/local bash -s "bun-v1.3.14"
```

The AppArmor profile lets the Codex sandbox (bubblewrap) work without disabling the user-namespace restriction for the whole host. Ubuntu 26.04 already ships it in `/etc/apparmor.d`; Ubuntu 24.04 needs the copy from `apparmor-profiles`.

### A2. Users and directories

```bash
sudo useradd --system --create-home --home-dir /var/lib/kanban --shell /usr/sbin/nologin kanban
sudo useradd --system --create-home --home-dir /var/lib/kanban-build --shell /usr/sbin/nologin kanban-build
sudo install -d -o kanban -g kanban -m 0700 /var/lib/kanban/data /var/lib/kanban/tmp /var/lib/kanban/projects /var/lib/kanban/backups
sudo install -d -o root -g root -m 0755 /opt/kanban /etc/kanban
sudo install -m 0600 -o root -g root /dev/null /etc/kanban/kanban.env
printf 'kanban\nkanban-build\n' | sudo tee -a /etc/cron.deny /etc/at.deny
```

Then check that `kanban` has no extra power: `sudo -l -U kanban` must list nothing and `id kanban` must show no `sudo` or `docker` group.

### A3. Install the root scripts and a release

Files that root executes or loads (the release and upgrade scripts, the systemd units, the preview broker and its cleanup helper) are installed from a commit you reviewed, never from `/opt/kanban/current`: an upgrade deploys whatever `main` holds, so root only runs code you read at install time. Keep an admin review clone in your own account, outside `/var/lib/kanban`:

```bash
git clone https://github.com/Antune-L/atelier.git ~/kanban-admin
git -C ~/kanban-admin fetch
git -C ~/kanban-admin log --oneline origin/main
```

Pick the reviewed commit, set `sha=<full-commit-sha>`, then install the two scripts from it and build the release:

```bash
git -C ~/kanban-admin show "$sha:deploy/vps/kanban-release.sh" | sudo install -m 0755 -o root -g root /dev/stdin /usr/local/sbin/kanban-release
git -C ~/kanban-admin show "$sha:deploy/vps/kanban-upgrade.sh" | sudo install -m 0755 -o root -g root /dev/stdin /usr/local/sbin/kanban-upgrade
sudo kanban-release "$sha"
```

`kanban-release` runs each build step (`git clone`, `bun install --frozen-lockfile --ignore-scripts`, `bun run build:web`) as `kanban-build` in a transient systemd unit with the same `IPAddressDeny` filter as `kanban.service`: the build reaches GitHub and the npm registry, not Docker or Coolify, and systemd kills every process of a step when it ends, even on failure. The result is copied to `/opt/kanban/releases/<sha>` owned by root, then `/opt/kanban/current` points at it. `kanban-release --build-only <sha>` builds the release without switching `current`; it always uses the hard-coded repository URL and ignores `KANBAN_REPO_URL`.

`kanban-release` and `kanban-upgrade` never update themselves from a release. To update them, rerun the two `install` lines with a newly reviewed `sha`.

### A4. Logins for the `kanban` user

**GitHub.** Open a terminal on the VPS under the `kanban` OS user. Start the [interactive browser login documented by gh](https://cli.github.com/manual/gh_auth_login) there, choose the repository host and use the intended GitHub identity in the browser. Complete the flow initiated on the server: opening a token page or logging in on your client alone does not authenticate the server.

Alternatively, create a token and configure gh manually outside Kanban. The stdin-based login below is for a **classic** token: gh documents minimum scopes `repo`, `read:org`, and `gist`. A classic `repo` scope can reach every repository available to the account; it is not restricted to VPS projects.

```bash
sudo -u kanban -H gh auth login --hostname github.com --with-token < gh-token.txt
sudo -u kanban -H gh auth setup-git
sudo -u kanban -H git config --global user.name "Your Name"
sudo -u kanban -H git config --global user.email "you@example.com"
```

Keep `gh-token.txt` private and delete it afterwards. For a **fine-grained** token, gh recommends `GH_TOKEN` in the server environment instead of treating `--with-token` as a universal login method. For this deployment's machine-default account, configure it manually in `/etc/kanban/kanban.env` and restart the service. Terminal checks must use the same user and environment as the service.

[Create a fine-grained token on github.com](https://github.com/settings/personal-access-tokens/new), [manage fine-grained tokens on github.com](https://github.com/settings/personal-access-tokens), or [manage classic tokens on github.com](https://github.com/settings/tokens). These are github.com destinations, not detected repository hosts. Enterprise users must choose their repository host and follow its official instructions.

[gh environment documentation](https://cli.github.com/manual/gh_help_environment) specifies that `GH_TOKEN`, then `GITHUB_TOKEN`, override stored credentials for github.com and ghe.com. Enterprise Server uses `GH_ENTERPRISE_TOKEN`, then `GITHUB_ENTERPRISE_TOKEN`. This advice concerns the machine-default account: Kanban's existing managed accounts isolate their configuration and remove ambient GitHub credential variables. Check only variable presence, never print values. Use the [gh authentication status command](https://cli.github.com/manual/gh_auth_status) without `--show-token` for manual verification.

Token permissions depend on operations, repositories and organization policies. Fine-grained tokens have [documented limitations](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens), including outside collaborators, multiple organizations and the Checks API, and may require organization approval. No permission list guarantees all Kanban operations. The project connection test only confirms PR read access; push, PR creation and review publication remain unverified. Creation and dirty-project tests resolve the account from repository/server configuration, not an unsaved account selector: save, then retest to verify the saved account.

**Codex.** Device login must be enabled in your ChatGPT security settings.

```bash
sudo -u kanban -H /opt/kanban/current/node_modules/.bin/codex login --device-auth
```

**Claude.** Prefer `claude auth login` over `claude setup-token`. `claude` is not on the `kanban` user's PATH: run the SDK's bundled binary as that user (replace `linux-x64` with `linux-arm64` on ARM):

```bash
sudo -u kanban -H env HOME=/var/lib/kanban /opt/kanban/current/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude auth login
```

Open the printed URL, authorize, then paste the code back into the terminal. You can also use the **Connecter Claude** button in the app (Consommation → Limites, Claude card): it runs the same command on the server, shows the authorization URL and takes the code.

A `setup-token` token (`CLAUDE_CODE_OAUTH_TOKEN=<token>` in `/etc/kanban/kanban.env`) still runs agents, but it cannot read the subscription limits shown on the usage page. If one is set, it probably takes precedence over the login: comment the `CLAUDE_CODE_OAUTH_TOKEN` line out in `/etc/kanban/kanban.env` (`sudo nano /etc/kanban/kanban.env`), then run `sudo systemctl restart kanban`.

**Skills.** On the Mac:

```bash
tar -C ~/.codex/skills -czhf /tmp/kanban-skills.tgz argus-review regression-check minos-pr-feedback mockup-fidelity-review
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

**Additional GitHub accounts (optional).** The login above is the machine's default account. To work on projects of other GitHub accounts without switching it, see [GitHub accounts and cloned projects](#github-accounts-and-cloned-projects).

### A5. Start the service

Install the unit from the reviewed commit, then start it:

```bash
git -C ~/kanban-admin show "$sha:deploy/vps/kanban.service" | sudo install -m 0644 -o root -g root /dev/stdin /etc/systemd/system/kanban.service
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

To open the board from a phone or any browser behind a Google login, follow [vps-remote-access.md](./vps-remote-access.md). The SSH tunnel stays the fallback.

### A7. Acceptance checks

- From the Mac, `curl -s -o /dev/null -w '%{http_code}\n' http://<vps>:52817/health` fails to connect: nothing is published.
- On the VPS, `curl -s http://127.0.0.1:52817/api/settings` returns `forbidden`: the API only answers on the socket.
- A card created with auto-merge, direct push or autonomous merge delivery is refused. A normal card ends with an open pull request, with your Mac off. Clicking **Merger la PR** on that card merges it.
- `sudo systemctl restart kanban` interrupts the running card, which can be resumed without a duplicate PR.

## GitHub accounts and cloned projects

**Read this first: every agent session can read the tokens of every registered account.** All accounts live under the same `kanban` Unix user as the server and its agents, so attaching a project to an account only selects which identity its GitHub operations use. It is not a security barrier between projects or accounts. Backups of the data root contain the tokens in clear text.

### Accounts

- **Default account.** The machine's own `gh` login (A4) is used by every project without an account, exactly as before.
- **Adding an account.** In **Settings → Comptes GitHub**, paste a token. The server passes it on stdin to `gh auth login --hostname github.com --with-token --insecure-storage` with `GH_CONFIG_DIR=<dataRoot>/gh-accounts/<login>/` (folder `0700`, files `0600`), then shows the login GitHub returned. The machine's default and active `gh` accounts are not changed. Pasting a new token for an existing login replaces it. The token is never stored in SQLite, `config.json`, logs or API responses.
- **Status.** Each account shows `valide` or `invalide`, from a read-only `gh api user` probe. An account folder or file with permissions wider than `0700`/`0600` is refused and reported as invalid.
- **Removing an account.** Allowed only when no project is attached to it; otherwise the projects are listed.
- **Attaching a project.** Pick the account when creating the project or in its settings (GitHub projects only; Azure DevOps projects refuse an account). The account cannot change while the project has tickets in progress. It is stored in SQLite (`projects.github_account`), never in `.git/config`.

### Token scopes

- **Classic token:** gh's documented minimum for `--with-token` is `repo`, `read:org`, and `gist`. Grant additional scopes only for required operations; these scopes do not guarantee every operation is allowed.
- **Fine-grained token:** for the machine-default account, gh recommends `GH_TOKEN` in the server environment. Select repositories and permissions for required operations (for example, Contents and Pull requests read/write for code and PR writes). Outside collaborators, multiple organizations and the Checks API have documented limitations; organization approval may be required. The existing managed-account form still uses `--with-token`; this guide does not change that mechanism or promise universal fine-grained support through it. See the [gh login documentation](https://cli.github.com/manual/gh_auth_login) and [GitHub token limitations](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
- **Organization SSO:** authorize classic tokens for organizations enforcing SAML SSO (**Configure SSO** next to the token on GitHub). Fine-grained tokens are authorized during creation and can require organization approval. Organization policies can also restrict access.

### What runs under the project's account

Every `gh` call and network `git` call of the server for an attached project, and every Claude and Codex session (all roles), tmux shell, validation command and project script rooted in its repository, runs with that account's `GH_CONFIG_DIR` and a per-account `GIT_CONFIG_GLOBAL`. That file includes your `~/.gitconfig`, then replaces the `github.com` credential helpers with `gh auth git-credential`, so `git push` authenticates as the account. Guardrails:
- The login answered by `gh api user` is compared, case-insensitively, with the expected account at session start and before push, merge and done. A missing folder, an invalid or expired token, or another login blocks the operation with a message naming the account. There is never a fallback to another account.
- An attached project with an SSH remote is refused before any network operation: use an `https://github.com/...` origin.
- Two projects attached to different accounts that share one git repository are refused.
- Agents may not run `gh auth`.
- `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, `github_pat_` tokens and `https://user:secret@` credentials are masked in logs, transcripts and errors. `GET /api/capabilities` only exposes a `githubAvailable` boolean.

### Adding a project from GitHub

In the project form, **Depuis GitHub** (shown when `gh` is installed) lists every repository the chosen account owns, collaborates on or reaches through an organization, or accepts a link (`git@github.com:owner/repo.git`, `https://github.com/owner/repo`, `owner/repo`). The server rebuilds the HTTPS URL and clones it, without a shell, into:

- `<clone root>/<login>/<owner>/<repo>` with an account,
- `<clone root>/_machine/<owner>/<repo>` with the default account,

with lowercase segments. The clone root is `KANBAN_CLONE_ROOT`, default `~/kanban-projects` (on the VPS, `/var/lib/kanban/kanban-projects`). It is distinct from the data root. A folder that already holds the same origin is reused; a folder with another origin, or that is not a git repository, is a conflict and is left untouched. A clone is capped at 200 s; beyond that it is stopped, its partial folder removed and the request answered with an error.

### Limits

- HTTPS only: no SSH cloning, deploy keys or per-account SSH keys.
- Only github.com: Azure DevOps and GitHub Enterprise repositories are added with **Dossier local** after cloning them yourself.
- Deleting a project does not delete its clone.

## Phase B: previews through the broker

Prerequisites: Phase A works, a Coolify API token with the `read`, `write` and `deploy` permissions (not `root`, not `read:sensitive`), and the kanban-agents preview recipe (`Dockerfile.preview`).

### B1. Broker user, files and configuration

```bash
sudo useradd --system --no-create-home --home-dir /var/lib/kanban-preview --shell /usr/sbin/nologin kanban-preview
sudo install -d -o root -g root -m 0755 /opt/kanban-preview /etc/kanban-preview
for file in deploy/preview-broker/broker.ts deploy/preview-broker/kanban-preview-cleanup.py src/server/system/previewCleanup.py; do
  git -C ~/kanban-admin show "$sha:$file" | sudo install -m 0644 -o root -g root /dev/stdin "/opt/kanban-preview/$(basename "$file")"
done
git -C ~/kanban-admin show "$sha:deploy/preview-broker/config.example.json" | sudo install -m 0600 -o root -g root /dev/stdin /etc/kanban-preview/config.json
sudo nano /etc/kanban-preview/config.json
```

`sha` is the reviewed commit from A3. Fill in the Coolify URL, token, server, project, environment name, preview domain and, for each project, the repository and its Coolify source (`github_app`, `deploy_key` or `public` with its uuid). The project key is only a label: the broker matches projects by repository. The broker copies are only updated when you run the `for` loop again with a reviewed `sha`, never by a release upgrade. Install `config.example.json` only once: rerunning that line overwrites your configuration.

### B2. Units

Install the broker units and the `kanban.service` drop-in from the reviewed commit, then start them:

```bash
for unit in kanban-preview-broker.service kanban-preview-cleanup.socket kanban-preview-cleanup@.service; do
  git -C ~/kanban-admin show "$sha:deploy/vps/$unit" | sudo install -m 0644 -o root -g root /dev/stdin "/etc/systemd/system/$unit"
done
sudo install -d -o root -g root -m 0755 /etc/systemd/system/kanban.service.d
git -C ~/kanban-admin show "$sha:deploy/vps/kanban.service.d/preview-broker.conf" | sudo install -m 0644 -o root -g root /dev/stdin /etc/systemd/system/kanban.service.d/preview-broker.conf
sudo systemctl daemon-reload
sudo systemctl enable --now kanban-preview-cleanup.socket kanban-preview-broker.service
sudo systemctl restart kanban
sudo journalctl -u kanban-preview-broker -n 20 --no-pager
```

The drop-in also sets `KANBAN_PREVIEW_CONNECT_ADDRESS=127.0.0.1`. The service blocks private addresses, and Docker rewrites a connection from the VPS to its own public address into the Coolify proxy's private address. Kanban's health checks and Chrome therefore reach previews through `127.0.0.1`, which Docker's port proxy forwards to the proxy.

Coolify's API IP allowlist, if set, must include the VPS public address and the gateway of the `coolify` Docker network (`sudo docker network inspect coolify --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'`).

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
cd /tmp && sudo -u kanban -H npx -y @playwright/mcp@0.0.83 --help
```

The second command caches the pinned Playwright MCP for the `kanban` user, because quality validation runs it offline.

### B6. Acceptance checks

- A Devin card gets a ready preview, then the preview is stopped and cleaned completely.
- `sudo cat /var/lib/kanban-preview/registry.json` lists the preview with `deletedAt` set after cleanup.
- `sudo -u kanban cat /etc/kanban-preview/config.json` is refused.

## Upgrade

From the Mac:

```bash
ssh -t -p <ssh-port> <vps> sudo kanban-upgrade
```

The command prints each step and the commit before and after:
1. Takes a lock in `/run`, so two upgrades never run at once.
2. Reads the tip of `main` with `git ls-remote` on the hard-coded repository. It stops if that commit is already current.
3. Checks free disk space (3 GB on the release, build and data disks, plus the database size for the backup).
4. Builds the release with `kanban-release --build-only` while the service keeps running. A failed build stops here: the service still runs the old release.
5. Checks, as `kanban` and read-only, that no execution run, quality validation, preview operation or busy slot is active, and lists them otherwise.
6. Backs up the database as `kanban` to `/var/lib/kanban/backups/kanban-<utc-date>-<short-sha>.db`.
7. Stops `kanban`, points `/opt/kanban/current` at the new release, and starts it.
8. Requires 5 consecutive healthy answers from `GET /health` on `127.0.0.1` and the service port (`PORT` from the unit or `/etc/kanban/kanban.env`, else 52817), spread over about 20 seconds, with the unit active. It gives up after 2 minutes.
9. Keeps the 5 most recent releases and the 10 most recent backups. The current and previous releases are never removed.

Options:
- `--sha <full-commit-sha>` upgrades to that commit instead of the tip of `main`.
- `--force` upgrades even if work is running; that work is interrupted. Without it, the command refuses and lists what runs.

Root never opens the database: every query and the backup run as `kanban`. Between the check (step 5) and the stop (step 7), an automation or autonomous delivery can still start. This is accepted because you run the command yourself; there is no drain mode.

**Rollback.** If the health check fails, the command points `current` back to the previous release, restarts the service and checks its health again. It never restores the database. The output names the backup taken before the upgrade. The database schema only migrates forward, so the new release may already have migrated it: restore that backup only if the previous release fails on the migrated schema, with the service stopped and as `kanban`, and never after new pull requests or previews were created.

Exit codes: `0` upgraded or already current, `1` refused or failed with the service on the previous release, `2` the rollback health check failed too, `64` bad usage.

**Updating the scripts.** `kanban-upgrade` and `kanban-release` never update themselves. When a reviewed commit changes them, reinstall them with the two `install` lines from A3.

**Updating units and broker files.** `kanban-upgrade` does not copy them either. When a commit changes `deploy/vps` or `deploy/preview-broker`, copy the changed files from `/opt/kanban/current` again as in A5, B1 and B2, run `sudo systemctl daemon-reload`, then restart the affected services.

### Manual upgrade

Use this if `kanban-upgrade` is unavailable.

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

Roll back by running `kanban-release` with the previous commit, then restarting the service, but only if the database schema is compatible. Never restore an older database after new pull requests or previews were created.
