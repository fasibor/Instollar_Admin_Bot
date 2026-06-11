/**
 * Instollar Bot — /newgig Command  v2.0
 *
 * Enhanced Features:
 *  - Dynamic gig types: Installation, Energy Audit, Decommissioning, Battery Replacement, etc.
 *  - Flexible field collection based on gig type
 *  - Installation gigs: Inverter count, Battery count, Panel wattage
 *  - Audit/Service gigs: Flexible scope description
 */

const { isAdmin, formatGigPost, gigKeyboard } = require('../utils/helpers');
const session = require('../utils/session');
const db      = require('../database/db');

const GIG_TYPES = [
  'Installation',
  'Energy Audit',
  'Business Audit',
  'Decommissioning',
  'Battery Replacement',
  'Solar Panel Replacement',
  'MPPT Removal',
  'Other'
];

// Base steps for all gigs
const BASE_STEPS = ['gig_type', 'location', 'timeline'];

// Additional steps per gig type
const DYNAMIC_STEPS = {
  'Installation': ['inverter_count', 'battery_count', 'panel_wattage'],
  'Energy Audit': ['scope'],
  'Business Audit': ['scope'],
  'Decommissioning': ['scope'],
  'Battery Replacement': ['scope'],
  'Solar Panel Replacement': ['scope'],
  'MPPT Removal': ['scope'],
  'Other': ['scope']
};

const MAX = {
  location: 100,
  timeline: 60,
  scope: 500,
};

const PROMPTS = {
  gig_type: '💼 *Step 1* — What type of gig is this?\n\nReply with one of:\n  • Installation\n  • Energy Audit\n  • Business Audit\n  • Decommissioning\n  • Battery Replacement\n  • Solar Panel Replacement\n  • MPPT Removal\n  • Other',
  location: '📍 *Step 2* — Enter the *location*:\n_(e.g. Lekki, Lagos)_',
  timeline: '⏰ *Step 3* — Enter the *deadline/timeline*:\n_(e.g. Within 2 Days, Urgent)_',
  inverter_count: '⚡ *Step 4 of 6* — How many *inverters* are needed?\n_(e.g. 1, 2, 3)_',
  battery_count: '🔋 *Step 5 of 6* — How many *batteries* are needed?\n_(e.g. 2, 4, 6)_',
  panel_wattage: '📊 *Step 6 of 6* — What *panel wattage*?\n_(e.g. 590w, 450w, Mixed)_',
  scope: '📝 *Step 4* — Describe the *scope of work*:\n_(e.g. Quarterly energy audit, Full decommissioning)_',
};

function registerGigCommand(bot) {
  bot.command('newgig', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('This command is restricted to administrators.');
    session.set('gig', ctx.from.id, { step: 0, data: {}, steps: [] });
    await ctx.reply(
      '💼 *NEW GIG — Setup*\n\nYou are creating a new gig announcement.\nType /cancel at any time to abort.\n\n' + PROMPTS.gig_type,
      { parse_mode: 'Markdown' }
    );
  });
}

async function handleGigWizard(ctx, bot) {
  const userId = ctx.from.id;
  const s      = session.get('gig', userId);
  if (!s) return false;

  const text = ctx.message?.text?.trim();
  if (!text) return false;

  // Build steps array if not already done (happens after gig_type is selected)
  if (!s.steps || s.steps.length === 0) {
    const allSteps = [...BASE_STEPS, ...(DYNAMIC_STEPS[s.data.gig_type] || ['scope'])];
    s.steps = allSteps;
  }

  const currentStepName = s.steps[s.step];

  // Handle gig_type selection
  if (currentStepName === 'gig_type') {
    const gigType = text;
    if (!GIG_TYPES.includes(gigType)) {
      await ctx.reply(`Invalid gig type. Please reply with one of: ${GIG_TYPES.join(', ')}`);
      return true;
    }
    s.data.gig_type = gigType;
    s.step += 1;
    await ctx.reply(PROMPTS[s.steps[s.step]], { parse_mode: 'Markdown' });
    return true;
  }

  // Handle numeric fields
  if (currentStepName === 'inverter_count' || currentStepName === 'battery_count') {
    const n = parseInt(text, 10);
    if (isNaN(n) || n < 1 || n > 1000) {
      const field = currentStepName === 'inverter_count' ? 'inverter count' : 'battery count';
      await ctx.reply(`Please enter a valid ${field} between 1 and 1000.`);
      return true;
    }
    s.data[currentStepName] = n;
    s.step += 1;
    await ctx.reply(PROMPTS[s.steps[s.step]], { parse_mode: 'Markdown' });
    return true;
  }

  // Handle text fields
  const max = MAX[currentStepName] || 200;
  if (text.length < 1) {
    await ctx.reply('This field cannot be empty.');
    return true;
  }
  if (text.length > max) {
    await ctx.reply(`This field is limited to ${max} characters (yours: ${text.length}). Please shorten it.`);
    return true;
  }
  s.data[currentStepName] = text;

  s.step += 1;

  // Check if we have more steps
  if (s.step < s.steps.length) {
    await ctx.reply(PROMPTS[s.steps[s.step]], { parse_mode: 'Markdown' });
    return true;
  }

  // All steps done - show preview
  session.del('gig', userId);
  const preview = formatGigPost(s.data);
  session.set('gig_confirm', userId, { data: s.data });

  await ctx.reply(
    `👀 *PREVIEW — Gig Post*\n━━━━━━━━━━━━━━━━━━━━━━━\n\n${preview}\n\n━━━━━━━━━━━━━━━━━━━━━━━\nReply *CONFIRM* to publish or *CANCEL* to discard.`,
    { parse_mode: 'Markdown' }
  );
  return true;
}

async function handleGigConfirm(ctx, bot) {
  const userId = ctx.from.id;
  const s      = session.get('gig_confirm', userId);
  if (!s) return false;

  const text = ctx.message?.text?.trim().toUpperCase();
  if (!text) return false;

  if (text === 'CANCEL') {
    session.del('gig_confirm', userId);
    await ctx.reply('❌ Gig post discarded. No changes were made.');
    return true;
  }

  if (text === 'CONFIRM') {
    session.del('gig_confirm', userId);
    await publishGig(ctx, bot, s.data);
    return true;
  }

  // Explicit guidance on unexpected input
  await ctx.reply('Please reply with *CONFIRM* to publish or *CANCEL* to discard.', {
    parse_mode: 'Markdown',
  });
  return true;
}

async function publishGig(ctx, bot, data) {
  const result = db.insertGig({ ...data, posted_by: ctx.from.id });
  const gigId  = result.id;
  const post   = formatGigPost(data);

  await ctx.reply('📤 Publishing gig to community...');

  try {
    const sent = await bot.telegram.sendMessage(
      process.env.COMMUNITY_CHAT_ID,
      post,
      { parse_mode: 'Markdown', reply_markup: gigKeyboard(gigId) }
    );
    db.updateGigMessageId(gigId, sent.message_id);
    await ctx.reply('✅ Gig post published successfully.');
  } catch (err) {
    console.error('[newgig] Post failed:', err.message);
    await ctx.reply('⚠️ Gig saved, but posting to community failed. Check bot permissions.');
  }
}

module.exports = { registerGigCommand, handleGigWizard, handleGigConfirm };
