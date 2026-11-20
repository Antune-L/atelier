const TEXT_ENTRY_TAGS: ReadonlySet<string> = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export interface TextEntryCandidate {
  tagName: string;
  isContentEditable: boolean;
}

export function isTextEntryElement(element: TextEntryCandidate): boolean {
  return element.isContentEditable || TEXT_ENTRY_TAGS.has(element.tagName);
}
