const DIACRITICS_REGEX = /\p{Diacritic}/gu;

export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_REGEX, "").toLowerCase().trim();
}

export function matchesQuery(query: string, ...texts: string[]): boolean {
  if (query === "") return true;
  return normalizeSearch(texts.join(" ")).includes(query);
}
