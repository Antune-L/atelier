import type { ClipboardEvent } from "react";

import { api } from "@/lib/api";

const IMAGE_PREFIX = "image/";
const VIDEO_PREFIX = "video/";

function isMedia(type: string): boolean {
  return type.startsWith(IMAGE_PREFIX) || type.startsWith(VIDEO_PREFIX);
}

/**
 * Handles pasting an image/video into a text field: uploads the file and
 * appends a markdown line referencing the absolute path the agent can Read.
 * Returns true when a media file was handled (caller should preventDefault).
 */
export async function handleMediaPaste(
  event: ClipboardEvent<HTMLTextAreaElement>,
  appendText: (markdown: string) => void,
): Promise<boolean> {
  const items = Array.from(event.clipboardData.items);
  const fileItem = items.find((item) => item.kind === "file" && isMedia(item.type));
  if (!fileItem) return false;
  const file = fileItem.getAsFile();
  if (!file) return false;
  event.preventDefault();
  const result = await api.uploadFile(file);
  const isImage = file.type.startsWith(IMAGE_PREFIX);
  const line = isImage ? `![pasted-image](${result.path})` : `[pasted-file](${result.path})`;
  appendText(line);
  return true;
}
