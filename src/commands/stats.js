/**
 * Instollar Bot — /stats Command  v1.1
 *
 * BUGS FIXED:
 *  BUG-5: db.getWeeklyStats() and db.getMonthlyStats() are async (PostgreSQL)
 *          but were called without await — stats was a Promise object, causing
 *          "undefined" to appear in the output for all three numbers.
 */

const { isAdmin, formatDate } = require('../utils/helpers');
const db = require('../database/db');

function registerStatsCommand(bot) {
  bot.command('stats', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      return ctx.reply('This command is restricted to administrators.');
    }

    const args   = ctx.message.text.split(' ');
    const period = args[1];

    // FIX BUG-5: await the async PostgreSQL query
    const stats = period === 'month'
      ? await db.getMonthlyStats()
      : await db.getWeeklyStats();

    const label = period === 'month' ? 'MONTHLY' : 'WEEKLY';

    await ctx.reply(
      `*INSTOLLAR — ${label} Stats*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${formatDate()}\n\n` +
      `  Installations Shared: ${stats.installations}\n` +
      `  Gigs Posted: ${stats.gigs}\n` +
      `  Engineer Applications: ${stats.applications}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━`,
      { parse_mode: 'Markdown' }
    );
  });
}

module.exports = { registerStatsCommand };
