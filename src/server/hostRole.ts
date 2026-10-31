const CLOUD_HOST_ROLE = "cloud";

export function isCloudHost(): boolean {
  return process.env.KANBAN_HOST_ROLE === CLOUD_HOST_ROLE;
}
