import { and, eq } from "drizzle-orm";

import { knowledgeChunks, notes, questions, type Db } from "@study-os/db";

import { cosineSimilarity, type Embedder } from "./embedder";

const CHUNK_SIZE = 700;
const CHUNK_OVERLAP = 100;
const MAX_CANDIDATES = 5000;

export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const normalized = text.replace(/\s+\n/g, "\n").trim();
  if (normalized.length === 0) return [];
  if (normalized.length <= size) return [normalized];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + size, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end === normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export async function indexSource(
  db: Db,
  embedder: Embedder,
  input: {
    spaceId: string;
    sourceType: "note" | "question";
    sourceId: string;
    title: string;
    content: string;
  },
): Promise<number> {
  await db
    .delete(knowledgeChunks)
    .where(
      and(
        eq(knowledgeChunks.sourceType, input.sourceType),
        eq(knowledgeChunks.sourceId, input.sourceId),
      ),
    );

  const text = `${input.title}\n${input.content}`.trim();
  const chunks = chunkText(text);
  if (chunks.length === 0) return 0;

  const embeddings = await embedder(chunks);
  await db.insert(knowledgeChunks).values(
    chunks.map((content, index) => ({
      spaceId: input.spaceId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      chunkIndex: index,
      content,
      embedding: JSON.stringify(embeddings[index] ?? []),
    })),
  );
  return chunks.length;
}

export async function reindexSpace(
  db: Db,
  embedder: Embedder,
  spaceId: string,
): Promise<{ notes: number; questions: number; chunks: number }> {
  const noteRows = await db.select().from(notes).where(eq(notes.spaceId, spaceId));
  const questionRows = await db.select().from(questions).where(eq(questions.spaceId, spaceId));

  let chunkCount = 0;
  for (const note of noteRows) {
    chunkCount += await indexSource(db, embedder, {
      spaceId,
      sourceType: "note",
      sourceId: note.id,
      title: note.title,
      content: note.contentMd,
    });
  }
  for (const question of questionRows) {
    chunkCount += await indexSource(db, embedder, {
      spaceId,
      sourceType: "question",
      sourceId: question.id,
      title: question.prompt,
      content: `${question.answer}\n${question.explanation ?? ""}`,
    });
  }
  return { notes: noteRows.length, questions: questionRows.length, chunks: chunkCount };
}

export interface SemanticHit {
  sourceType: "note" | "question";
  sourceId: string;
  title: string;
  snippet: string;
  score: number;
}

export async function semanticSearch(
  db: Db,
  embedder: Embedder,
  spaceId: string,
  query: string,
  limit = 8,
): Promise<SemanticHit[]> {
  const [queryEmbedding] = await embedder([query]);
  if (!queryEmbedding) return [];

  const rows = await db
    .select()
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.spaceId, spaceId))
    .limit(MAX_CANDIDATES);

  const scored = rows.map((row) => {
    let embedding: number[] = [];
    try {
      embedding = JSON.parse(row.embedding) as number[];
    } catch {
      embedding = [];
    }
    const score = cosineSimilarity(queryEmbedding, embedding);
    return { row, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const results: SemanticHit[] = [];
  for (const { row, score } of scored) {
    const key = `${row.sourceType}:${row.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      title: row.content.split("\n")[0]?.slice(0, 120) ?? "",
      snippet: row.content.slice(0, 200),
      score: Number(score.toFixed(4)),
    });
    if (results.length >= limit) break;
  }
  return results;
}
