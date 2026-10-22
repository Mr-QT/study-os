import path from "node:path";

interface WavData {
  samples: Float32Array;
  sampleRate: number;
}

export function decodeWav(buffer: Buffer): WavData {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("仅支持 WAV 音频");
  }

  let offset = 12;
  let sampleRate = 0;
  let channels = 1;
  let bitsPerSample = 16;
  let dataStart = -1;
  let dataLength = 0;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      const audioFormat = buffer.readUInt16LE(body);
      if (audioFormat !== 1) throw new Error("仅支持 PCM WAV");
      channels = buffer.readUInt16LE(body + 2);
      sampleRate = buffer.readUInt32LE(body + 4);
      bitsPerSample = buffer.readUInt16LE(body + 14);
    } else if (id === "data") {
      dataStart = body;
      dataLength = Math.min(size, buffer.length - body);
    }
    offset = body + size + (size % 2);
  }

  if (dataStart < 0 || sampleRate === 0) throw new Error("WAV 缺少 fmt/data 块");
  if (bitsPerSample !== 16) throw new Error("仅支持 16-bit WAV");

  const frameCount = Math.floor(dataLength / (2 * channels));
  const samples = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      sum += buffer.readInt16LE(dataStart + (frame * channels + channel) * 2);
    }
    samples[frame] = sum / channels / 32768;
  }
  return { samples, sampleRate };
}

export function resampleTo16k(samples: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === 16000) return samples;
  const ratio = sampleRate / 16000;
  const length = Math.floor(samples.length / ratio);
  const output = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const position = index * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, samples.length - 1);
    const weight = position - left;
    output[index] = (samples[left] ?? 0) * (1 - weight) + (samples[right] ?? 0) * weight;
  }
  return output;
}

type AsrPipeline = (
  audio: Float32Array,
  options: { chunk_length_s: number },
) => Promise<{ text: string } | Array<{ text: string }>>;

let asrPromise: Promise<AsrPipeline> | null = null;

async function getAsr(): Promise<AsrPipeline> {
  if (!asrPromise) {
    asrPromise = (async () => {
      const { env, pipeline } = await import("@huggingface/transformers");
      env.remoteHost = process.env.HF_ENDPOINT ?? "https://hf-mirror.com";
      env.cacheDir = process.env.EMBEDDING_CACHE_DIR ?? path.join(process.cwd(), ".cache", "embeddings");
      const pipe = await pipeline(
        "automatic-speech-recognition",
        process.env.ASR_MODEL ?? "Xenova/whisper-tiny",
        { dtype: "q8" },
      );
      return pipe as unknown as AsrPipeline;
    })();
  }
  return asrPromise;
}

export async function transcribeAudio(buffer: Buffer): Promise<string> {
  const { samples, sampleRate } = decodeWav(buffer);
  const audio = resampleTo16k(samples, sampleRate);
  const asr = await getAsr();
  const result = await asr(audio, { chunk_length_s: 30 });
  if (Array.isArray(result)) {
    return result.map((item) => item.text).join(" ").trim();
  }
  return result.text.trim();
}
