import { describe, expect, it } from "vitest";

import { decodeWav, resampleTo16k } from "../src/media/transcribe";

function wavBuffer(sampleRate: number, seconds: number): Buffer {
  const frames = Math.floor(sampleRate * seconds);
  const data = Buffer.alloc(frames * 2);
  for (let frame = 0; frame < frames; frame += 1) {
    const value = Math.sin((2 * Math.PI * 440 * frame) / sampleRate) * 0.5;
    data.writeInt16LE(Math.round(value * 32767), frame * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

describe("WAV decoding", () => {
  it("decodes 16-bit mono PCM", () => {
    const decoded = decodeWav(wavBuffer(8000, 0.1));
    expect(decoded.sampleRate).toBe(8000);
    expect(decoded.samples).toHaveLength(800);
    expect(Math.max(...decoded.samples)).toBeGreaterThan(0.4);
  });

  it("resamples to 16kHz", () => {
    const decoded = decodeWav(wavBuffer(8000, 0.1));
    expect(resampleTo16k(decoded.samples, decoded.sampleRate)).toHaveLength(1600);
  });

  it("rejects non-WAV input", () => {
    expect(() => decodeWav(Buffer.from("not a wav"))).toThrow(/WAV/);
  });
});
