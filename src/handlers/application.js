/**
 * Instollar Bot — Gig Application Handler  v1.2
 *
 * Fixes applied:
 *  R1  — Removed dead /cancel text check (global /cancel command handles it)
 *  R9  — canClick() now stamps timestamp only after all rejection checks pass
 */

const { formatApplicationAlert, isValidEmail, isValidPhone } = require('../utils/helpers');
const session = require('../utils/session');
const db      = require('../database/db');

const APP_STEPS = ['full_name', 'phone', 'email'];

const APP_PROMPTS = {
  full_name: '*Application — Step 1 of 3*\n\nEnter your *full name*:\n_(2–100 characters)_',
  phone:     '*Application — Step 2 of 3*\n\nEnter your *phone number*:\n_(e.g. 08012345678 or +2348012345678)_',
  email:     '*Application — Step 3 of 3*\n\nEnter your *email address*:\n_(e.g. john@gmail.com)_',
};

function registerApplicationHandler(bot) {
  bot.action(/^apply_(\d+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const gigId  = parseInt(ctx.match[1], 10);

    // Run all rejection checks BEFORE consuming the rate-limit slot (FIX R9)
    if (db.hasApplied(gigId, userId)) {
      return ctx.answerCbQuery('You have already applied for this gig.', { show_alert: true });
    }

    const gig = db.getGigById(gigId);
    if (!gig) {
      return ctx.answerCbQuery('This gig is no longer available.', { show_alert: true });
    }

    // Only now check + stamp the rate-limit (FIX R9)
    if (!session.canClick(userId)) {
      return ctx.answerCbQuery('Please wait a moment before clicking again.', { show_alert: false });
    }

    // Single answerCbQuery call for the happy path (FIX R2 from previous pass)
    await ctx.answerCbQuery();

    session.set('application', userId, {
      gigId,
      gigLocation: gig.location,
      step: 0,
      data: {},
    });

    await ctx.reply(
      '*INSTOLLAR GIG APPLICATION*\n\n' +
      'Thank you for your interest. Please complete this short form.\n' +
      'Type /cancel at any time to abort.\n\n' +
      APP_PROMPTS.full_name,
      { parse_mode: 'Markdown' }
    );
  });
}

async function handleApplicationWizard(ctx, bot) {
  const userId = ctx.from.id;
  const s      = session.get('application', userId);
  if (!s) return false;

  const text        = ctx.message.text.trim();
  const currentStep = APP_STEPS[s.step];

  // Validation per step
  if (currentStep === 'full_name') {
    if (text.length < 2 || text.length > 100) {
      await ctx.reply('Please enter your full name (2–100 characters).');
      return true;
    }
  }

  if (currentStep === 'phone') {
    if (!isValidPhone(text)) {
      await ctx.reply(
        'Please enter a valid phone number (7–15 digits, optional + prefix).\n_(e.g. 08012345678 or +2348012345678)_',
        { parse_mode: 'Markdown' }
      );
      return true;
    }
  }

  if (currentStep === 'email') {
    if (!isValidEmail(text)) {
      await ctx.reply(
        'Please enter a valid email address.\n_(e.g. john@gmail.com)_',
        { parse_mode: 'Markdown' }
      );
      return true;
    }
  }

  s.data[currentStep] = text;
  s.step += 1;

  if (s.step < APP_STEPS.length) {
    await ctx.reply(APP_PROMPTS[APP_STEPS[s.step]], { parse_mode: 'Markdown' });
    return true;
  }

  session.del('application', userId);
  await finalizeApplication(ctx, bot, s);
  return true;
}

async function finalizeApplication(ctx, bot, s) {
  const { gigId, gigLocation, data } = s;
  const { from }                     = ctx;

  db.insertApplication({
    gig_id:      gigId,
    full_name:   data.full_name,
    phone:       data.phone,
    email:       data.email,
    telegram_id: from.id,
    username:    from.username || null,
  });

  await ctx.reply(
    '*Application Submitted*\n\n' +
    'Thank you. Your interest has been submitted to the Instollar Operations Team.\n\n' +
    'A team member will contact you if you are selected for this installation.\n\n' +
    '#Instollar',
    { parse_mode: 'Markdown' }
  );

  const alertText = formatApplicationAlert({
    full_name:    data.full_name,
    phone:        data.phone,
    email:        data.email,
    username:     from.username,
    gig_location: gigLocation,
    created_at:   new Date(),
  });

  try {
    await bot.telegram.sendMessage(process.env.ADMIN_GROUP_ID, alertText, {
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('[application] Admin notify failed:', err.message);
  }
}

module.exports = { registerApplicationHandler, handleApplicationWizard };
