/**
 * Instollar Bot — /announce Command  v1.2
 *
 * Fixes applied:
 *  R1  — Removed dead /cancel text check (global /cancel handles it)
 *  R4  — Confirm handler now replies with guidance on unexpected input
 *  R8  — Photo caption capped at 900 chars (safe under Telegram's 1024-char limit
 *         after header + footer text is added; total will not exceed ~1020 chars)
 */

const { isAdmin, formatAnnouncement, sanitize } = require('../utils/helpers');
const session = require('../utils/session');
const db      = require('../database/db');

const MAX_ANNOUNCE_TEXT = 2000; // for text-only announcements
const MAX_PHOTO_CAPTION = 900;  // raw caption before header/footer added (~120 chars overhead)

function registerAnnounceCommand(bot) {
  bot.command('announce', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('This command is restricted to administrators.');
    session.set('announce', ctx.from.id, { awaitingContent: true });
    await ctx.reply(
      '*NEW ANNOUNCEMENT*\n\nEnter the announcement text (max 2000 chars).\n\nOr send a photo with a caption for a visual post.\n\nType /cancel to abort.',
      { parse_mode: 'Markdown' }
    );
  });
}

async function handleAnnounceText(ctx, bot) {
  const userId = ctx.from.id;
  const s      = session.get('announce', userId);
  if (!s || !s.awaitingContent) return false;

  const text = ctx.message.text.trim();

  if (text.length < 1) {
    await ctx.reply('Announcement text cannot be empty.');
    return true;
  }
  if (text.length > MAX_ANNOUNCE_TEXT) {
    await ctx.reply(`Announcement is too long (${text.length} chars). Maximum is ${MAX_ANNOUNCE_TEXT}.`);
    return true;
  }

  session.del('announce', userId);
  const post = formatAnnouncement(text);
  session.set('announce_confirm', userId, { content: text, post });

  await ctx.reply(
    `*PREVIEW — Announcement*\n━━━━━━━━━━━━━━━━━━━━━━━\n\n${post}\n\n━━━━━━━━━━━━━━━━━━━━━━━\nReply *CONFIRM* to publish or *CANCEL* to discard.`,
    { parse_mode: 'Markdown' }
  );
  return true;
}

async function handleAnnounceConfirm(ctx, bot) {
  const userId = ctx.from.id;
  const s      = session.get('announce_confirm', userId);
  if (!s) return false;

  const text = ctx.message.text.trim().toUpperCase();

  if (text === 'CANCEL') {
    session.del('announce_confirm', userId);
    await ctx.reply('Announcement discarded. No changes were made.');
    return true;
  }

  if (text === 'CONFIRM') {
    session.del('announce_confirm', userId);
    db.insertAnnouncement({ content: s.content, posted_by: userId });
    try {
      await bot.telegram.sendMessage(process.env.COMMUNITY_CHAT_ID, s.post, {
        parse_mode: 'Markdown',
      });
      await ctx.reply('Announcement published successfully.');
    } catch (err) {
      console.error('[announce] Post failed:', err.message);
      await ctx.reply('Announcement saved but posting failed. Check bot permissions.');
    }
    return true;
  }

  // FIX R4: Clear guidance instead of silently ignoring
  await ctx.reply('Please reply with *CONFIRM* to publish or *CANCEL* to discard.', {
    parse_mode: 'Markdown',
  });
  return true;
}

/** Photo with caption submitted while in announce session */
async function handleAnnouncePhoto(ctx, bot) {
  const userId = ctx.from.id;
  const s      = session.get('announce', userId);
  if (!s || !s.awaitingContent) return false;

  session.del('announce', userId);

  // FIX R8: Cap at MAX_PHOTO_CAPTION so header + footer don't exceed Telegram's 1024-char limit
  const rawCaption = (ctx.message.caption || '').trim();
  const caption    = rawCaption.slice(0, MAX_PHOTO_CAPTION);
  const photo      = ctx.message.photo;
  const fileId     = photo[photo.length - 1].file_id;

  // Header ~26 chars + dividers ~48 chars + footer ~26 chars = ~100 chars overhead
  const formattedCaption =
    '*PROJECT SPOTLIGHT*\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    sanitize(caption || 'Instollar Project Update', MAX_PHOTO_CAPTION) +
    '\n\n━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '#Instollar #SolarNigeria';

  db.insertAnnouncement({ content: caption || '[Photo post]', posted_by: userId });

  try {
    await bot.telegram.sendPhoto(process.env.COMMUNITY_CHAT_ID, fileId, {
      caption: formattedCaption,
      parse_mode: 'Markdown',
    });
    await ctx.reply('Photo announcement published successfully.');
  } catch (err) {
    console.error('[announce photo] Failed:', err.message);
    await ctx.reply('Failed to post the photo. Check bot permissions and try again.');
  }
  return true;
}

module.exports = {
  registerAnnounceCommand,
  handleAnnounceText,
  handleAnnounceConfirm,
  handleAnnouncePhoto,
};
