import { join } from "node:path";

export interface PackageManager {
  name: string;
  lockfiles: readonly string[];
  runner: string;
  install: string;
  frozenInstall: string;
}

export interface ResolvedPackageManager {
  manager: PackageManager;
  lockfile: string | null;
}

const YARN_LOCKFILE = "yarn.lock";
const YARN_BERRY_CONFIG_FILE = ".yarnrc.yml";
const YARN_CLASSIC_MAJOR = 1;

const PACKAGE_MANAGERS: readonly PackageManager[] = [
  { name: "bun", lockfiles: ["bun.lock", "bun.lockb"], runner: "bun run", install: "bun install", frozenInstall: "bun install --frozen-lockfile" },
  { name: "pnpm", lockfiles: ["pnpm-lock.yaml"], runner: "pnpm", install: "pnpm install", frozenInstall: "pnpm install --frozen-lockfile" },
  { name: "yarn", lockfiles: [YARN_LOCKFILE], runner: "yarn", install: "yarn install", frozenInstall: "yarn install --frozen-lockfile" },
  { name: "npm", lockfiles: ["package-lock.json"], runner: "npm run", install: "npm install", frozenInstall: "npm ci" },
];

// NOTE: Yarn 2+ (detected via `.yarnrc.yml` or `packageManager`) renamed `--frozen-lockfile` to `--immutable`.
const YARN_BERRY: PackageManager = { name: "yarn", lockfiles: [YARN_LOCKFILE], runner: "yarn", install: "yarn install", frozenInstall: "yarn install --immutable" };

const LOCKFILE_NAMES: readonly string[] = PACKAGE_MANAGERS.flatMap((manager) => manager.lockfiles);
const PACKAGE_MANAGER_MARKER_FILES: readonly string[] = [...LOCKFILE_NAMES, YARN_BERRY_CONFIG_FILE];
const DEFAULT_SCRIPT_RUNNER = "npm run";
const DEFAULT_INSTALL_COMMAND = "bun install";
const DEFAULT_VALIDATION_INSTALL_COMMAND = "bun install --no-save";
const NPM_RUNNER_NAME = "npm";
const NPM_ARGUMENT_SEPARATOR = " --";
const DECLARED_MANAGER_PATTERN = /^([a-z]+)(?:@(\d+))?/;

function withYarnFlavour(manager: PackageManager, declaredMajor: number | null, presentFiles: readonly string[]): PackageManager {
  if (manager.name !== "yarn") return manager;
  const berry = declaredMajor !== null ? declaredMajor > YARN_CLASSIC_MAJOR : presentFiles.includes(YARN_BERRY_CONFIG_FILE);
  return berry ? YARN_BERRY : manager;
}

export function resolvePackageManager(declared: string | undefined, presentFiles: readonly string[]): ResolvedPackageManager | null {
  const match = declared ? DECLARED_MANAGER_PATTERN.exec(declared.trim()) : null;
  const declaredMajor = match?.[2] ? Number(match[2]) : null;
  const declaredManager = PACKAGE_MANAGERS.find((manager) => manager.name === match?.[1]);
  if (declaredManager) {
    return {
      manager: withYarnFlavour(declaredManager, declaredMajor, presentFiles),
      lockfile: declaredManager.lockfiles.find((file) => presentFiles.includes(file)) ?? null,
    };
  }
  const lockfile = LOCKFILE_NAMES.find((file) => presentFiles.includes(file));
  const manager = PACKAGE_MANAGERS.find((candidate) => lockfile !== undefined && candidate.lockfiles.includes(lockfile));
  return manager && lockfile ? { manager: withYarnFlavour(manager, null, presentFiles), lockfile } : null;
}

export async function presentPackageManagerFiles(directory: string): Promise<string[]> {
  const present = await Promise.all(
    PACKAGE_MANAGER_MARKER_FILES.map(async (file) => ((await Bun.file(join(directory, file)).exists()) ? file : null)),
  );
  return present.filter((file) => file !== null);
}

export function scriptRunner(resolved: ResolvedPackageManager | null): string {
  return resolved?.manager.runner ?? DEFAULT_SCRIPT_RUNNER;
}

// NOTE: npm needs `--` before flags meant for the script; bun, pnpm and yarn append them as-is.
export function scriptArgumentSeparator(resolved: ResolvedPackageManager | null): string {
  return (resolved?.manager.name ?? NPM_RUNNER_NAME) === NPM_RUNNER_NAME ? NPM_ARGUMENT_SEPARATOR : "";
}

export function installCommand(resolved: ResolvedPackageManager | null, validation: boolean): string {
  if (!resolved) return validation ? DEFAULT_VALIDATION_INSTALL_COMMAND : DEFAULT_INSTALL_COMMAND;
  return validation && resolved.lockfile ? resolved.manager.frozenInstall : resolved.manager.install;
}
