/**
 * Instollar Bot — /stats Command
 * Shows today's activity to admins
 */

const { isAdmin, formatDate } = require('../utils/helpers');
const db = require('../database/db');

function registerStatsCommand(bot) {
  bot.command('stats', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('This command is restricted to administrators.');
    }

    const args = ctx.message.text.split(' ');
    const period = args[1];

    let stats;

    if (period === 'month') {
      stats = db.getMonthlyStats();
    } else {
      // default = week
      stats = db.getWeeklyStats();
    }

    await ctx.reply(
      `*INSTOLLAR — ${period === 'month' ? 'MONTHLY' : 'WEEKLY'} Stats*\n` +
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