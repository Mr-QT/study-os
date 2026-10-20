import type { ApiConfig } from "../config";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiCompletion {
  text: string;
  provider: string;
  model: string;
  promptChars: number;
  completionChars: number;
}

export interface AiProvider {
  name: string;
  model: string;
  complete(messages: AiMessage[]): Promise<AiCompletion>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly code = "AI_PROVIDER_ERROR",
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

const TIMEOUT_MS = 30_000;

function promptChars(messages: AiMessage[]): number {
  return messages.reduce((total, message) => total + message.content.length, 0);
}

function resolveBaseUrl(config: ApiConfig, provider: string): string {
  return (
    config.aiBaseUrl ??
    (provider === "ollama" ? "http://127.0.0.1:11434" : "https://api.openai.com/v1")
  ).replace(/\/$/, "");
}

function resolveModel(config: ApiConfig, provider: string): string {
  return config.aiModel ?? (provider === "ollama" ? "llama3.1" : "gpt-4o-mini");
}

function openAiProvider(config: ApiConfig): AiProvider {
  const base = resolveBaseUrl(config, "openai");
  const model = resolveModel(config, "openai");
  return {
    name: "openai",
    model,
    async complete(messages) {
      const response = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.aiApiKey ? { authorization: `Bearer ${config.aiApiKey}` } : {}),
        },
        body: JSON.stringify({ model, messages, temperature: 0.3 }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new AiProviderError(`provider returned HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (text.length === 0) throw new AiProviderError("provider returned an empty completion");
      return {
        text,
        provider: "openai",
        model,
        promptChars: promptChars(messages),
        completionChars: text.length,
      };
    },
  };
}

function ollamaProvider(config: ApiConfig): AiProvider {
  const base = resolveBaseUrl(config, "ollama");
  const model = resolveModel(config, "ollama");
  return {
    name: "ollama",
    model,
    async complete(messages) {
      const response = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, messages, stream: false }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new AiProviderError(`provider returned HTTP ${response.status}`);
      }
      const data = (await response.json()) as { message?: { content?: string } };
      const text = data.message?.content?.trim() ?? "";
      if (text.length === 0) throw new AiProviderError("provider returned an empty completion");
      return {
        text,
        provider: "ollama",
        model,
        promptChars: promptChars(messages),
        completionChars: text.length,
      };
    },
  };
}

/**
 * Returns null when no usable provider is configured. No key means no calls;
 * an OpenAI-compatible provider without a key is treated as disabled.
 */
export function createAiProvider(config: ApiConfig): AiProvider | null {
  const provider = config.aiProvider ?? "disabled";
  switch (provider) {
    case "openai":
      return config.aiApiKey ? openAiProvider(config) : null;
    case "ollama":
      return ollamaProvider(config);
    default:
      return null;
  }
}
