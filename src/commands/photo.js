/**
 * Instollar Bot — /photo Command  v1.2
 *
 * Fix R8: Caption capped at 900 chars so header + footer stay within
 *         Telegram's 1024-char photo caption limit.
 */

const { isAdmin, sanitize } = require('../utils/helpers');
const session = require('../utils/session');

const MAX_PHOTO_CAPTION = 900; // safe under 1024 after header/footer overhead

function registerPhotoCommand(bot) {
  bot.command('photo', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('This command is restricted to administrators.');
    session.set('photo', ctx.from.id, { awaitingPhoto: true });
    await ctx.reply(
      '*PHOTO POST*\n\nSend a photo with a caption describing the project.\n_(e.g. Victoria Island, Lagos — 10KVA + 20KWh — Installed Today)_\n\nCaption max 900 characters. Type /cancel to abort.',
      { parse_mode: 'Markdown' }
    );
  });
}

async function handlePhotoPost(ctx, bot) {
  const userId = ctx.from.id;
  const s      = session.get('photo', userId);
  if (!s || !s.awaitingPhoto) return false;

  session.del('photo', userId);

  const rawCaption = (ctx.message.caption || '').trim();
  const caption    = rawCaption.slice(0, MAX_PHOTO_CAPTION);
  const photo      = ctx.message.photo;
  const fileId     = photo[photo.length - 1].file_id;

  const formattedCaption =
    '*PROJECT SPOTLIGHT*\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    sanitize(caption || 'Instollar Project Update', MAX_PHOTO_CAPTION) +
    '\n\n━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '#Instollar #SolarNigeria';

  try {
    await bot.telegram.sendPhoto(process.env.COMMUNITY_CHAT_ID, fileId, {
      caption: formattedCaption,
      parse_mode: 'Markdown',
    });
    await ctx.reply('Photo posted to the community successfully.');
  } catch (err) {
    console.error('[photo] Failed:', err.message);
    await ctx.reply('Failed to post photo. Ensure the bot has posting permission in the community.');
  }

  return true;
}

module.exports = { registerPhotoCommand, handlePhotoPost };
