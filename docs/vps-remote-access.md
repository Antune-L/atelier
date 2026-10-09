# Opening the VPS board from any device

This guide puts the VPS board behind Cloudflare Tunnel and Cloudflare Access, so it opens at `https://<kanban-host>` from any browser, phone included, after a Google login. It complements the SSH tunnel of [vps-install.md](./vps-install.md) A6, which stays as a fallback. Every Cloudflare and Google Cloud feature used here is on a free plan.

## What protects what

- `cloudflared` only opens outbound connections to Cloudflare. No port is published on the VPS, and Traefik and Coolify are untouched.
- Cloudflare Access denies by default. One policy allows a single email address, signed in through Google only.
- Access asks for its own second factor (authenticator app or biometrics), independent of Google, every 24 hours per device.
- `cloudflared` validates the Access token (JWT) before it forwards a request to the Unix socket, so a request without a valid token for this application never reaches Kanban.
- The tunnel token lives in `/etc/cloudflared`, readable by the `cloudflared` user only and hidden from `kanban.service`, so agents cannot steal it to run a rogue connector.
- Kanban's Host/Origin guard accepts the public hostname through `DEV_HOST`.

Not covered:
- Cloudflare terminates TLS and can see all traffic, terminal included.
- A terminal WebSocket that is already open stays open after the Access session expires.
- Agents on the VPS still reach the socket directly, as documented in the install guide.
- The Google account is the weakest link: keep 2-Step Verification on, ideally with a passkey.

Placeholders: `<domain>` is a domain whose DNS is on Cloudflare, `<kanban-host>` the board hostname (for example `kanban.<domain>`), `<team>` the Zero Trust team name, and `<email>` the only Google address allowed in. None of them belongs in the repository.

Prerequisites: Phase A of the install guide works, `<domain>` is an active zone in your Cloudflare account, and the Google account has 2-Step Verification on. Activating the Zero Trust Free plan asks for a payment card, charged only for usage above the free limits (Access is free up to 50 users, and Tunnel is free).

## 1. Note the team name

In the Cloudflare dashboard, open **Zero Trust > Settings**. Note the team name: the team domain is `https://<team>.cloudflareaccess.com`.

## 2. Google OAuth client

In the Google Cloud console:
1. Create a project, for example `kanban-access`.
2. Open **APIs & Services > Credentials > Configure Consent Screen > Get started**. Enter an app name and your support email, choose the **External** audience, enter your contact email, then **Create**.
3. Leave the app in **Testing** and add `<email>` as the only test user, so Google itself refuses other accounts.
4. Select **Create OAuth client**, type **Web application**:
   - Authorized JavaScript origins: `https://<team>.cloudflareaccess.com`
   - Authorized redirect URIs: `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback`
5. Copy the client ID and client secret. Never paste the secret anywhere else than the Cloudflare form below.

## 3. Google as the login method

In **Zero Trust > Integrations > Identity providers**:
1. **Add new identity provider > Google**. Paste the client ID in **App ID** and the client secret, turn on **PKCE**, then **Save**.
2. Select **Test** next to Google and sign in with `<email>`: the test must succeed.
3. Delete **One-time PIN** if it is listed, so nobody can sign in with an emailed code.

## 4. MFA methods

In **Zero Trust > Access controls > Access settings**, under **Allow multi-factor authentication (MFA)**:
- Turn on **Biometrics** and **Authenticator application**. Leave the hardware key methods off unless you own such a key.
- Set **Authentication duration** to 24 hours.
- Leave **Use identity provider MFA** off, so Google's own session never replaces the Access second factor.

Allowing methods does not require them. The policy below requires MFA.

## 5. Access policy and application

Create them before the tunnel route: a route without an Access application is open to the whole internet.

In **Zero Trust > Access controls > Applications**, select **Create new application > Self-hosted and private > Add public hostname**:
1. Hostname: the subdomain of `<kanban-host>` on `<domain>`, with no path.
2. Policy, action **Allow**:
   - **Include > Emails**: `<email>` and nothing else. Include rules are OR.
   - **Require > Login Methods**: Google. Require rules are AND.
   - Turn on **Override global multi-factor authentication settings (MFA)** and require MFA with the methods of step 4.
   - Add no other policy, and no Bypass or Service Auth policy.
3. Login methods: Google only, with **Apply instant authentication**.
4. Session duration: 24 hours.
5. **Create**, then copy the **Application Audience (AUD) Tag** from the application.

## 6. App Launcher, for MFA enrollment

Devices enroll their second factor on the App Launcher, which is off by default. In **Zero Trust > Access controls > Access settings**, card **Manage your App Launcher**, select **Manage**:
- **Policies** tab: the same rules as step 5 (Include Emails `<email>`, Require Login Methods Google).
- **Authentication** tab: Google only.
- **Save**.

## 7. Install cloudflared on the VPS

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install cloudflared
cloudflared --version
```

The version must be `2025.4.0` or newer for `--token-file`. The package installs `/usr/bin/cloudflared`, plus a `/usr/local/bin/cloudflared` symlink to it.

## 8. Create the tunnel and keep its token

In **Networking > Tunnels**, select **Create a tunnel**, type cloudflared, name it `kanban-vps`. On the install screen, **do not run the displayed command**: `cloudflared service install <token>` puts the token on the service command line, which any local user, including `kanban`, can read. Copy the command of **Or, run tunnel (manual)** and keep only the token, the part starting with `eyJ`.

On the VPS, store the token for a dedicated user:

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin cloudflared
sudo install -d -m 0700 -o cloudflared -g cloudflared /etc/cloudflared
sudo install -m 0600 -o cloudflared -g cloudflared /dev/null /etc/cloudflared/kanban.token
sudo nano /etc/cloudflared/kanban.token
```

Paste the token on one line and save.

## 9. Start the connector

Install the unit from the reviewed commit, as in A5. Reinstall `kanban.service` from the same commit too: it hides `/etc/cloudflared` from the agents.

```bash
git -C ~/kanban-admin show "$sha:deploy/vps/cloudflared-kanban.service" | sudo install -m 0644 -o root -g root /dev/stdin /etc/systemd/system/cloudflared-kanban.service
git -C ~/kanban-admin show "$sha:deploy/vps/kanban.service" | sudo install -m 0644 -o root -g root /dev/stdin /etc/systemd/system/kanban.service
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-kanban
sudo journalctl -u cloudflared-kanban -n 30 --no-pager
```

The unit runs as `cloudflared` with the supplementary group `kanban`, which is enough to open the socket (mode 660 in a 750 directory). After a few seconds, the log shows `Registered tunnel connection` lines and the tunnel turns **Healthy** in the dashboard.

## 10. Publish the board through the tunnel

Open the tunnel itself (**Networking > Tunnels > kanban-vps**), tab **Routes**, then **Add route > Published application**. The **Create route** dialog of **Networking > Routes** only offers private-network routes, which need the Cloudflare One client on every device.

- Subdomain and domain: `<kanban-host>`, no path.
- Service URL: `unix:/run/kanban/ui.sock`.
- **Additional application settings > Access**: turn on the token validation with team name `<team>` and the AUD tag of step 5. Leave HTTP, TLS and Connection on their defaults.

Saving creates the CNAME record of `<kanban-host>` to `<tunnel-id>.cfargotunnel.com`.

## 11. Let Kanban accept the hostname

When no card is running, add one line `DEV_HOST=<kanban-host>` to `/etc/kanban/kanban.env` with `sudo nano /etc/kanban/kanban.env`, then:

```bash
sudo systemctl restart kanban
sudo curl -s -o /dev/null -w '%{http_code}\n' --unix-socket /run/kanban/ui.sock -H 'Host: <kanban-host>' http://<kanban-host>/health
```

The check must print `200`. A `403` means the guard still refuses the hostname: compare the `DEV_HOST` line with `<kanban-host>` character by character.

## 12. Enroll the second factor, then check

1. Open `https://<kanban-host>` and sign in with Google. Access asks to enroll a second factor: enroll it right away, because the first authenticator is enrolled without MFA. Add a backup method on `https://<team>.cloudflareaccess.com` under **Account > MFA devices > Add an MFA device**.
2. Acceptance checks:
   - From the Mac, `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://<kanban-host>/` prints `302` and a redirect to `https://<team>.cloudflareaccess.com/cdn-cgi/access/login/...`.
   - In a private window, another Google account is refused by Access and never sees the board.
   - On a phone, the board loads, updates live, and the terminal of a card opens: both WebSockets work.
   - `systemctl show kanban -p InaccessiblePaths` lists `/etc/cloudflared`.
   - The SSH tunnel of A6 still works.

## Optional hardening

- **Country in the policy.** Add **Require > Country** with your country to the Access policy. Access re-evaluates it on every request, so a stolen session used from abroad is cut. Abroad or behind a foreign VPN, use the SSH tunnel.
- **WAF custom rule.** The Free plan has 5 custom rules. A rule that blocks `<kanban-host>` when the country is not yours hides even the login page from foreign scanners. Check that the country field is offered on your plan in the rule editor.

## Troubleshooting

- **`forbidden` after login.** Kanban's guard refused the request. Check `DEV_HOST` in `/etc/kanban/kanban.env` and in the running process: `sudo cat /proc/$(systemctl show -p MainPID --value kanban)/environ | tr '\0' '\n' | grep DEV_HOST`.
- **"Please contact your administrator to enable the Access App Launcher".** The team domain was opened before step 6.
- **The hostname does not resolve on the Mac right after step 10.** The Mac cached the earlier negative answer. Wait a few minutes, or test from a phone on cellular data.

## Rotate or remove

- **Rotate the token**: on the tunnel overview, **Refresh token > Rotate token**, paste the new token into `/etc/cloudflared/kanban.token`, then `sudo systemctl restart cloudflared-kanban`.
- **Remove the access**: `sudo systemctl disable --now cloudflared-kanban`, delete the route and the tunnel in the dashboard, then remove `DEV_HOST` and restart `kanban`.
