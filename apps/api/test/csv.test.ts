import { describe, expect, it } from "vitest";

import { parseCsv, previewRows } from "../src/import/csv";

describe("CSV import parsing", () => {
  it("parses quoted commas, newlines and escaped quotes", () => {
    const rows = parseCsv('title,notes\n"任务, 一","第一行\n第二行"\n"说 ""好""",ok\n');
    expect(rows).toEqual([
      ["title", "notes"],
      ["任务, 一", "第一行\n第二行"],
      ['说 "好"', "ok"],
    ]);
  });

  it("strips a UTF-8 BOM and ignores blank rows", () => {
    const rows = parseCsv("\uFEFFtitle\n\n任务\n");
    expect(rows).toEqual([["title"], ["任务"]]);
  });

  it("validates task rows and reports row numbers", () => {
    const rows = previewRows(
      "tasks",
      "title,dueAt,status\n复习,2026-11-01T09:00:00Z,todo\n,2026-11-01,bad\n",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.valid).toBe(true);
    expect(rows[1]?.valid).toBe(false);
    expect(rows[1]?.error).toContain("title");
    expect(rows[1]?.rowNumber).toBe(3);
  });

  it("requires prompt and answer for questions", () => {
    const rows = previewRows("questions", "prompt,answer\n1+1,2\n,缺少\n");
    expect(rows[0]?.valid).toBe(true);
    expect(rows[1]?.error).toContain("prompt");
  });
});
