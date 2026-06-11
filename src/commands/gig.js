/**
 * Instollar Bot — /newgig Command  v1.2
 *
 * Fixes applied:
 *  R1 — Removed dead /cancel text check inside wizard handler
 *  R3 — Confirm handler gives clear guidance on unexpected input
 */

const { isAdmin, formatGigPost, gigKeyboard } = require('../utils/helpers');
const session = require('../utils/session');
const db      = require('../database/db');

const STEPS = ['location', 'timeline', 'system_size', 'battery', 'panels'];
const MAX   = { location: 100, timeline: 60, system_size: 30, battery: 30 };

const PROMPTS = {
  location:    '*Step 1 of 5* — Enter the *gig location*:\n_(e.g. Uselu, Benin City)_',
  timeline:    '*Step 2 of 5* — Enter the *deadline / timeline*:\n_(e.g. Within 4 Hours, Same Day)_',
  system_size: '*Step 3 of 5* — Enter the *system size* required:\n_(e.g. 5KVA, 10KVA)_',
  battery:     '*Step 4 of 5* — Enter the *battery capacity*:\n_(e.g. 10KWh)_',
  panels:      '*Step 5 of 5* — Enter the *number of panels*:\n_(e.g. 12)_',
};

function registerGigCommand(bot) {
  bot.command('newgig', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('This command is restricted to administrators.');
    session.set('gig', ctx.from.id, { step: 0, data: {} });
    await ctx.reply(
      '*NEW GIG — Setup*\n\nYou are creating a new gig announcement.\nType /cancel at any time to abort.\n\n' + PROMPTS.location,
      { parse_mode: 'Markdown' }
    );
  });
}

async function handleGigWizard(ctx, bot) {
  const userId = ctx.from.id;
  const s      = session.get('gig', userId);
  if (!s) return false;

  const text        = ctx.message.text.trim();
  const currentStep = STEPS[s.step];

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
      await ctx.reply('This field cannot be empty.');
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

  // Preview
  session.del('gig', userId);
  const preview = formatGigPost(s.data);
  session.set('gig_confirm', userId, { data: s.data });

  await ctx.reply(
    `*PREVIEW — Gig Post*\n━━━━━━━━━━━━━━━━━━━━━━━\n\n${preview}\n\n━━━━━━━━━━━━━━━━━━━━━━━\nReply *CONFIRM* to publish or *CANCEL* to discard.`,
    { parse_mode: 'Markdown' }
  );
  return true;
}

async function handleGigConfirm(ctx, bot) {
  const userId = ctx.from.id;
  const s      = session.get('gig_confirm', userId);
  if (!s) return false;

  const text = ctx.message.text.trim().toUpperCase();

  if (text === 'CANCEL') {
    session.del('gig_confirm', userId);
    await ctx.reply('Gig post discarded. No changes were made.');
    return true;
  }

  if (text === 'CONFIRM') {
    session.del('gig_confirm', userId);
    await publishGig(ctx, bot, s.data);
    return true;
  }

  // FIX R3: Explicit guidance on unexpected input
  await ctx.reply('Please reply with *CONFIRM* to publish or *CANCEL* to discard.', {
    parse_mode: 'Markdown',
  });
  return true;
}

async function publishGig(ctx, bot, data) {
  const result = db.insertGig({ ...data, posted_by: ctx.from.id });
  const gigId  = result.lastInsertRowid;
  const post   = formatGigPost(data);

  await ctx.reply('Publishing gig to community...');

  try {
    const sent = await bot.telegram.sendMessage(
      process.env.COMMUNITY_CHAT_ID,
      post,
      { parse_mode: 'Markdown', reply_markup: gigKeyboard(gigId) }
    );
    db.updateGigMessageId(gigId, sent.message_id);
    await ctx.reply('Gig post published successfully.');
  } catch (err) {
    console.error('[newgig] Post failed:', err.message);
    await ctx.reply('Gig saved, but posting to community failed. Check bot permissions.');
  }
}

module.exports = { registerGigCommand, handleGigWizard, handleGigConfirm };
