import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config";
import { createLocalStorage, createStorage } from "../src/storage/adapter";

const temporaryDirs: string[] = [];

async function temporaryDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "study-os-storage-"));
  temporaryDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(temporaryDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("storage adapter", () => {
  it("writes, reads and deletes a local object", async () => {
    const dir = await temporaryDir();
    const storage = createLocalStorage(dir);
    const body = Buffer.from("hello storage", "utf8");

    await storage.put("abc.txt", body, "text/plain");
    expect(await storage.get("abc.txt")).toEqual(body);

    await storage.delete("abc.txt");
    await expect(storage.get("abc.txt")).rejects.toThrow();
  });

  it("defaults to local storage and rejects incomplete S3 config", async () => {
    const dir = await temporaryDir();
    expect(createStorage({ driver: "local", directory: dir }).kind).toBe("local");
    expect(() =>
      createStorage({
        driver: "s3",
        directory: dir,
        s3: undefined,
      }),
    ).toThrow(/S3/);
  });

  it("validates storage driver and S3 credentials in config", () => {
    const base = { DATABASE_URL: "postgres://example", SESSION_SECRET: "0123456789abcdef" };
    expect(loadConfig(base).storageDriver).toBe("local");
    expect(() => loadConfig({ ...base, STORAGE_DRIVER: "ftp" })).toThrow(/STORAGE_DRIVER/);
    expect(() => loadConfig({ ...base, STORAGE_DRIVER: "s3" })).toThrow(/S3_BUCKET/);
    expect(
      loadConfig({
        ...base,
        STORAGE_DRIVER: "s3",
        S3_BUCKET: "bucket",
        S3_REGION: "us-east-1",
        S3_ACCESS_KEY_ID: "key",
        S3_SECRET_ACCESS_KEY: "secret",
      }).storageDriver,
    ).toBe("s3");
  });
});
