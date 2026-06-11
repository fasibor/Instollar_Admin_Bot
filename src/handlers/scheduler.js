/**
 * Instollar Bot — Daily Summary Scheduler v1.2
 *
 * Fix R8: Validates cron expression before passing to node-cron.
 *         A bad DAILY_SUMMARY_CRON env value now logs a warning and
 *         falls back to the default instead of crashing the bot.
 */

const cron = require('node-cron');
const { formatDailySummary } = require('../utils/helpers');
const db = require('../database/db');

const DEFAULT_CRON = '0 20 * * *'; // 8:00 PM daily

function startDailySummaryScheduler(bot) {
  const rawCron           = process.env.DAILY_SUMMARY_CRON || DEFAULT_CRON;
  const COMMUNITY_CHAT_ID = process.env.COMMUNITY_CHAT_ID;
  const tz                = process.env.TZ || 'Africa/Lagos';

  // FIX R8: Validate the cron string before handing it to node-cron.
  // cron.validate() returns false for invalid expressions rather than throwing.
  let cronExpr = rawCron;
  if (!cron.validate(rawCron)) {
    console.warn(
      `[Scheduler] DAILY_SUMMARY_CRON "${rawCron}" is invalid. ` +
      `Falling back to default: "${DEFAULT_CRON}"`
    );
    cronExpr = DEFAULT_CRON;
  }

  cron.schedule(
    cronExpr,
    async () => {
      console.log('[Scheduler] Posting daily summary...');
      const stats = db.getDailyStats();
      const post  = formatDailySummary(stats);

      try {
        await bot.telegram.sendMessage(COMMUNITY_CHAT_ID, post, { parse_mode: 'Markdown' });
        console.log('[Scheduler] Daily summary posted.');
      } catch (err) {
        console.error('[Scheduler] Failed to post daily summary:', err.message);
      }
    },
    { timezone: tz }
  );

  console.log(`[Scheduler] Daily summary scheduled: "${cronExpr}" (${tz})`);
}

module.exports = { startDailySummaryScheduler };
