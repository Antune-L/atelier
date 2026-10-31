# Opening the Mac board from any device

This guide puts the board of the desktop app on the Mac behind a dedicated Cloudflare Tunnel and an owner-only Cloudflare Access application, so it opens at `https://<mac-host>` from any browser, phone included. It mirrors [vps-remote-access.md](./vps-remote-access.md): read its steps 1 to 6 first, they are reused here as they are.

[mac-vps-link-setup.md](./mac-vps-link-setup.md) automates this guide with a remotely managed tunnel: an agent creates the Cloudflare resources through the Cloudflare MCP, and `scripts/setup-mac-vps-link.ts` installs the connector and fills the settings. It replaces steps 1 to 6 below, with the same Access rules as step 1; step 7 (acceptance checks) still applies.

The board, its API and its terminal give a shell as the Mac user, who holds the SSH key of the VPS. The owner accepted this exposure on 2026-10-31, with a short Access session.

## What protects what

- `cloudflared` on the Mac only opens outbound connections to Cloudflare. The board keeps listening on `127.0.0.1:52817`; no port is opened on the Mac.
- Cloudflare Access denies by default. One policy allows a single email address, signed in through Google, with the Access second factor.
- `cloudflared` validates the Access token (JWT, the signed assertion Access adds to each request) before it forwards anything to the board. This validation is **mandatory**: without it, Cloudflare's edge would be the only control in front of a shell.
- Kanban's Host/Origin guard accepts the public hostname only because the desktop app exports it as `DEV_HOST` at launch. The guard is not an authentication.

Not covered, by design:
- **Direct local access.** Any process on the Mac can call `http://127.0.0.1:52817` without Access, exactly as before this guide.
- **An already-open WebSocket survives the Access expiry.** Access and the guard only check the WebSocket handshake; a board or terminal session that is already open stays open after the Access session expires or is revoked. Close the tab, or quit the app, to cut it.
- Cloudflare terminates TLS and can see all traffic, terminal included.
- The board is reachable only while the Mac is awake **and** the desktop app is open: closing the window stops the server. The phone then gets a Cloudflare error page.

Placeholders: `<domain>`, `<team>` and `<email>` as in the VPS guide; `<mac-host>` the Mac board hostname (for example `mac.<domain>`), `<mac-aud>` the AUD tag of its Access application, `<kanban-host>` the VPS board hostname, and `<tunnel-id>` the UUID of the Mac tunnel. None of them belongs in the repository.

## 1. Access application for the Mac

Create it before the tunnel route: a route without an Access application is open to the whole internet.

In **Zero Trust > Access controls > Applications**, select **Create new application > Self-hosted and private > Add public hostname**:
1. Hostname: `<mac-host>`, with no path. Do not reuse or edit the VPS board application.
2. Policy, action **Allow**, with the same rules as step 5 of the VPS guide: **Include > Emails** `<email>` only, **Require > Login Methods** Google, and **Override global multi-factor authentication settings (MFA)** with MFA required. No other policy, and no Bypass or Service Auth policy.
3. Login methods: Google only, with **Apply instant authentication**.
4. Session duration: the shortest value you can live with, shorter than the 24 hours of the VPS board.
5. **Create**, then copy the **Application Audience (AUD) Tag**: it is `<mac-aud>`.

## 2. Install cloudflared on the Mac

```bash
brew install cloudflared
cloudflared --version
```

## 3. Create a dedicated, locally managed tunnel

A locally managed tunnel keeps its whole configuration, including the token validation, in one reviewable file on the Mac.

```bash
cloudflared tunnel login
cloudflared tunnel create kanban-mac
```

`tunnel login` stores the account certificate `~/.cloudflared/cert.pem`; it can create and delete every tunnel of the account, so keep it on this Mac only. `tunnel create` prints `<tunnel-id>` and writes the tunnel credentials file `~/.cloudflared/<tunnel-id>.json`, which only runs this tunnel. Never paste either file anywhere.

## 4. Configuration file

Write `~/.cloudflared/config.yml`:

```yaml
tunnel: <tunnel-id>
credentials-file: /Users/<user>/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: <mac-host>
    service: http://127.0.0.1:52817
    originRequest:
      access:
        required: true
        teamName: <team>
        audTag:
          - <mac-aud>
  - service: http_status:404
```

- `access.required: true` makes `cloudflared` reject any request whose `Cf-Access-Jwt-Assertion` is missing, invalid, or issued for another application than `<mac-aud>`.
- Do not set `httpHostHeader`: the board must receive `Host: <mac-host>`. Rewriting it to `localhost` would make public requests look local to Kanban's guard.
- The last rule answers 404 to any other hostname. Add no other hostname to this tunnel.

Check and route:

```bash
cloudflared tunnel ingress validate
cloudflared tunnel route dns kanban-mac <mac-host>
```

## 5. Run the connector

```bash
cloudflared service install
```

It installs a launch agent that starts at login with `~/.cloudflared/config.yml`. After a few seconds the tunnel turns **Healthy** in the dashboard.

## 6. Let Kanban accept the hostname

In the desktop app, open **Réglages > Liaison des boards**, enter `<mac-host>` in **Nom public de ce Mac**, then **Enregistrer**. Quit and reopen the app: the desktop app reads this setting from its database before it starts the server and exports it as `DEV_HOST`. Until the restart, the section shows the hostname that is still active.

While a public hostname is set, the desktop app also ignores `KANBAN_HOST`, so the server stays bound to `127.0.0.1`. Check it from a terminal on the Mac:

```bash
lsof -nP -iTCP:52817 -sTCP:LISTEN
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: <mac-host>' http://127.0.0.1:52817/health
```

The listener must show `127.0.0.1:52817`, and the check must print `200`. A `403` means the app was not restarted or the hostname differs.

In the same section, set **Adresse de l'autre board** to `https://<kanban-host>`; on the VPS board, set it to `https://<mac-host>`. Each board then shows **Ouvrir l'autre board** in its navigation.

## 7. Acceptance checks

### Access in front of the board

1. On the phone, open `https://<mac-host>`, sign in with Google and the Access second factor. The board loads.
2. From any machine, `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://<mac-host>/` prints `302` and a redirect to `https://<team>.cloudflareaccess.com/cdn-cgi/access/login/...`.
3. In a private window, another Google account is refused by Access and never sees the board.

### cloudflared refusals, tested in isolation

Access stops requests without a valid session before they reach `cloudflared`, so the public hostname alone cannot show that `cloudflared` validates the token. Test it on a temporary hostname that has **no** Access application, without touching the `<mac-host>` application.

1. Add a temporary rule above the catch-all, with the same `originRequest` block and a hostname `<mac-test-host>` that you never share:

   ```yaml
     - hostname: <mac-test-host>
       service: http://127.0.0.1:52817
       originRequest:
         access:
           required: true
           teamName: <team>
           audTag:
             - <mac-aud>
   ```

   Then `cloudflared tunnel ingress validate`, `cloudflared tunnel route dns kanban-mac <mac-test-host>`, and restart the connector (quit and reopen the session, or unload and load the launch agent).

   Even if the validation were broken, Kanban's guard refuses `Host: <mac-test-host>` with the body `forbidden`, so the board stays closed during the test. That body is also the marker: a response carrying `forbidden` came from Kanban, so `cloudflared` let the request through.

2. Keep the tokens in shell variables and never print them:

   ```bash
   cloudflared access login https://<mac-host>
   MAC_TOKEN=$(cloudflared access token -app=https://<mac-host>)
   cloudflared access login https://<kanban-host>
   OTHER_TOKEN=$(cloudflared access token -app=https://<kanban-host>)
   ```

3. Run each check over HTTP and on both WebSocket paths:

   ```bash
   for path in /health /ws '/ws/terminal?ticketId=probe'; do
     echo "== $path"
     curl -s -w '\n%{http_code}\n' "https://<mac-test-host>$path" -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ=='
     curl -s -w '\n%{http_code}\n' "https://<mac-test-host>$path" -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Cf-Access-Jwt-Assertion: eyJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJmb3JnZWQifQ.c2lnbmF0dXJl'
     curl -s -w '\n%{http_code}\n' "https://<mac-test-host>$path" -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H "Cf-Access-Jwt-Assertion: $OTHER_TOKEN"
     curl -s -w '\n%{http_code}\n' "https://<mac-test-host>$path" -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H "Cf-Access-Jwt-Assertion: $MAC_TOKEN"
   done
   ```

   Expected, for each path:
   - missing token, forged token, token of the VPS application (other audience): refused by `cloudflared`, never the body `forbidden`;
   - `$MAC_TOKEN`: the body `forbidden` with `403`. This positive control proves the route reaches Kanban when the token is valid. If it is refused too, Cloudflare did not forward the header on a hostname without Access, and this method cannot qualify the validation: stop and report it.

   Record the observed status codes; the exact code `cloudflared` returns for a refusal is not documented here.

4. Remove the temporary rule from `config.yml`, delete the `<mac-test-host>` DNS record in the dashboard, restart the connector, then `unset MAC_TOKEN OTHER_TOKEN`.

### Phone checklist

Run it on a phone, on cellular data, signed in to `https://<mac-host>`. Tick each line only when it was observed.

- [ ] **Create**: the **+** button opens the creation form; a card is created in **À faire**.
- [ ] **Prefilled link**: opening `https://<mac-host>/#new=<payload>` opens the form filled and does not create anything (format below).
- [ ] **Card link**: opening `https://<mac-host>/#ticket=<ticket-id>` opens that card.
- [ ] **Edit**: the brief of a card is edited and saved from its **Brief** tab.
- [ ] **Approve**: a remote card shows **Approuver le démarrage**, and approving it works.
- [ ] **Launch**: a card in **À faire** starts, and its stage updates live (board WebSocket `/ws`).
- [ ] **Upload**: **Ajouter une image** in the creation form and in the brief opens the phone picker; the image line is added to the text.
- [ ] **Terminal**: the terminal of a running card opens, accepts typing and resizes (terminal WebSocket `/ws/terminal`).
- [ ] **Project folder**: in **Réglages > Projets**, adding a project shows a path field and no **Parcourir** button; the server refuses the native folder picker for any request whose Host is not loopback, so no dialog opens on the Mac.
- [ ] **MCP token**: **Réglages > MCP** says the token is managed in the desktop app only.
- [ ] **Other board**: **Ouvrir l'autre board** in the navigation opens the VPS board, and the VPS board opens this one.

Not checked statically: the terminal keyboard behaviour on mobile browsers, and whether pasting an image works on a given phone (use **Ajouter une image** instead).

## Board links

- `#ticket=<ticket-id>` selects that card when the board opens.
- `#new=<payload>` opens the creation form filled with a title, a description and a suggested project, where `<payload>` is `encodeURIComponent(JSON.stringify({ title, description, project }))` and every field is optional. The form never submits by itself. Any other field (start, schedule, agent, model, auto-merge, direct push and so on) is dropped. A suggested project that does not exist on this board leaves the project unselected. A malformed link is ignored with a notice.

The board removes the fragment from the address once read, so a reload does not reopen the form.

## Rotate or remove

- **Remove the access**: remove the launch agent of step 5 (the subcommand is listed by `cloudflared service --help`), delete the `<mac-host>` DNS record and the `kanban-mac` tunnel in the dashboard (**Networking > Tunnels**), empty **Nom public de ce Mac** in **Réglages > Liaison des boards**, then restart the app.
- **Kill switch**: quit the desktop app. Nothing answers on `<mac-host>` until it is reopened.
