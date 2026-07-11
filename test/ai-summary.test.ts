import { describe, expect, it } from 'vitest';
import { buildSummaryPrompt, generateSummary } from '../src/ai/index.js';
import { createProvider } from '../src/ai/provider.js';
import type { AiProvider, SummarySignals } from '../src/ai/types.js';

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
  it('returns null when disabled or missing a key', () => {
    expect(createProvider('none', 'm', 'key')).toBeNull();
    expect(createProvider('anthropic', 'm', undefined)).toBeNull();
    expect(createProvider('unknown', 'm', 'key')).toBeNull();
  });

  it('builds anthropic and openai providers with the configured model', () => {
    const a = createProvider('anthropic', 'claude-opus-4-8', 'key');
    expect(a?.name).toBe('anthropic');
    expect(a?.model).toBe('claude-opus-4-8');
    const o = createProvider('openai', 'gpt-4o-mini', 'key');
    expect(o?.name).toBe('openai');
  });
});
