import { Resolver } from "node:dns/promises";
import { isIP } from "node:net";

import { z } from "zod";

import { runBoundedCommand, safeJsonParse } from "./boundedCommand.ts";
import { hostnameFromSshConfig } from "./repoInspection.ts";

const COOLIFY_APP_UUID_PATTERN = /^[a-z0-9]{24}$/;
const SSH_HOST_ALIAS_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,253}$/;
const LOCAL_COOLIFY_SERVER_ADDRESS = "host.docker.internal";
const DNS_TIMEOUT_MS = 2_000;
const DNS_TRIES = 1;
const CLEANUP_RESULT_SCHEMA = z.object({ complete: z.boolean(), reason: z.string().nullable(), retryable: z.boolean().optional() }).strict();
const SSH_OPTIONS = [
  "-T",
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=yes",
  "-o", "UpdateHostKeys=no",
  "-o", "ConnectTimeout=8",
  "-o", "ConnectionAttempts=1",
  "-o", "ServerAliveInterval=5",
  "-o", "ServerAliveCountMax=1",
  "-o", "ForwardAgent=no",
  "-o", "ClearAllForwardings=yes",
  "-o", "PermitLocalCommand=no",
  "-o", "ControlMaster=no",
  "-o", "ControlPath=none",
];

export interface PreviewCleanupOptions {
  appUuid: string;
  sshHostAlias?: string | null;
  expectedServerAddress?: string | null;
  serverUuid?: string | null;
  ownershipMarker?: string | null;
  coolifyBaseUrl?: string | null;
  removeOwnedResources?: boolean;
  deploymentUuids?: string[];
}

const REMOTE_CLEANUP_SCRIPT = String.raw`
import json, os, re, shutil, signal, subprocess, sys, time

app_uuid = sys.argv[1]
remove_owned = sys.argv[2] == "remove"
deployment_uuids = set(sys.argv[3:])
cleanup_timeout_seconds = 20
docker_timeout_seconds = 4
deadline = time.monotonic() + cleanup_timeout_seconds
project_label = "com.docker.compose.project"
config_root = "/data/coolify/applications"
config_path = config_root + "/" + app_uuid

class BuilderStillPresent(RuntimeError):
    pass

def deadline_exceeded(signum, frame):
    raise RuntimeError("Preview cleanup deadline exceeded.")

signal.signal(signal.SIGALRM, deadline_exceeded)
signal.alarm(cleanup_timeout_seconds)

def docker(*args):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise RuntimeError("Preview cleanup deadline exceeded.")
    result = subprocess.run(["docker", *args], capture_output=True, text=True, timeout=min(docker_timeout_seconds, remaining))
    if result.returncode != 0:
        raise RuntimeError("Docker preview inventory or removal failed.")
    return result.stdout.strip()

def labels(kind, name):
    template = "{{json .Labels}}"
    if kind == "container":
        template = "{{json .Config.Labels}}"
    return json.loads(docker(kind, "inspect", "--format", template, name)) or {}

def inventory():
    containers = set()
    for owner_label in ["coolify.name", project_label]:
        containers.update(docker("container", "ls", "--all", "--quiet", "--filter", "label=" + owner_label + "=" + app_uuid).splitlines())
    networks = set(docker("network", "ls", "--quiet", "--filter", "label=" + project_label + "=" + app_uuid).splitlines())
    for row in docker("network", "ls", "--format", "{{.ID}}|{{.Name}}").splitlines():
        identifier, name = row.split("|", 1)
        if name == app_uuid:
            networks.add(identifier)
    volumes = set(docker("volume", "ls", "--quiet", "--filter", "label=" + project_label + "=" + app_uuid).splitlines())
    uncertain_volumes = set()
    for name in docker("volume", "ls", "--quiet").splitlines():
        if name.startswith(app_uuid + "_") or name.startswith(app_uuid + "-"):
            if name not in volumes:
                uncertain_volumes.add(name)
    return containers, networks, volumes, uncertain_volumes

def builder_exists():
    for name in docker("container", "ls", "--all", "--format", "{{.Names}}").splitlines():
        if name in deployment_uuids:
            return True
    return False

def config_exists():
    if not os.path.isdir(config_root) or os.path.islink(config_root) or os.path.realpath(config_root) != config_root:
        raise RuntimeError("Coolify application configuration root is not a regular directory.")
    return os.path.lexists(config_path)

def remove_containers(containers):
    for identifier in sorted(containers):
        owner = labels("container", identifier)
        owned = owner.get(project_label) == app_uuid
        owned = owned or (owner.get("coolify.managed") == "true" and owner.get("coolify.name") == app_uuid)
        if not owned:
            raise RuntimeError("Container ownership could not be verified.")
        mounts = json.loads(docker("container", "inspect", "--format", "{{json .Mounts}}", identifier))
        for mount in mounts:
            if mount.get("Type") == "volume":
                volume_owner = labels("volume", mount["Name"])
                if volume_owner.get(project_label) != app_uuid:
                    raise RuntimeError("Preview uses a volume without exclusive ownership proof.")
            elif mount.get("Type") == "bind":
                source = os.path.realpath(mount.get("Source", ""))
                if os.path.commonpath([source, config_path]) != config_path:
                    raise RuntimeError("Preview uses a bind mount outside its owned configuration directory; manual cleanup is required.")
    for identifier in sorted(containers):
        docker("container", "rm", "--force", identifier)

def remove_networks(networks):
    for identifier in sorted(networks):
        name = docker("network", "inspect", "--format", "{{.Name}}", identifier)
        if name != app_uuid and labels("network", identifier).get(project_label) != app_uuid:
            raise RuntimeError("Network ownership could not be verified.")
        attached = json.loads(docker("network", "inspect", "--format", "{{json .Containers}}", identifier)) or {}
        for container_id, container in attached.items():
            if container.get("Name") != "coolify-proxy":
                raise RuntimeError("Preview network still has another attached container.")
            docker("network", "disconnect", identifier, container_id)
        docker("network", "rm", identifier)

def remove_volumes(volumes):
    for name in sorted(volumes):
        if labels("volume", name).get(project_label) != app_uuid:
            raise RuntimeError("Volume ownership could not be verified.")
        docker("volume", "rm", name)

def run():
    if re.fullmatch("[a-z0-9]{24}", app_uuid) is None:
        raise RuntimeError("Invalid Coolify application UUID.")
    docker("info", "--format", "{{.ServerVersion}}")
    if builder_exists():
        raise BuilderStillPresent("A preview deployment builder remains; wait for cancellation before removing application resources.")
    containers, networks, volumes, uncertain_volumes = inventory()
    exists = config_exists()
    if remove_owned:
        if uncertain_volumes:
            raise RuntimeError("Preview has named volumes without exclusive ownership proof.")
        if exists:
            if os.path.islink(config_path) or not os.path.isdir(config_path):
                raise RuntimeError("Preview configuration path is not a regular directory.")
            if not shutil.rmtree.avoids_symlink_attacks:
                raise RuntimeError("Safe configuration directory removal is unavailable.")
        remove_containers(containers)
        remove_networks(networks)
        remove_volumes(volumes)
        if exists:
            shutil.rmtree(config_path)
    containers, networks, volumes, uncertain_volumes = inventory()
    remaining = len(containers) + len(networks) + len(volumes) + len(uncertain_volumes)
    complete = remaining == 0 and not config_exists() and not builder_exists()
    reason = None
    if not complete:
        reason = "Owned preview resources or its configuration directory remain on the server."
    return {"complete": complete, "reason": reason}

try:
    print(json.dumps(run()))
except BuilderStillPresent as error:
    print(json.dumps({"complete": False, "reason": str(error), "retryable": True}))
except RuntimeError as error:
    print(json.dumps({"complete": False, "reason": str(error)}))
except (subprocess.TimeoutExpired, OSError, ValueError, KeyError):
    print(json.dumps({"complete": False, "reason": "Remote preview cleanup could not be verified; retry or inspect the owned resources."}))
`;

async function matchesPreviewServer(hostname: string | null, options: PreviewCleanupOptions): Promise<boolean> {
  if (!hostname || !options.expectedServerAddress) return false;
  if (options.expectedServerAddress !== LOCAL_COOLIFY_SERVER_ADDRESS) {
    return hostname.toLowerCase() === options.expectedServerAddress.toLowerCase();
  }
  if (!options.coolifyBaseUrl) return false;
  const coolifyUrl = new URL(options.coolifyBaseUrl);
  if (coolifyUrl.protocol !== "https:" || coolifyUrl.username || coolifyUrl.password) return false;
  const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: DNS_TRIES });
  async function addressesFor(host: string): Promise<string[]> {
    if (isIP(host)) return [host];
    const results = await Promise.allSettled([resolver.resolve4(host), resolver.resolve6(host)]);
    return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  }
  const timeout = setTimeout(() => resolver.cancel(), DNS_TIMEOUT_MS);
  try {
    const [coolifyAddresses, sshAddresses] = await Promise.all([addressesFor(coolifyUrl.hostname), addressesFor(hostname)]);
    return coolifyAddresses.length > 0 && sshAddresses.some((address) => coolifyAddresses.includes(address));
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyPreviewCleanup(options: PreviewCleanupOptions): Promise<z.infer<typeof CLEANUP_RESULT_SCHEMA>> {
  if (!COOLIFY_APP_UUID_PATTERN.test(options.appUuid)) return { complete: false, reason: "Preview cleanup requires a valid Coolify application UUID." };
  if (!options.sshHostAlias || !SSH_HOST_ALIAS_PATTERN.test(options.sshHostAlias)) return { complete: false, reason: "Configure a valid SSH host alias to verify remote preview cleanup." };
  if (!options.expectedServerAddress) return { complete: false, reason: "The Coolify deployment server address is required to verify the SSH target." };
  if (options.removeOwnedResources && !options.ownershipMarker) return { complete: false, reason: "Preview resource ownership must be recorded before remote removal." };
  const deploymentUuids = options.deploymentUuids ?? [];
  if (!deploymentUuids.every((uuid) => COOLIFY_APP_UUID_PATTERN.test(uuid))) return { complete: false, reason: "Preview cleanup requires valid recorded Coolify deployment UUIDs." };
  const encodedScript = Buffer.from(REMOTE_CLEANUP_SCRIPT).toString("base64");
  const mode = options.removeOwnedResources ? "remove" : "verify";
  const command = `sudo -n python3 -c 'import base64; exec(base64.b64decode("${encodedScript}"))' ${options.appUuid} ${mode} ${deploymentUuids.join(" ")}`;
  try {
    const sshConfig = await runBoundedCommand(["ssh", "-G", ...SSH_OPTIONS, options.sshHostAlias], process.cwd());
    const hostname = hostnameFromSshConfig(sshConfig.stdout);
    if (sshConfig.timedOut || sshConfig.exitCode !== 0 || !await matchesPreviewServer(hostname, options)) {
      return { complete: false, reason: "The SSH target does not match the recorded Coolify deployment server address." };
    }
    const result = await runBoundedCommand(["ssh", ...SSH_OPTIONS, options.sshHostAlias, command], process.cwd());
    if (result.timedOut || result.exitCode !== 0) return { complete: false, reason: "SSH preview cleanup verification failed or timed out." };
    const parsed = CLEANUP_RESULT_SCHEMA.safeParse(safeJsonParse(result.stdout.trim()));
    if (!parsed.success) return { complete: false, reason: "Remote preview cleanup returned invalid verification evidence." };
    return parsed.data;
  } catch {
    return { complete: false, reason: "SSH preview cleanup verification is unavailable." };
  }
}
