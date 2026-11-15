// Qwen (HuggingFace) LLM Summary Provider
// ------------------------------------------------------------
// This provider uses the OpenAI compatible SDK to call the Qwen 3.8‑27B model
// hosted via HuggingFace's router.  The token is taken from the environment
// variable HF_TOKEN (or supplied via the constructor) – we never commit the
// literal token to the repo.

import { OpenAI } from "openai";
import type { ISummaryProvider, SummaryContext, SummaryResult } from "./summary-provider.js";
import { RuleBasedSummaryProvider } from "./summary-provider.js";

export interface QwenProviderConfig {
  apiKey?: string; // defaults to process.env.HF_TOKEN
  model?: string; // default: "Qwen/Qwen3.8-27B:deepinfra"
  allowExternalApi: boolean; // opt‑in flag – must be true to call the API
  fallbackToRuleBased?: boolean; // default true
  fetchFn?: typeof fetch; // injectable for testing
}

export class QwenSummaryProvider implements ISummaryProvider {
  public readonly name: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly allowExternalApi: boolean;
  private readonly fallbackProvider: RuleBasedSummaryProvider;
  private readonly fallbackToRuleBased: boolean;
  private readonly fetchFn: typeof fetch;
  private client: OpenAI;

  constructor(config: QwenProviderConfig) {
    this.allowExternalApi = config.allowExternalApi;
    this.fallbackToRuleBased = config.fallbackToRuleBased ?? true;
    this.apiKey = config.apiKey ?? process.env.HF_TOKEN ?? "";
    this.model = config.model ?? "Qwen/Qwen3.8-27B:deepinfra";
    this.name = `qwen:${this.model}`;
    this.fallbackProvider = new RuleBasedSummaryProvider();
    this.fetchFn = config.fetchFn ?? globalThis.fetch;

    // Initialise the OpenAI‑compatible client – the router expects the API key
    // in the Authorization header.
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: "https://router.huggingface.co/v1",
      fetch: this.fetchFn,
    });
  }

  public async summarize(context: SummaryContext): Promise<SummaryResult> {
    // 1️⃣ Privacy guard – external API must be explicitly allowed.
    if (!this.allowExternalApi) {
      if (this.fallbackToRuleBased) return this.fallbackProvider.summarize(context);
      throw new Error(
        "External LLM analysis is disabled. Set allowExternalApi: true to opt‑in.",
      );
    }

    // 2️⃣ API key validation.
    if (!this.apiKey) {
      if (this.fallbackToRuleBased) return this.fallbackProvider.summarize(context);
      throw new Error("HF_TOKEN is not configured for Qwen summary provider.");
    }

    try {
      const prompt = this.buildPrompt(context);

      const chatCompletion = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
      });

      const summary = chatCompletion.choices[0].message?.content?.
        // The OpenAI SDK may return a string or an array of content parts.
        // Normalise to a plain string.
        (Array.isArray(chatCompletion.choices[0].message.content)
          ? (chatCompletion.choices[0].message.content as any)
              .map((c: any) => c.text ?? "")
              .join("")
          : chatCompletion.choices[0].message.content) ?? "";

      if (!summary.trim()) {
        throw new Error("Empty response from Qwen model.");
      }

      return {
        summary: summary.trim(),
        model: this.name,
        confidence: 0.92, // heuristic – the model does not return a confidence score
        sanitized: false,
      };
    } catch (err) {
      // If the remote call fails, fall back to the deterministic rule‑based
      // provider (if configured) so the pipeline never crashes.
      if (this.fallbackToRuleBased) {
        const fallback = await this.fallbackProvider.summarize(context);
        return {
          ...fallback,
          summary: `${fallback.summary} [Qwen fallback: ${(err as Error).message}]`,
        };
      }
      throw err;
    }
  }

  private buildPrompt(context: SummaryContext): string {
    const { platform, section, category, ocrText, entities, flags } = context;
    const entityList = entities.map((e) => `${e.type}: ${e.value}`).join(", ");
    return `You are a forensic analyst preparing a Panchnama report.
Platform: ${platform}
Section: ${section} (category: ${category})
Flags: ${flags.join(", ") || "None"}
Entities: ${entityList || "None"}
OCR excerpt (first 500 chars): ${ocrText.substring(0, 500)}

Provide a concise two‑sentence factual summary without speculation.`;
  }
}

