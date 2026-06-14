/**
 * Instollar Bot — Announcement System
 */

const { isAdmin, sanitize } = require('../utils/helpers');
const session = require('../utils/session');
const db = require('../database/db');

const MAX_TEXT = 2000;
const MAX_CAPTION = 900;

/* ─────────────────────────────
   TYPES + EMOJIS
───────────────────────────── */
const TYPES = [
  'ANNOUNCEMENT',
  'BIRTHDAY',
  'WEDDING',
  'OPPORTUNITY',
  'UPDATE',
  'EVENT',
  'OTHER'
];

const META = {
  ANNOUNCEMENT: { emoji: '📢' },
  BIRTHDAY: { emoji: '🎂' },
  WEDDING: { emoji: '💍' },
  OPPORTUNITY: { emoji: '💼' },
  UPDATE: { emoji: '🔔' },
  EVENT: { emoji: '📅' },
  OTHER: { emoji: '✨' }
};

const getEmoji = (t) => META[t]?.emoji || '📌';

/* ─────────────────────────────
   TIME PARSER
───────────────────────────── */
function parseDelay(input) {
  if (!input || input.toLowerCase() === 'now') return 0;

  const m = input.match(/^(\d+)(m|h|d)$/i);
  if (!m) return null;

  const v = parseInt(m[1]);
  const u = m[2].toLowerCase();

  return {
    m: v * 60 * 1000,
    h: v * 60 * 60 * 1000,
    d: v * 24 * 60 * 60 * 1000
  }[u];
}

/* ─────────────────────────────
   COMMAND
───────────────────────────── */
function registerAnnounceCommand(bot) {
  bot.command('announce', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('Admins only.');
    }

    session.set('announce', ctx.from.id, { step: 'type' });

    return ctx.reply(
      `NEW ANNOUNCEMENT\n\n` +
      TYPES.join('\n')
    );
  });
}

/* ─────────────────────────────
   TEXT FLOW
───────────────────────────── */
async function handleAnnounceText(ctx) {
  const id = ctx.from.id;
  const s = session.get('announce', id);
  if (!s) return false;

  const text = ctx.message.text.trim();

  /* TYPE STEP */
  if (s.step === 'type') {
    const type = text.toUpperCase();

    if (!TYPES.includes(type)) {
      return ctx.reply('Invalid type.');
    }

    if (type === 'OTHER') {
      session.set('announce', id, { step: 'custom' });
      return ctx.reply('Enter custom type:');
    }

    session.set('announce', id, {
      step: 'content',
      type
    });

    return ctx.reply('Send content:');
  }

  /* CUSTOM TYPE */
  if (s.step === 'custom') {
    session.set('announce', id, {
      step: 'content',
      type: text.toUpperCase()
    });

    return ctx.reply('Send content:');
  }

  /* CONTENT */
  if (s.step === 'content') {
    if (text.length > MAX_TEXT) {
      return ctx.reply('Too long.');
    }

    session.set('announce', id, {
      step: 'schedule',
      type: s.type,
      content: text
    });

    return ctx.reply('Schedule: now | 10m | 1h | 1d');
  }

  /* SCHEDULE */
  if (s.step === 'schedule') {
    const delay = parseDelay(text);
    if (delay === null) return ctx.reply('Invalid format.');

    const scheduledAt = new Date(Date.now() + delay);

    session.set('announce_confirm', id, {
      type: s.type,
      content: s.content,
      scheduledAt
    });

    session.del('announce', id);

    return ctx.reply(
      `${getEmoji(s.type)} Preview — ${s.type}\nReply CONFIRM or CANCEL`
    );
  }

  return false;
}

/* ─────────────────────────────
   CONFIRM FLOW
───────────────────────────── */
async function handleAnnounceConfirm(ctx, bot) {
  const id = ctx.from.id;
  const s = session.get('announce_confirm', id);
  if (!s) return false;

  const text = ctx.message.text.toUpperCase();

  if (text === 'CANCEL') {
    session.del('announce_confirm', id);
    return ctx.reply('Cancelled.');
  }

  if (text !== 'CONFIRM') {
    return ctx.reply('CONFIRM or CANCEL');
  }

  session.del('announce_confirm', id);

  const isScheduled = s.scheduledAt > new Date();

  /* ─────────────────────────────
     SCHEDULED POST
  ───────────────────────────── */
  if (isScheduled) {
    await db.insertScheduledPost({
      post_type: 'announcement',
      post_data: {
        type: s.type,
        content: s.content
      },
      scheduled_at: s.scheduledAt,
      posted_by: id
    });

    return ctx.reply('Scheduled successfully.');
  }

  /* ─────────────────────────────
     IMMEDIATE POST (FIXED)
  ───────────────────────────── */
  try {
    const emoji = getEmoji(s.type);

    const formatted =
      `${emoji} *${s.type}*\n` +
      '━━━━━━━━━━━━━━\n\n' +
      sanitize(s.content);

    const sent = await bot.telegram.sendMessage(
      process.env.COMMUNITY_CHAT_ID,
      formatted,
      { parse_mode: 'Markdown' }
    );

    await db.insertAnnouncement({
      announcement_type: s.type,
      content: s.content,
      posted_by: id,
      message_id: sent.message_id
    });

    return ctx.reply('Published.');
  } catch (e) {
    console.error('[announce]', e);
    return ctx.reply('Failed.');
  }
}

/* ─────────────────────────────
   PHOTO FLOW (FIXED)
───────────────────────────── */
async function handleAnnouncePhoto(ctx) {
  const id = ctx.from.id;
  const s = session.get('announce', id);

  if (!s || !s.type) return false;

  const emoji = getEmoji(s.type);
  const captionRaw = (ctx.message.caption || '').trim();
  const fileId = ctx.message.photo.at(-1).file_id;

  const caption =
    `${emoji} *${s.type}*\n` +
    '━━━━━━━━━━━━━━\n\n' +
    sanitize(captionRaw || 'Announcement').slice(0, MAX_CAPTION);

  session.del('announce', id);

  try {
    const sent = await ctx.telegram.sendPhoto(
      process.env.COMMUNITY_CHAT_ID,
      fileId,
      {
        caption,
        parse_mode: 'Markdown'
      }
    );

    await db.insertAnnouncement({
      announcement_type: s.type,
      content: captionRaw,
      posted_by: id,
      message_id: sent.message_id
    });

    return ctx.reply('Posted.');
  } catch (e) {
    console.error('[photo]', e);
    return ctx.reply('Failed.');
  }
}

/* ─────────────────────────────
   EXPORTS
───────────────────────────── */
module.exports = {
  registerAnnounceCommand,
  handleAnnounceText,
  handleAnnounceConfirm,
  handleAnnouncePhoto
};