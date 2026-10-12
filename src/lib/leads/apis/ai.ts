// The AI (Claude, through ANTHROPIC_API_KEY): briefs, scripts, and
// reading pages that don't have a feed. Every answer comes back as JSON
// in a set shape. Server only.

import { ApiError, callJson } from "./http";
import { track, type Who } from "../usage";

export const aiReady = () => Boolean(process.env.ANTHROPIC_API_KEY);

/** Newest first; the next one is tried if an account can't use a model. */
const MODELS = {
  fast: [
    process.env.LEADS_AI_FAST_MODEL,
    "claude-haiku-5-5",
    "claude-haiku-4-5",
  ],
  good: [process.env.LEADS_AI_MODEL, "claude-sonnet-5-5", "claude-sonnet-4-5"],
};

/** Dollars per million tokens in and out, for the usage estimate. */
const RATES = { fast: [1, 5], good: [3, 15] } as const;

/** Models this server found it can't use, so it stops asking for them. */
const unavailable = new Set<string>();

export async function askJson<T>(options: {
  model: keyof typeof MODELS;
  system: string;
  prompt: string;
  /** JSON schema for the answer (an object). */
  schema: Record<string, unknown>;
  maxTokens?: number;
  who: Who;
  /** Pictures to look at with the prompt (base64, no data: prefix). */
  images?: { mime: string; data: string }[];
  /**
   * Gets the call's cost instead of the Leads Tool's usage count (the
   * audit keeps its own), in millionths of a dollar.
   */
  onCost?: (micros: number) => void;
}): Promise<T | undefined> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return undefined;
  const models = MODELS[options.model].filter(
    (m): m is string => Boolean(m) && !unavailable.has(m!),
  );
  for (const model of models) {
    try {
      const res = await callJson<{
        content?: { type: string; input?: unknown }[];
        usage?: { input_tokens?: number; output_tokens?: number };
      }>("AI", "https://api.anthropic.com/v1/messages", {
        method: "POST",
        timeout: 60_000,
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens ?? 1500,
          system: options.system,
          messages: [
            {
              role: "user",
              content: options.images?.length
                ? [
                    ...options.images.map((image) => ({
                      type: "image",
                      source: {
                        type: "base64",
                        media_type: image.mime,
                        data: image.data,
                      },
                    })),
                    { type: "text", text: options.prompt },
                  ]
                : options.prompt,
            },
          ],
          tools: [
            {
              name: "answer",
              description: "Give the answer in this exact shape.",
              input_schema: options.schema,
            },
          ],
          tool_choice: { type: "tool", name: "answer" },
        }),
      });
      const [inRate, outRate] = RATES[options.model];
      const cost =
        (res.usage?.input_tokens ?? 0) * inRate +
        (res.usage?.output_tokens ?? 0) * outRate;
      if (options.onCost) options.onCost(cost);
      else track("ai", options.who, 1, cost);
      const answer = res.content?.find((c) => c.type === "tool_use")?.input;
      return answer as T | undefined;
    } catch (error) {
      // A model this account can't use: try the next one.
      if (
        error instanceof ApiError &&
        (error.status === 404 ||
          (error.status === 400 && /model/i.test(error.message)))
      ) {
        unavailable.add(model);
        continue;
      }
      throw error;
    }
  }
  return undefined;
}
