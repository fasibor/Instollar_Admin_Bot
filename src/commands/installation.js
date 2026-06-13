/**
 * Instollar Bot — /installation Command  v1.3
 *
 * BUGS FIXED:
 *  BUG-6: db.insertInstallation() and db.insertScheduledPost() are async
 *          (PostgreSQL) but were not awaited — result.id was undefined,
 *          crashing updateInstallationMessageId.
 *  BUG-7: formatInstallationPost() now produces emoji-heavy posts that can
 *          exceed Telegram's 1024-char photo/video caption limit. Caption is
 *          now truncated safely before sending as photo/video.
 *  BUG-8: media step handler returned true without advancing step when
 *          it received an unrecognised message type, and separately when
 *          text was empty, causing the wizard to get stuck on Step 8 forever.
 */

const { isAdmin, formatInstallationPost } = require('../utils/helpers');
const session = require('../utils/session');
const db      = require('../database/db');

const STEPS = ['location', 'client_name', 'system_size', 'battery', 'battery_count', 'panels', 'panel_wattage', 'media', 'schedule'];
const MAX   = { location: 100, client_name: 100, system_size: 30, battery: 30, battery_count: 3, panel_wattage: 20 };
const MAX_PHOTO_SIZE   = 5  * 1024 * 1024;  // 5 MB
const MAX_VIDEO_SIZE   = 50 * 1024 * 1024;  // 50 MB
const MAX_CAPTION_LEN  = 950;               // safe under Telegram's 1024-char caption limit

const PROMPTS = {
  location:      '📍 *Step 1 of 9* — Enter the *location*:\n_(e.g. Lekki, Lagos)_',
  client_name:   '👤 *Step 2 of 9* — Enter the *client name*:\n_(e.g. ABC Residence)_',
  system_size:   '⚡ *Step 3 of 9* — Enter the *system size* (inverter):\n_(e.g. 5KVA, 10KVA)_',
  battery:       '🔋 *Step 4 of 9* — Enter the *battery capacity*:\n_(e.g. 10KWh, 5KWh)_',
  battery_count: '🔋 *Step 5 of 9* — Enter the *number of batteries*:\n_(e.g. 2, 4)_',
  panels:        '📊 *Step 6 of 9* — Enter the *number of panels*:\n_(e.g. 12)_',
  panel_wattage: '⚡ *Step 7 of 9* — Enter the *panel wattage*:\n_(e.g. 590w, 450w)_',
  media:         '📸 *Step 8 of 9* — Send a *photo or video* of the installation:\n_(or type SKIP to continue without media)_',
  schedule:      '⏰ *Step 9 of 9* — Schedule this post?\n_Reply with:_\n  IMMEDIATE — Publish now\n  YYYY-MM-DD HH:MM — Schedule for specific date/time (e.g. 2024-12-25 14:30)',
};

function registerInstallationCommand(bot) {
  bot.command('installation', async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return ctx.reply('This command is restricted to administrators.');
    session.set('installation', ctx.from.id, { step: 0, data: {} });
    await ctx.reply(
      '✨ *NEW INSTALLATION — Setup*\n\nYou are creating an installation announcement.\nType /cancel at any time to abort.\n\n' + PROMPTS.location,
      { parse_mode: 'Markdown' }
    );
  });
}

async function handleInstallationWizard(ctx, bot) {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const s = session.get('installation', userId);
  if (!s) return false;

  const currentStep = STEPS[s.step];

  // ── Media step ─────────────────────────────────────────────
  if (currentStep === 'media') {
    const text = ctx.message?.text?.trim().toUpperCase();

    if (text === 'SKIP') {
      s.data.photo_file_id = null;
      s.data.video_file_id = null;
    } else if (ctx.message?.photo) {
      const largest   = ctx.message.photo[ctx.message.photo.length - 1];
      const photoSize = largest.file_size;
      if (photoSize && photoSize > MAX_PHOTO_SIZE) {
        await ctx.reply(`📸 Photo too large (${(photoSize / 1024 / 1024).toFixed(1)}MB). Maximum: 5MB.`);
        return true;
      }
      s.data.photo_file_id = largest.file_id;
      s.data.video_file_id = null;
      await ctx.reply('✅ Photo received! Continuing...');
    } else if (ctx.message?.video) {
      const videoSize = ctx.message.video.file_size;
      if (videoSize && videoSize > MAX_VIDEO_SIZE) {
        await ctx.reply(`🎥 Video too large (${(videoSize / 1024 / 1024).toFixed(1)}MB). Maximum: 50MB.`);
        return true;
      }
      s.data.video_file_id = ctx.message.video.file_id;
      s.data.photo_file_id = null;
      await ctx.reply('✅ Video received! Continuing...');
    } else {
      // FIX BUG-8: was silently consuming non-text/photo/video messages without
      // advancing or telling the user what to do.
      await ctx.reply('📸 Please send a *photo*, *video*, or type *SKIP* to continue without media.', {
        parse_mode: 'Markdown',
      });
      return true;
    }

    // Advance to next step
    s.step += 1;
    await ctx.reply(PROMPTS[STEPS[s.step]], { parse_mode: 'Markdown' });
    return true;
  }

  // ── Schedule step ───────────────────────────────────────────
  if (currentStep === 'schedule') {
    const text = ctx.message?.text?.trim();
    if (!text) {
      await ctx.reply(PROMPTS.schedule, { parse_mode: 'Markdown' });
      return true;
    }

    if (text.toUpperCase() === 'IMMEDIATE') {
      s.data.schedule_type = 'immediate';
    } else {
      const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
      if (dateMatch) {
        const [, year, month, day, hour, minute] = dateMatch;
        const scheduledDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
        if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
          await ctx.reply('Scheduled time must be a valid future date. Please try again.');
          return true;
        }
        s.data.schedule_type = 'scheduled';
        s.data.scheduled_at  = scheduledDate;
      } else {
        await ctx.reply('Invalid format. Reply IMMEDIATE or use YYYY-MM-DD HH:MM format.');
        return true;
      }
    }

    session.del('installation', userId);
    const preview = formatInstallationPost({ ...s.data, created_at: new Date() });
    session.set('installation_confirm', userId, { data: s.data });

    await ctx.reply(
      `👀 *PREVIEW — Installation Post*\n━━━━━━━━━━━━━━━━━━━━━━━\n\n${preview}\n\n━━━━━━━━━━━━━━━━━━━━━━━\nReply *CONFIRM* to ${s.data.schedule_type === 'immediate' ? 'publish' : 'schedule'} or *CANCEL* to discard.`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  // ── Regular text steps ──────────────────────────────────────
  const text = ctx.message?.text?.trim();
  if (!text) {
    await ctx.reply(PROMPTS[STEPS[s.step]], { parse_mode: 'Markdown' });
    return true;
  }

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
  }
  return true;
}

async function handleInstallationConfirm(ctx, bot) {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const s = session.get('installation_confirm', userId);
  if (!s) return false;

  const text = ctx.message.text.trim().toUpperCase();

  if (text === 'CANCEL') {
    session.del('installation_confirm', userId);
    await ctx.reply('❌ Installation post discarded. No changes were made.');
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

  await ctx.reply('Please reply with *CONFIRM* to proceed or *CANCEL* to discard.', {
    parse_mode: 'Markdown',
  });
  return true;
}

async function publishInstallation(ctx, bot, data) {
  // FIX BUG-6: await the async PostgreSQL insert
  const result = await db.insertInstallation({ ...data, posted_by: ctx.from.id });
  const record = { ...data, created_at: new Date(), id: result.id };
  const post   = formatInstallationPost(record);

  await ctx.reply('📤 Publishing to community...');

  try {
    let sent;
    if (data.video_file_id) {
      // FIX BUG-7: caption must be ≤ 1024 chars
      const caption = post.slice(0, MAX_CAPTION_LEN);
      sent = await bot.telegram.sendVideo(process.env.COMMUNITY_CHAT_ID, data.video_file_id, {
        caption,
        parse_mode: 'Markdown',
      });
    } else if (data.photo_file_id) {
      const caption = post.slice(0, MAX_CAPTION_LEN);
      sent = await bot.telegram.sendPhoto(process.env.COMMUNITY_CHAT_ID, data.photo_file_id, {
        caption,
        parse_mode: 'Markdown',
      });
    } else {
      sent = await bot.telegram.sendMessage(process.env.COMMUNITY_CHAT_ID, post, {
        parse_mode: 'Markdown',
      });
    }
    // FIX BUG-6: await this too
    await db.updateInstallationMessageId(record.id, sent.message_id);
    await ctx.reply('✅ Installation post published successfully.');
  } catch (err) {
    console.error('[installation] Post failed:', err.message);
    await ctx.reply('⚠️ Installation saved, but posting to community failed. Check bot permissions.');
  }
}

async function scheduleInstallation(ctx, bot, data) {
  // FIX BUG-6: await the async PostgreSQL insert
  await db.insertScheduledPost({
    post_type:    'installation',
    post_data:    data,
    scheduled_at: data.scheduled_at,
    posted_by:    ctx.from.id,
  });

  const date = data.scheduled_at.toLocaleString('en-NG', { timeZone: process.env.TZ || 'Africa/Lagos' });
  await ctx.reply(`⏰ Installation scheduled for *${date}*. It will be published automatically.`, {
    parse_mode: 'Markdown',
  });
}

module.exports = { registerInstallationCommand, handleInstallationWizard, handleInstallationConfirm };
