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

const STEPS = ['location', 'client_name', 'system_size', 'battery', 'battery_count', 'panels', 'panel_wattage', 'photo', 'schedule'];
const MAX   = { location: 100, client_name: 100, system_size: 30, battery: 30, battery_count: 3, panel_wattage: 20 };

const PROMPTS = {
  location:      '*Step 1 of 9* — Enter the *location*:\n_(e.g. Lekki, Lagos)_',
  client_name:   '*Step 2 of 9* — Enter the *client name*:\n_(e.g. ABC Residence)_',
  system_size:   '*Step 3 of 9* — Enter the *system size* (inverter):\n_(e.g. 5KVA, 10KVA)_',
  battery:       '*Step 4 of 9* — Enter the *battery capacity*:\n_(e.g. 10KWh, 5KWh)_',
  battery_count: '*Step 5 of 9* — Enter the *number of batteries*:\n_(e.g. 2, 4)_',
  panels:        '*Step 6 of 9* — Enter the *number of panels*:\n_(e.g. 12)_',
  panel_wattage: '*Step 7 of 9* — Enter the *panel wattage*:\n_(e.g. 590w, 450w)_',
  photo:         '*Step 8 of 9* — Send a *photo* of the installation:\n_(or type SKIP to continue without photo)_',
  schedule:      '*Step 9 of 9* — Schedule this post?\n_Reply with:_\n  IMMEDIATE — Publish now\n  YYYY-MM-DD HH:MM — Schedule for specific date/time (e.g. 2024-12-25 14:30)',
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

  const currentStep = STEPS[s.step];

  // Handle photo step (accepts photo or SKIP)
  if (currentStep === 'photo') {
    const text = ctx.message?.text?.trim().toUpperCase();
    
    if (text === 'SKIP') {
      s.data.photo_file_id = null;
    } else if (ctx.message?.photo) {
      const photos = ctx.message.photo;
      const largestPhoto = photos[photos.length - 1];
      s.data.photo_file_id = largestPhoto.file_id;
      await ctx.reply('Photo received! Continuing...');
    } else {
      await ctx.reply('Please send a photo or reply SKIP to continue without one.');
      return true;
    }
    
    s.step += 1;
    await ctx.reply(PROMPTS[STEPS[s.step]], { parse_mode: 'Markdown' });
    return true;
  }

  // Handle schedule step
  if (currentStep === 'schedule') {
    const text = ctx.message.text.trim().toUpperCase();
    
    if (text === 'IMMEDIATE') {
      s.data.schedule_type = 'immediate';
    } else {
      // Try to parse datetime
      const dateMatch = ctx.message.text.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
      if (dateMatch) {
        const [_, year, month, day, hour, minute] = dateMatch;
        const scheduledDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
        if (scheduledDate < new Date()) {
          await ctx.reply('Scheduled time must be in the future. Please try again.');
          return true;
        }
        s.data.schedule_type = 'scheduled';
        s.data.scheduled_at = scheduledDate;
      } else {
        await ctx.reply('Invalid format. Reply IMMEDIATE or use YYYY-MM-DD HH:MM format.');
        return true;
      }
    }
    
    // All steps done
    s.step += 1;
    session.del('installation', userId);
    
    const preview = formatInstallationPost({ ...s.data, created_at: new Date() });
    session.set('installation_confirm', userId, { data: s.data });

    await ctx.reply(
      `*PREVIEW — Installation Post*\n━━━━━━━━━━━━━━━━━━━━━━━\n\n${preview}\n\n━━━━━━━━━━━━━━━━━━━━━━━\nReply *CONFIRM* to ${s.data.schedule_type === 'immediate' ? 'publish' : 'schedule'} or *CANCEL* to discard.`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  const text        = ctx.message.text.trim();

  // Validate battery_count and panels as numbers
  if (currentStep === 'battery_count' || currentStep === 'panels') {
    const n = parseInt(text, 10);
    if (isNaN(n) || n < 1 || n > 10000) {
      const field = currentStep === 'battery_count' ? 'battery count' : 'panel count';
      await ctx.reply(`Please enter a valid ${field} between 1 and 10000.`);
      return true;
    }
    s.data[currentStep] = n;
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
    
    if (s.data.schedule_type === 'immediate') {
      await publishInstallation(ctx, bot, s.data);
    } else {
      await scheduleInstallation(ctx, bot, s.data);
    }
    return true;
  }

  // FIX R2: Give clear guidance instead of silently ignoring unexpected input
  await ctx.reply('Please reply with *CONFIRM* to proceed or *CANCEL* to discard.', {
    parse_mode: 'Markdown',
  });
  return true;
}

async function publishInstallation(ctx, bot, data) {
  const result = db.insertInstallation({ ...data, posted_by: ctx.from.id });
  const record = { ...data, created_at: new Date(), id: result.id };
  const post   = formatInstallationPost(record);

  await ctx.reply('Publishing to community...');

  try {
    let sent;
    if (data.photo_file_id) {
      sent = await bot.telegram.sendPhoto(process.env.COMMUNITY_CHAT_ID, data.photo_file_id, {
        caption: post,
        parse_mode: 'Markdown',
      });
    } else {
      sent = await bot.telegram.sendMessage(process.env.COMMUNITY_CHAT_ID, post, {
        parse_mode: 'Markdown',
      });
    }
    db.updateInstallationMessageId(record.id, sent.message_id);
    await ctx.reply('Installation post published successfully.');
  } catch (err) {
    console.error('[installation] Post failed:', err.message);
    await ctx.reply('Installation saved, but posting to community failed. Check bot permissions.');
  }
}

async function scheduleInstallation(ctx, bot, data) {
  await db.insertScheduledPost({
    post_type: 'installation',
    post_data: data,
    scheduled_at: data.scheduled_at,
    posted_by: ctx.from.id,
  });

  const date = data.scheduled_at.toLocaleString('en-NG', { timeZone: process.env.TZ || 'Africa/Lagos' });
  await ctx.reply(`Installation scheduled for *${date}*. It will be published automatically.`, {
    parse_mode: 'Markdown',
  });
}

module.exports = { registerInstallationCommand, handleInstallationWizard, handleInstallationConfirm };
