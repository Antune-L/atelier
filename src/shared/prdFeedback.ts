import type { PrdAnnotation } from "./schemas.ts";

export function compileFeedback(annotations: PrdAnnotation[], generalNote: string): string {
  const parts: string[] = [];
  if (annotations.length > 0) {
    const count = annotations.length;
    parts.push(`Retours sur le PRD (${count} annotation${count > 1 ? "s" : ""}) :`);
    annotations.forEach((a, i) => {
      parts.push(`${i + 1}. Concernant « ${a.quote} » :\n   ${a.comment}`);
    });
  }
  const note = generalNote.trim();
  if (note) parts.push(`Retour général :\n${note}`);
  return parts.join("\n\n");
}
