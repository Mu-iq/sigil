import { describe, expect, it } from 'vitest';
import {
  aiSummaryEnabled,
  buildSummaryPrompt,
  generateSummary,
  resolveAiProvider,
} from '../src/ai/index.js';
import { createProvider } from '../src/ai/provider.js';
import type { Env } from '../src/env.js';
import type { AiProvider, SummarySignals } from '../src/ai/types.js';

function env(partial: Partial<Env>): Env {
  return { CACHE: {} as KVNamespace, ...partial } as Env;
}

const SIGNALS: SummarySignals = {
  login: 'mu-iq',
  name: 'Mu',
  totalStars: 1200,
  totalCommits: 4500,
  totalPRs: 80,
  totalContributions: 3000,
  followers: 100,
  repoCount: 30,
  topLanguages: ['TypeScript', 'Go'],
};

function stubProvider(reply: string | null): AiProvider {
  return {
    name: 'stub',
    model: 'stub-model',
    complete: async () => reply,
  };
}

describe('buildSummaryPrompt', () => {
  it('includes the public signals and languages', () => {
    const prompt = buildSummaryPrompt(SIGNALS);
    expect(prompt).toContain('@mu-iq');
    expect(prompt).toContain('TypeScript, Go');
    expect(prompt).toContain('Total stars earned: 1200');
  });

  it('falls back gracefully when no languages are known', () => {
    expect(buildSummaryPrompt({ ...SIGNALS, topLanguages: [] })).toContain(
      'various languages',
    );
  });
});

describe('generateSummary', () => {
  it('sanitizes whitespace and returns the cleaned blurb', async () => {
    const out = await generateSummary(
      stubProvider('  Builds\n\n  typed TypeScript tools.  '),
      SIGNALS,
      5000,
    );
    expect(out).toBe('Builds typed TypeScript tools.');
  });

  it('returns null when the provider declines', async () => {
    expect(await generateSummary(stubProvider(null), SIGNALS, 5000)).toBeNull();
  });

  it('truncates an over-long summary with an ellipsis', async () => {
    const long = 'a'.repeat(400);
    const out = await generateSummary(stubProvider(long), SIGNALS, 5000);
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(220);
    expect(out!.endsWith('…')).toBe(true);
  });
});

describe('createProvider', () => {
  it('returns null for unknown provider or missing requirements', () => {
    expect(
      createProvider({ provider: 'none', model: 'm', apiKey: 'k', ai: undefined }),
    ).toBeNull();
    expect(
      createProvider({
        provider: 'anthropic',
        model: 'm',
        apiKey: undefined,
        ai: undefined,
      }),
    ).toBeNull();
    expect(
      createProvider({ provider: 'unknown', model: 'm', apiKey: 'k', ai: undefined }),
    ).toBeNull();
    // workers-ai needs the AI binding, not a key
    expect(
      createProvider({ provider: 'workers-ai', model: 'm', apiKey: 'k', ai: undefined }),
    ).toBeNull();
  });

  it('builds anthropic and openai providers with the configured model', () => {
    const a = createProvider({
      provider: 'anthropic',
      model: 'claude-opus-4-8',
      apiKey: 'k',
      ai: undefined,
    });
    expect(a?.name).toBe('anthropic');
    expect(a?.model).toBe('claude-opus-4-8');
    const o = createProvider({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'k',
      ai: undefined,
    });
    expect(o?.name).toBe('openai');
  });

  it('builds a workers-ai provider from the AI binding (no key needed)', () => {
    const fakeAi = { run: async () => ({ response: 'hi' }) } as unknown as Ai;
    const w = createProvider({
      provider: 'workers-ai',
      model: '',
      apiKey: undefined,
      ai: fakeAi,
    });
    expect(w?.name).toBe('workers-ai');
    expect(w?.model).toContain('llama');
  });
});

describe('resolveAiProvider (opt-in gating)', () => {
  it('is off by default — no flag means no provider', () => {
    expect(aiSummaryEnabled(env({}))).toBe(false);
    expect(
      resolveAiProvider(env({ AI_PROVIDER: 'anthropic', AI_API_KEY: 'k' })),
    ).toBeNull();
  });

  it('stays off when enabled but the provider is unconfigured', () => {
    // Flag on, anthropic selected, but no key -> still null (never runs AI).
    expect(
      resolveAiProvider(env({ ENABLE_AI_SUMMARY: 'true', AI_PROVIDER: 'anthropic' })),
    ).toBeNull();
  });

  it('activates only when the flag is true AND the provider is configured', () => {
    const p = resolveAiProvider(
      env({ ENABLE_AI_SUMMARY: 'true', AI_PROVIDER: 'anthropic', AI_API_KEY: 'k' }),
    );
    expect(p?.name).toBe('anthropic');
  });

  it('activates workers-ai with just the AI binding (no key)', () => {
    const fakeAi = { run: async () => ({ response: 'x' }) } as unknown as Ai;
    const p = resolveAiProvider(
      env({ ENABLE_AI_SUMMARY: 'true', AI_PROVIDER: 'workers-ai', AI: fakeAi }),
    );
    expect(p?.name).toBe('workers-ai');
  });
});
