/**
 * Instollar Bot — /start and /help Commands
 */

const { isAdmin } = require('../utils/helpers');

function registerHelpCommands(bot) {
  bot.start(async (ctx) => {
    const admin = isAdmin(ctx.from.id);

    const adminSection = admin
      ? '\n*Admin Commands*\n' +
        '  /installation — Post a completed installation\n' +
        '  /newgig — Post a new installation gig\n' +
        '  /announce — Post a community announcement\n' +
        '  /photo — Post a project photo\n' +
        '  /stats — View today\'s activity summary\n' +
        '  /cancel — Cancel any active wizard\n'
      : '';

    await ctx.reply(
      '*Welcome to the Instollar Community Bot*\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      'This bot keeps the Instollar installer community updated with:\n\n' +
      '  Completed solar installations\n' +
      '  New installation gig opportunities\n' +
      '  Company announcements\n\n' +
      adminSection +
      '\n*Community Members*\n' +
      '  Use the INTERESTED button on any gig to apply.\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '#Instollar #SolarNigeria',
      { parse_mode: 'Markdown' }
    );
  });

  bot.help(async (ctx) => {
    const admin = isAdmin(ctx.from.id);

    await ctx.reply(
      '*Instollar Bot — Commands*\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      (admin
        ? '*Admin*\n' +
          '  /installation — Post completed installation\n' +
          '  /newgig — Post a new gig\n' +
          '  /announce — Community announcement\n' +
          '  /photo — Post a project photo\n' +
          '  /stats — View activity stats\n' +
          '  /cancel — Cancel active wizard\n\n'
        : '') +
      '*Everyone*\n' +
      '  /start — Welcome message\n' +
      '  /help — This help message\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━',
      { parse_mode: 'Markdown' }
    );
  });
}

module.exports = { registerHelpCommands };
