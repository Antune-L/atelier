import Papa from "papaparse";

import { IMPORT_MAX_ROWS } from "@shared/constants";

export interface ParsedTicketRow {
  /** 1-based data-row number (excludes the header), for surfacing errors to the user. */
  line: number;
  title: string;
  description: string;
}

export interface CsvParseError {
  /** 1-based data-row number, or 0 for whole-file errors (missing header, empty file…). */
  line: number;
  message: string;
}

export interface ParsedTicketsCsv {
  rows: ParsedTicketRow[];
  errors: CsvParseError[];
  /** Non-blocking warnings (e.g. ignored unknown columns). */
  warnings: string[];
}

const TITLE_HEADER = "title";
const DESCRIPTION_HEADER = "description";
const WHOLE_FILE_LINE = 0;

/** Normalize a header cell: lowercased, trimmed, so "Title " matches "title". */
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

/**
 * Parse a `title,description` CSV (RFC-4180) into ticket rows + blocking errors. Robust to
 * quoted multi-line descriptions (papaparse). Unknown columns are ignored with a warning;
 * a missing `title` header, empty file, any blank-title row, or exceeding IMPORT_MAX_ROWS are
 * blocking errors. Mirrors the server-side re-validation.
 */
export function parseTicketsCsv(text: string): ParsedTicketsCsv {
  const errors: CsvParseError[] = [];
  const warnings: string[] = [];

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });

  const headers = result.meta.fields ?? [];
  if (!headers.includes(TITLE_HEADER)) {
    errors.push({ line: WHOLE_FILE_LINE, message: "En-tête « title » absente (attendu : title,description)." });
    return { rows: [], errors, warnings };
  }

  // A "FieldMismatch" row (e.g. an unquoted extra comma) still yields a usable record, so it is a
  // non-blocking warning; only structural quoting/delimiter errors make the file unparseable.
  for (const parseError of result.errors) {
    const line = typeof parseError.row === "number" ? parseError.row + 1 : WHOLE_FILE_LINE;
    if (parseError.type === "FieldMismatch") {
      warnings.push(`Ligne ${line} : ${parseError.message}`);
      continue;
    }
    errors.push({ line, message: `CSV illisible : ${parseError.message}` });
  }

  const unknownHeaders = headers.filter((h) => h !== TITLE_HEADER && h !== DESCRIPTION_HEADER);
  if (unknownHeaders.length > 0) {
    warnings.push(`Colonnes ignorées : ${unknownHeaders.join(", ")}.`);
  }

  const rows: ParsedTicketRow[] = [];
  result.data.forEach((record, index) => {
    const line = index + 1;
    const title = (record[TITLE_HEADER] ?? "").trim();
    const description = record[DESCRIPTION_HEADER] ?? "";
    if (title.length === 0) {
      errors.push({ line, message: `Ligne ${line} : titre manquant.` });
      return;
    }
    rows.push({ line, title, description });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ line: WHOLE_FILE_LINE, message: "Aucune ligne de données détectée." });
  }

  const total = rows.length + errors.filter((e) => e.line !== WHOLE_FILE_LINE).length;
  if (total > IMPORT_MAX_ROWS) {
    errors.push({
      line: WHOLE_FILE_LINE,
      message: `Trop de lignes (${total}) : maximum ${IMPORT_MAX_ROWS} par import.`,
    });
  }

  return { rows, errors, warnings };
}
