import json
import os
import re
import subprocess
import sys

REGISTRY_PATH = os.environ.get("KANBAN_PREVIEW_REGISTRY", "/var/lib/kanban-preview/registry.json")
CLEANUP_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "previewCleanup.py")
UUID_PATTERN = re.compile(r"^[a-z0-9]{24}$")
MAX_REQUEST_BYTES = 8192
MAX_DEPLOYMENTS = 64
CLEANUP_TIMEOUT_SECONDS = 45


def reply(result):
    sys.stdout.write(json.dumps(result) + "\n")
    sys.stdout.flush()


def refuse(reason):
    reply({"complete": False, "reason": reason})


def main():
    line = sys.stdin.readline(MAX_REQUEST_BYTES)
    try:
        request = json.loads(line)
    except ValueError:
        return refuse("Invalid cleanup request.")
    if not isinstance(request, dict):
        return refuse("Invalid cleanup request.")
    app_uuid = request.get("appUuid")
    mode = request.get("mode")
    deployments = request.get("deploymentUuids")
    if not isinstance(app_uuid, str) or not UUID_PATTERN.match(app_uuid):
        return refuse("Invalid application identifier.")
    if mode not in ("remove", "verify"):
        return refuse("Invalid cleanup mode.")
    if not isinstance(deployments, list) or len(deployments) > MAX_DEPLOYMENTS or not all(isinstance(uuid, str) and UUID_PATTERN.match(uuid) for uuid in deployments):
        return refuse("Invalid deployment identifiers.")
    try:
        with open(REGISTRY_PATH, encoding="utf-8") as handle:
            registry = json.load(handle)
    except (OSError, ValueError):
        return refuse("The preview broker registry is unavailable.")
    entry = registry.get("apps", {}).get(app_uuid) if isinstance(registry, dict) else None
    if not isinstance(entry, dict):
        return refuse("The application is not a broker-owned preview.")
    owned = entry.get("deployments") if isinstance(entry.get("deployments"), list) else []
    if any(uuid not in owned for uuid in deployments):
        return refuse("A deployment is not owned by this preview.")
    try:
        completed = subprocess.run([sys.executable, "-I", CLEANUP_SCRIPT, app_uuid, mode, *deployments], capture_output=True, text=True, timeout=CLEANUP_TIMEOUT_SECONDS, check=False)
    except subprocess.TimeoutExpired:
        return refuse("Preview cleanup timed out.")
    lines = completed.stdout.strip().splitlines()
    try:
        result = json.loads(lines[-1]) if lines else None
    except ValueError:
        result = None
    if not isinstance(result, dict) or not isinstance(result.get("complete"), bool):
        return refuse("Preview cleanup returned an invalid result.")
    reply({key: result[key] for key in ("complete", "reason", "retryable") if key in result})


main()
