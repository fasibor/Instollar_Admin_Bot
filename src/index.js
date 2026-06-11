/**
 * ══════════════════════════════════════════════
 *   INSTOLLAR COMMUNITY BOT — Main Entry Point
 *   v1.2 — All audit issues resolved
 * ══════════════════════════════════════════════
 */

require('dotenv').config();

const { Telegraf }                 = require('telegraf');
const { initDb }                   = require('./database/db');
const { isAllowedChat, cancelAll } = require('./utils/session');

// Commands
const { registerHelpCommands }                                                = require('./commands/help');
const { registerInstallationCommand, handleInstallationWizard,
        handleInstallationConfirm }                                           = require('./commands/installation');
const { registerGigCommand, handleGigWizard, handleGigConfirm }               = require('./commands/gig');
const { registerAnnounceCommand, handleAnnounceText,
        handleAnnounceConfirm, handleAnnouncePhoto }                          = require('./commands/announce');
const { registerPhotoCommand, handlePhotoPost }                               = require('./commands/photo');
const { registerStatsCommand }                                                = require('./commands/stats');

// Handlers
const { registerApplicationHandler, handleApplicationWizard }                = require('./handlers/application');
const { startDailySummaryScheduler }                                          = require('./handlers/scheduler');

// ── Validate required env vars ────────────────────────────────

const REQUIRED = ['BOT_TOKEN', 'COMMUNITY_CHAT_ID', 'ADMIN_GROUP_ID', 'ADMIN_IDS', 'DATABASE_URL'];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[Fatal] Missing environment variable: ${key}`);
    console.error(`Available variables: ${Object.keys(process.env).filter(k => k.startsWith('BOT') || k.includes('CHAT') || k.includes('DATABASE')).join(', ')}`);
    process.exit(1);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('   INSTOLLAR COMMUNITY BOT  v1.2');
  console.log('   Solar Installer Telegram Community');
  console.log('══════════════════════════════════════════\n');

  await initDb();

  const bot = new Telegraf(process.env.BOT_TOKEN);

  // ── Global middleware: group-message guard ─────────────────
  // FIX R6 (in session.js): callback_query updates are always allowed through;
  // only text/photo updates from unknown groups are blocked.
  bot.use(async (ctx, next) => {
    if (!isAllowedChat(ctx)) return;
    return next();
  });

  // ── Register commands ──────────────────────────────────────
  registerHelpCommands(bot);
  registerInstallationCommand(bot);
  registerGigCommand(bot);
  registerAnnounceCommand(bot);
  registerPhotoCommand(bot);
  registerStatsCommand(bot);
  registerApplicationHandler(bot);

  // ── Global /cancel — clears ALL active sessions (FIX R1) ──
  // This is the ONE /cancel that works. Wizard handlers no longer
  // try to intercept '/cancel' as plain text (dead code removed).
  bot.command('cancel', async (ctx) => {
    const wasCancelled = cancelAll(ctx.from.id);
    await ctx.reply(
      wasCancelled
        ? 'Cancelled. No changes were made.'
        : 'Nothing active to cancel.'
    );
  });

  // ── Text message chain ─────────────────────────────────────
  // Note: text starting with '/' is handled by bot.command() above.
  // Confirm handlers run first so a "CONFIRM" typed during a confirm
  // session is never misrouted to a wizard handler.
  bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;

    const chain = [
      () => handleInstallationConfirm(ctx, bot),
      () => handleGigConfirm(ctx, bot),
      () => handleAnnounceConfirm(ctx, bot),
      () => handleInstallationWizard(ctx, bot),
      () => handleGigWizard(ctx, bot),
      () => handleAnnounceText(ctx, bot),
      () => handleApplicationWizard(ctx, bot),
    ];

    for (const fn of chain) {
      if (await fn()) return;
    }
  });

  // ── Photo chain ────────────────────────────────────────────
  bot.on('photo', async (ctx) => {
    const chain = [
      () => handlePhotoPost(ctx, bot),
      () => handleAnnouncePhoto(ctx, bot),
    ];
    for (const fn of chain) {
      if (await fn()) return;
    }
  });

  // ── Global error handler ───────────────────────────────────
  bot.catch((err, ctx) => {
    console.error(`[Error] ${ctx?.updateType}:`, err.message);
    ctx?.reply('An unexpected error occurred. Use /cancel to reset and try again.').catch(() => {});
  });

  // ── Daily summary cron ─────────────────────────────────────
  startDailySummaryScheduler(bot);

  await bot.launch();
  console.log('[Bot] Online and listening.\n');

  process.once('SIGINT',  () => { console.log('\n[Bot] Stopping...'); bot.stop('SIGINT');  });
  process.once('SIGTERM', () => { bot.stop('SIGTERM'); });
}

main().catch(err => {
  console.error('[Fatal]', err);
  process.exit(1);
});
