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
 * Build the configured provider, or null when AI is disabled / misconfigured.
 * `provider` and `model` come from vars; the key is a secret.
 */
export function createProvider(
  provider: string | undefined,
  model: string | undefined,
  apiKey: string | undefined,
): AiProvider | null {
  const kind = (provider ?? 'none').trim().toLowerCase();
  if (kind === 'none' || !apiKey) return null;
  const resolvedModel = (model ?? '').trim();
  switch (kind) {
    case 'anthropic':
      return new AnthropicProvider(resolvedModel || 'claude-haiku-4-5', apiKey);
    case 'openai':
      return new OpenAiProvider(resolvedModel || 'gpt-4o-mini', apiKey);
    default:
      return null;
  }
}
