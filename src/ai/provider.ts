import type { AiProvider } from './types.js';

const MAX_TOKENS = 160;

/**
 * Anthropic Messages API provider. Uses raw fetch (Workers has no SDK). We omit
 * `temperature` and `thinking` deliberately so the same request is valid whether
 * AI_MODEL points at Haiku or an Opus/Sonnet tier (those reject sampling params
 * and `budget_tokens`). Handles the `refusal` stop reason by returning null.
 */
class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  constructor(
    readonly model: string,
    private readonly apiKey: string,
  ) {}

  async complete(
    system: string,
    user: string,
    timeoutMs: number,
  ): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: 'user', content: user }],
        }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        stop_reason?: string;
        content?: Array<{ type: string; text?: string }>;
      };
      if (body.stop_reason === 'refusal') return null;
      const text = body.content?.find((b) => b.type === 'text')?.text;
      return text?.trim() || null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** OpenAI Chat Completions provider. */
class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  constructor(
    readonly model: string,
    private readonly apiKey: string,
  ) {}

  async complete(
    system: string,
    user: string,
    timeoutMs: number,
  ): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: MAX_TOKENS,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = body.choices?.[0]?.message?.content;
      return text?.trim() || null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Cloudflare Workers AI provider. Runs on the same Cloudflare account via the
 * `AI` binding — no external API key needed, which makes it the cheapest path
 * for self-hosters who want the summary. Uses a text-generation model.
 */
class WorkersAiProvider implements AiProvider {
  readonly name = 'workers-ai';
  constructor(
    readonly model: string,
    private readonly binding: Ai,
  ) {}

  async complete(system: string, user: string): Promise<string | null> {
    try {
      // The AI binding has no per-call abort; the cron already bounds itself.
      const result = (await this.binding.run(this.model, {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      })) as { response?: string };
      return result.response?.trim() || null;
    } catch {
      return null;
    }
  }
}

/** Requirements the configured provider needs before it can be built. */
export interface ProviderConfig {
  provider: string | undefined;
  model: string | undefined;
  apiKey: string | undefined;
  ai: Ai | undefined;
}

/**
 * Build the configured provider, or null when it can't be satisfied (missing
 * key for anthropic/openai, or missing `AI` binding for workers-ai). This does
 * NOT check the enable flag — see resolveAiProvider() for the gated entry point.
 */
export function createProvider(config: ProviderConfig): AiProvider | null {
  const kind = (config.provider ?? '').trim().toLowerCase();
  const resolvedModel = (config.model ?? '').trim();
  switch (kind) {
    case 'anthropic':
      return config.apiKey
        ? new AnthropicProvider(resolvedModel || 'claude-haiku-4-5', config.apiKey)
        : null;
    case 'openai':
      return config.apiKey
        ? new OpenAiProvider(resolvedModel || 'gpt-4o-mini', config.apiKey)
        : null;
    case 'workers-ai':
      return config.ai
        ? new WorkersAiProvider(
            resolvedModel || '@cf/meta/llama-3.1-8b-instruct',
            config.ai,
          )
        : null;
    default:
      return null;
  }
}
