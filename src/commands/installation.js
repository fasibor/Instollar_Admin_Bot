/**
 * Instollar Bot — /installation Command  v1.2
 *
 * Fixes applied:
 *  R1 — Removed dead /cancel text checks inside wizard (global command handles it)
 *  R2 — Confirm handler now sends guidance on unexpected input instead of silently ignoring
 */

const { isAdmin, formatInstallationPost } = require('../utils/helpers');
const session = require('../utils/session');
const db      = require('../database/db');

const STEPS = ['location', 'client_name', 'system_size', 'battery', 'panels'];
const MAX   = { location: 100, client_name: 100, system_size: 30, battery: 30 };

const PROMPTS = {
  location:    '*Step 1 of 5* — Enter the *location*:\n_(e.g. Lekki, Lagos)_',
  client_name: '*Step 2 of 5* — Enter the *client name*:\n_(e.g. ABC Residence)_',
  system_size: '*Step 3 of 5* — Enter the *system size* (inverter):\n_(e.g. 5KVA, 10KVA)_',
  battery:     '*Step 4 of 5* — Enter the *battery capacity*:\n_(e.g. 10KWh, 5KWh)_',
  panels:      '*Step 5 of 5* — Enter the *number of panels*:\n_(e.g. 12)_',
};

function registerInstallationCommand(bot) {
  bot.command('installation', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('This command is restricted to administrators.');
    session.set('installation', ctx.from.id, { step: 0, data: {} });
    await ctx.reply(
      '*NEW INSTALLATION — Setup*\n\nYou are creating an installation announcement.\nType /cancel at any time to abort.\n\n' + PROMPTS.location,
      { parse_mode: 'Markdown' }
    );
  });
}

async function handleInstallationWizard(ctx, bot) {
  const userId = ctx.from.id;
  const s      = session.get('installation', userId);
  if (!s) return false;

  const text        = ctx.message.text.trim();
  const currentStep = STEPS[s.step];

  // Validate panels
  if (currentStep === 'panels') {
    const n = parseInt(text, 10);
    if (isNaN(n) || n < 1 || n > 10000) {
      await ctx.reply('Please enter a valid panel count between 1 and 10000.');
      return true;
    }
    s.data.panels = n;
  } else {
    const max = MAX[currentStep] || 200;
    if (text.length < 1) {
      await ctx.reply('This field cannot be empty. Please enter a value.');
      return true;
    }
    if (text.length > max) {
      await ctx.reply(`This field is limited to ${max} characters (yours: ${text.length}). Please shorten it.`);
      return true;
    }
    s.data[currentStep] = text;
  }

  s.step += 1;

  if (s.step < STEPS.length) {
    await ctx.reply(PROMPTS[STEPS[s.step]], { parse_mode: 'Markdown' });
    return true;
  }

  // All steps done — show preview
  session.del('installation', userId);
  const preview = formatInstallationPost({ ...s.data, created_at: new Date() });
  session.set('installation_confirm', userId, { data: s.data });

  await ctx.reply(
    `*PREVIEW — Installation Post*\n━━━━━━━━━━━━━━━━━━━━━━━\n\n${preview}\n\n━━━━━━━━━━━━━━━━━━━━━━━\nReply *CONFIRM* to publish or *CANCEL* to discard.`,
    { parse_mode: 'Markdown' }
  );
  return true;
}

async function handleInstallationConfirm(ctx, bot) {
  const userId = ctx.from.id;
  const s      = session.get('installation_confirm', userId);
  if (!s) return false;

  const text = ctx.message.text.trim().toUpperCase();

  if (text === 'CANCEL') {
    session.del('installation_confirm', userId);
    await ctx.reply('Installation post discarded. No changes were made.');
    return true;
  }

  if (text === 'CONFIRM') {
    session.del('installation_confirm', userId);
    await publishInstallation(ctx, bot, s.data);
    return true;
  }

  // FIX R2: Give clear guidance instead of silently ignoring unexpected input
  await ctx.reply('Please reply with *CONFIRM* to publish or *CANCEL* to discard.', {
    parse_mode: 'Markdown',
  });
  return true;
}

async function publishInstallation(ctx, bot, data) {
  const result = db.insertInstallation({ ...data, posted_by: ctx.from.id });
  const record = { ...data, created_at: new Date(), id: result.lastInsertRowid };
  const post   = formatInstallationPost(record);

  await ctx.reply('Publishing to community...');

  try {
    const sent = await bot.telegram.sendMessage(process.env.COMMUNITY_CHAT_ID, post, {
      parse_mode: 'Markdown',
    });
    db.updateInstallationMessageId(record.id, sent.message_id);
    await ctx.reply('Installation post published successfully.');
  } catch (err) {
    console.error('[installation] Post failed:', err.message);
    await ctx.reply('Installation saved, but posting to community failed. Check bot permissions.');
  }
}

module.exports = { registerInstallationCommand, handleInstallationWizard, handleInstallationConfirm };
