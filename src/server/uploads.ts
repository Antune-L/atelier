import { extname, join } from "node:path";

import { nanoid } from "nanoid";

export const UPLOADS_DIR = "uploads";

/** Extension fallbacks by mime type when the file name carries none. */
const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

const SAFE_EXT = /^\.[a-z0-9]{1,5}$/;
const UPLOAD_ID_LENGTH = 16;

function resolveExtension(file: File): string {
  const fromName = extname(file.name).toLowerCase();
  if (SAFE_EXT.test(fromName)) return fromName;
  return MIME_EXTENSIONS[file.type] ?? ".bin";
}

export interface SavedUpload {
  /** Absolute path on disk — usable by the agent's Read tool. */
  path: string;
  /** Public URL the web UI can fetch for preview. */
  url: string;
}

/** Persist an uploaded file under <projectRoot>/uploads and return its locations. */
export async function saveUpload(projectRoot: string, file: File): Promise<SavedUpload> {
  const ext = resolveExtension(file);
  const name = `${nanoid(UPLOAD_ID_LENGTH)}${ext}`;
  const absolutePath = join(projectRoot, UPLOADS_DIR, name);
  await Bun.write(absolutePath, file);
  return { path: absolutePath, url: `/${UPLOADS_DIR}/${name}` };
}

const HTTP_NOT_FOUND = 404;
const SAFE_UPLOAD_NAME = /^[\w.-]+$/;

/** Serve a previously uploaded file by its public /uploads/<name> URL. */
export async function serveUpload(projectRoot: string, pathname: string): Promise<Response> {
  const name = pathname.slice(`/${UPLOADS_DIR}/`.length);
  if (!SAFE_UPLOAD_NAME.test(name)) return new Response("not found", { status: HTTP_NOT_FOUND });
  const file = Bun.file(join(projectRoot, UPLOADS_DIR, name));
  if (!(await file.exists())) return new Response("not found", { status: HTTP_NOT_FOUND });
  return new Response(file);
}
