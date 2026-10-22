import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

import { createWorker, OEM } from "tesseract.js";

const LANGUAGE_FILE = "eng.traineddata";
const LANGUAGE_URL = "https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz";

async function ensureLanguageData(cachePath: string): Promise<void> {
  const target = path.join(cachePath, LANGUAGE_FILE);
  if (existsSync(target) && statSync(target).size > 1_000_000) return;
  const response = await fetch(process.env.OCR_LANG_URL ?? LANGUAGE_URL);
  if (!response.ok) throw new Error(`OCR language download failed: ${response.status}`);
  const compressed = Buffer.from(await response.arrayBuffer());
  writeFileSync(target, gunzipSync(compressed));
}

export async function ocrImage(buffer: Buffer): Promise<string> {
  const cachePath = process.env.OCR_CACHE_DIR ?? path.join(process.cwd(), ".cache", "tesseract");
  mkdirSync(cachePath, { recursive: true });
  await ensureLanguageData(cachePath);
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    langPath: cachePath,
    cachePath,
    gzip: false,
    logger: () => undefined,
  });
  try {
    const result = await worker.recognize(buffer);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}
