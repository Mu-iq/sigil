import type { AiProvider, SummarySignals } from './types.js';

const SYSTEM = [
  'You write a one-to-two sentence developer summary for a public GitHub',
  'profile card. Be flattering but honest and specific to the signals given.',
  'Never invent facts, employers, or specifics not implied by the data.',
  'No hashtags, no emoji, no markdown, no quotes. Keep it under 200 characters.',
  'Write in third person about the developer. Keep it safe for public display.',
].join(' ');

/** Build the user prompt from public signals only. */
export function buildSummaryPrompt(s: SummarySignals): string {
  const langs =
    s.topLanguages.length > 0 ? s.topLanguages.join(', ') : 'various languages';
  return [
    `Developer: ${s.name} (@${s.login})`,
    `Public repos: ${s.repoCount}`,
    `Top languages: ${langs}`,
    `Total stars earned: ${s.totalStars}`,
    `Commits (last year): ${s.totalCommits}`,
    `Pull requests: ${s.totalPRs}`,
    `Contributions (last year): ${s.totalContributions}`,
    `Followers: ${s.followers}`,
  ].join('\n');
}

/** Hard length cap so a runaway model can't bloat the stored/rendered card. */
const MAX_LEN = 220;

// ASCII control characters (0x00-0x1F and 0x7F) — stripped before storing.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

/**
 * Generate and sanitize a developer summary. Returns null if the provider
 * declined or produced nothing usable. Only ever called from the scheduled job.
 */
export async function generateSummary(
  provider: AiProvider,
  signals: SummarySignals,
  timeoutMs: number,
): Promise<string | null> {
  const raw = await provider.complete(SYSTEM, buildSummaryPrompt(signals), timeoutMs);
  if (!raw) return null;
  const cleaned = raw.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) return null;
  return cleaned.length > MAX_LEN
    ? `${cleaned.slice(0, MAX_LEN - 1).trimEnd()}…`
    : cleaned;
}
