import { fetchUserActivity } from '../src/cards/activity/fetch.js';
import { renderActivityCard } from '../src/cards/activity/render.js';
import { transformActivity } from '../src/cards/activity/transform.js';
import { fetchUserLanguages } from '../src/cards/languages/fetch.js';
import { renderLanguagesCard } from '../src/cards/languages/render.js';
import { transformLanguages } from '../src/cards/languages/transform.js';
import { fetchUserStats } from '../src/cards/stats/fetch.js';
import { renderStatsCard } from '../src/cards/stats/render.js';
import { transformStats } from '../src/cards/stats/transform.js';
import { fetchUserStreak } from '../src/cards/streak/fetch.js';
import { renderStreakCard } from '../src/cards/streak/render.js';
import { transformStreak } from '../src/cards/streak/transform.js';
import { fetchWrappedData } from '../src/cards/wrapped/fetch.js';
import { renderWrappedCard } from '../src/cards/wrapped/render.js';
import { transformWrapped } from '../src/cards/wrapped/transform.js';
import type { TokenPool } from '../src/github/token-pool.js';
import { resolveTheme } from '../src/themes/index.js';
import { todayInTimeZone } from '../src/util/date.js';
import type { ActionCard, ActionConfig } from './config.js';

const BORDER = { hideBorder: false, borderRadius: 8 };

/**
 * Render one card to a self-contained SVG string by composing the same pure
 * fetch -> transform -> render pipeline the Worker uses. Runs anywhere with
 * global fetch (Node 20+, CI) — no Workers/KV/D1 dependency at render time.
 */
export async function renderActionCard(
  pool: TokenPool,
  card: ActionCard,
  cfg: ActionConfig,
): Promise<string> {
  const theme = resolveTheme(cfg.theme);
  const { username, timeoutMs } = cfg;

  switch (card) {
    case 'stats': {
      const raw = await fetchUserStats(
        pool,
        username,
        { countPrivate: false },
        timeoutMs,
      );
      const model = transformStats(raw, { showIcons: true, hideRank: false });
      return renderStatsCard(model, theme, BORDER);
    }
    case 'languages': {
      const data = await fetchUserLanguages(
        pool,
        username,
        { includePrivate: false },
        timeoutMs,
      );
      const model = transformLanguages(data, { weight: 'count', langsCount: 6 });
      return renderLanguagesCard(model, theme, {
        layout: cfg.langLayout,
        title: `${username}'s Top Languages`,
        ...BORDER,
      });
    }
    case 'streak': {
      const data = await fetchUserStreak(pool, username, timeoutMs);
      const model = transformStreak(data, todayInTimeZone(cfg.timeZone));
      return renderStreakCard(model, theme, BORDER);
    }
    case 'activity': {
      const data = await fetchUserActivity(pool, username, 30, timeoutMs);
      const model = transformActivity(data);
      return renderActivityCard(model, theme, {
        title: `${username}'s Contribution Activity`,
        ...BORDER,
      });
    }
    case 'wrapped': {
      const year = new Date().getUTCFullYear();
      const data = await fetchWrappedData(pool, username, year, timeoutMs);
      const model = transformWrapped(data);
      return renderWrappedCard(model, theme, { login: username, ...BORDER });
    }
  }
}
