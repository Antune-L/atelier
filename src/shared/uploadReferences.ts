const UPLOADS_DIR = "uploads";
const LOCAL_UPLOAD_REFERENCE_PATTERN = new RegExp(String.raw`!?\[[^\]\n]*\]\(/(?:[^)\n]*/)?${UPLOADS_DIR}/[\w.-]+\)\n?`, "g");

export function stripLocalUploadReferences(markdown: string): string {
  return markdown.replace(LOCAL_UPLOAD_REFERENCE_PATTERN, "");
}
