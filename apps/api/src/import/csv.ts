export interface ParsedRow {
  rowNumber: number;
  values: Record<string, string>;
  valid: boolean;
  error: string | null;
  payload: Record<string, string> | null;
}

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((item) => item.some((cell) => cell.trim().length > 0));
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "");
}

function isDate(value: string): boolean {
  return value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function validateRow(
  kind: "tasks" | "questions",
  values: Record<string, string>,
  rowNumber: number,
): ParsedRow {
  if (kind === "tasks") {
    const title = values.title ?? "";
    if (!title) {
      return { rowNumber, values, valid: false, error: "缺少 title", payload: null };
    }
    if (values.dueat && !isDate(values.dueat)) {
      return { rowNumber, values, valid: false, error: "dueAt 不是合法时间", payload: null };
    }
    const status = values.status ?? "";
    if (status && !["todo", "in_progress", "done", "archived"].includes(status)) {
      return { rowNumber, values, valid: false, error: "status 不合法", payload: null };
    }
    const payload: Record<string, string> = { title };
    if (values.notes) payload.notes = values.notes;
    if (values.dueat) payload.dueAt = values.dueat;
    if (status) payload.status = status;
    return { rowNumber, values, valid: true, error: null, payload };
  }

  const prompt = values.prompt ?? "";
  const answer = values.answer ?? "";
  if (!prompt || !answer) {
    return { rowNumber, values, valid: false, error: "缺少 prompt 或 answer", payload: null };
  }
  const payload: Record<string, string> = { prompt, answer };
  if (values.explanation) payload.explanation = values.explanation;
  return { rowNumber, values, valid: true, error: null, payload };
}

export function previewRows(kind: "tasks" | "questions", csv: string): ParsedRow[] {
  const rows = parseCsv(csv);
  if (rows.length === 0) return [];
  const headers = rows[0]?.map(normalizeHeader) ?? [];

  return rows.slice(1).map((cells, index) => {
    const values: Record<string, string> = {};
    headers.forEach((header, column) => {
      values[header] = (cells[column] ?? "").trim();
    });
    return validateRow(kind, values, index + 2);
  });
}

export function previewJsonRows(kind: "tasks" | "questions", text: string): ParsedRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }

  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : typeof parsed === "object" &&
          parsed !== null &&
          Array.isArray((parsed as { rows?: unknown }).rows)
        ? (parsed as { rows: unknown[] }).rows
        : [];

  return list
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => {
      const values: Record<string, string> = {};
      for (const [key, value] of Object.entries(item)) {
        values[normalizeHeader(key)] = String(value ?? "").trim();
      }
      return validateRow(kind, values, index + 1);
    });
}

/** Accepts either CSV or a JSON array/object with items/rows. */
export function previewImportRows(kind: "tasks" | "questions", text: string): ParsedRow[] {
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return previewJsonRows(kind, trimmed);
  }
  return previewRows(kind, text);
}
