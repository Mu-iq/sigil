import type { Env } from '../env.js';
import { createProvider } from './provider.js';
import type { AiProvider } from './types.js';

/** True only when the operator has explicitly turned the feature on. */
export function aiSummaryEnabled(env: Env): boolean {
  return (env.ENABLE_AI_SUMMARY ?? '').trim().toLowerCase() === 'true';
}

/**
 * The gated entry point: returns a provider ONLY when the summary feature is
 * explicitly enabled AND the selected provider's requirements are met. Returns
 * null otherwise, so the scheduled job skips all AI work and the request path
 * never touches a provider. This is the single switch the rest of the app uses.
 */
export function resolveAiProvider(env: Env): AiProvider | null {
  if (!aiSummaryEnabled(env)) return null;
  return createProvider({
    provider: env.AI_PROVIDER,
    model: env.AI_MODEL,
    apiKey: env.AI_API_KEY,
    ai: env.AI,
  });
}
