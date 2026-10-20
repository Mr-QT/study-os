export type Embedder = (texts: string[]) => Promise<number[][]>;

type TensorOutput = { dims: number[]; data: Float32Array };

type Extractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<TensorOutput>;

let extractorPromise: Promise<Extractor> | null = null;

async function loadExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { env, pipeline } = await import("@huggingface/transformers");
      env.remoteHost = process.env.HF_ENDPOINT ?? "https://hf-mirror.com";
      env.cacheDir = process.env.EMBEDDING_CACHE_DIR ?? ".cache/embeddings";
      const pipe = await pipeline(
        "feature-extraction",
        process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2",
        { dtype: "q8" },
      );
      return pipe as unknown as Extractor;
    })();
  }
  return extractorPromise;
}

/** Local sentence embeddings (no external API). First call downloads the model. */
export function createLocalEmbedder(): Embedder {
  return async (texts) => {
    if (texts.length === 0) return [];
    const extractor = await loadExtractor();
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    const rows = output.dims[0] ?? 0;
    const dims = output.dims[1] ?? 0;
    const data = Array.from(output.data);
    return Array.from({ length: rows }, (_, row) =>
      data.slice(row * dims, (row + 1) * dims),
    );
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const x = a[index] ?? 0;
    const y = b[index] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
