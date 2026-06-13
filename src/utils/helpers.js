/**
 * Instollar Bot — Utility Helpers
 */

require('dotenv').config();

// ── Admin gate ────────────────────────────────────────────────
// NOTE: Parsed fresh from env on each call so runtime changes work
// (still requires restart to pick up .env changes, but supports
//  future dynamic reloading without code changes)

function getAdminIds() {
  return (process.env.ADMIN_IDS || '')
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(Boolean);
}

function isAdmin(userId) {
  return getAdminIds().includes(userId);
}

// ── Input sanitization ────────────────────────────────────────

const MAX_FIELD_LENGTH = 200; // chars

/**
 * Sanitize a user-supplied string for safe Telegram Markdown embedding.
 * Escapes special MarkdownV1 chars and enforces max length.
 */
function sanitize(text, maxLen = MAX_FIELD_LENGTH) {
  if (typeof text !== 'string') return '';
  // Truncate first
  const truncated = text.slice(0, maxLen);
  // Strip Markdown hyperlinks [text](url) -> text  (prevents URL injection)
  const stripped = truncated.replace(/\[([^\]]*)]\([^)]*\)/g, '$1');
  // Escape remaining Telegram MarkdownV1 special chars: * _ ` [
  return stripped.replace(/([*_`\[])/g, '\\$1');
}

// ── Validation ────────────────────────────────────────────────

/** Basic but meaningful email check: has @, has domain, has TLD */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Phone: 7–15 digits, optional leading + */
function isValidPhone(phone) {
  return /^\+?\d{7,15}$/.test(phone.trim().replace(/[\s\-()]/g, ''));
}

// ── Time helpers ──────────────────────────────────────────────

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: process.env.TZ || 'Africa/Lagos',
  });
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: process.env.TZ || 'Africa/Lagos',
  });
}

/**
 * Returns a human-readable timestamp for installation posts.
 * Shows the actual time (e.g. "Today, 02:45 PM") rather than
 * "Just Now" which becomes stale as the post ages in the group.
 */
function minutesAgo(date) {
  const d  = date ? new Date(date) : new Date();
  const tz = process.env.TZ || 'Africa/Lagos';

  const todayStr = new Date().toLocaleDateString('en-NG', { timeZone: tz });
  const postStr  = d.toLocaleDateString('en-NG', { timeZone: tz });
  const timeStr  = d.toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz,
  });

  if (postStr === todayStr) return `Today, ${timeStr}`;

  const dateStr = d.toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: tz,
  });
  return `${dateStr} at ${timeStr}`;

}

// ── Celebration emoji tiers ──────────────────────────────────

/**
 * Get celebration emojis based on installation system size.
 * Small (1-3 kVA): Single celebration 👏
 * Medium (5-10 kVA): Party celebration 🎉🎊
 * Large (15+ kVA): Whale celebration 🎉🎉🎉🎊🎊✨✨🚀🐋
 */
function getCelebrationEmoji(systemSize) {
  if (!systemSize || typeof systemSize !== 'string') return '👏';
  const match = systemSize.match(/(\d+)\.?\d*/);
  const size = match ? parseFloat(match[1]) : 0;
  
  if (size >= 15) {
    return '🎉🎉🎉 🎊🎊 ✨✨ 🚀🐋';
  } else if (size >= 5) {
    return '🎉🎉 🎊🎊 ✨';
  } else {
    return '👏';
  }
}

// ── Message formatters ────────────────────────────────────────

function formatInstallationPost({ location, client_name, system_size, battery, battery_count, panels, panel_wattage, created_at }) {
  const time = minutesAgo(created_at || new Date());
  const celebration = getCelebrationEmoji(system_size);
  return (
    `${celebration}\n\n` +
    `✨ *INSTALLATION COMPLETED*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `A ${sanitize(system_size)} Solar Power System has been successfully installed.\n\n` +
    `📍 *Location:* ${sanitize(location)}\n` +
    `👤 *Client:* ${sanitize(client_name)}\n\n` +
    `⚙️ *System Details*\n` +
    `  ⚡ Inverter: ${sanitize(system_size)}\n` +
    `  🔋 Battery: ${sanitize(battery)}${battery_count ? ` (${battery_count} units)` : ''}\n` +
    `  📊 Panels: ${panels} Units${panel_wattage ? ` @ ${sanitize(panel_wattage)}` : ''}\n\n` +
    `⏱️ *Completed:* ${time}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `#Instollar #SolarInstallation #Nigeria\n\n` +
    `${celebration}`
  );
}

function formatGigPost({ gig_type = 'Installation', location, timeline, scope, inverter_count, battery_count, panel_wattage, system_size, battery, panels }) {
  let scopeDetails = '';
  
  if (gig_type === 'Installation') {
    scopeDetails = (
      `⚙️ *Scope of Work*\n` +
      `  ⚡ Inverters: ${inverter_count} Unit${inverter_count !== 1 ? 's' : ''}\n` +
      `  🔋 Batteries: ${battery_count} Unit${battery_count !== 1 ? 's' : ''}\n` +
      `  📊 Panels: ${panel_wattage}\n\n`
    );
  } else if (['Energy Audit', 'Business Audit', 'Decommissioning', 'Battery Replacement', 'Solar Panel Replacement', 'MPPT Removal'].includes(gig_type)) {
    scopeDetails = (
      `⚙️ *Scope of Work*\n` +
      `  ${scope}\n\n`
    );
  } else {
    scopeDetails = (
      `⚙️ *Details*\n` +
      `  ${scope}\n\n`
    );
  }
  
  return (
    `💼 *NEW GIG — ${sanitize(gig_type, 50)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `A new opportunity is now available.\n\n` +
    `📍 *Location:* ${sanitize(location)}\n\n` +
    scopeDetails +
    `⏰ *Deadline:* ${sanitize(timeline)}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Qualified professionals should express interest below.\n\n` +
    `#Instollar #SolarGig #Nigeria`
  );
}

function formatApplicationAlert({ full_name, phone, email, username, gig_location, created_at }) {
  const time   = formatTime(created_at ? new Date(created_at) : new Date());
  const handle = username ? `@${sanitize(username, 50)}` : 'No username';
  return (
    `👥 *NEW GIG APPLICATION*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 *Name:* ${sanitize(full_name)}\n` +
    `📱 *Phone:* ${sanitize(phone, 20)}\n` +
    `✉️ *Email:* ${sanitize(email)}\n` +
    `📍 *Applied For:* ${sanitize(gig_location)}\n` +
    `⏰ *Time:* ${time}\n` +
    `💬 *Telegram:* ${handle}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Verify this installer on the Instollar platform before assignment.`
  );
}

function formatDailySummary({ installations, gigs, applications }) {
  return (
    `📊 *INSTOLLAR DAILY SUMMARY*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${formatDate()}\n\n` +
    `📈 *Today's Activity*\n\n` +
    `  ✅ Installations Shared: ${installations}\n` +
    `  💼 New Gigs Posted: ${gigs}\n` +
    `  👥 Engineer Applications: ${applications}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Thank you for being part of the Instollar Community.\n\n` +
    `#Instollar #SolarNigeria`
  );
}

function formatAnnouncement(content) {
  return (
    `*INSTOLLAR ANNOUNCEMENT*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${sanitize(content, 2000)}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `#Instollar`
  );
}

/** Preview card shown to admin before publishing */
function formatPreview(label, body) {
  return (
    `*PREVIEW — ${label}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${body}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Reply *CONFIRM* to publish, or *CANCEL* to discard.`
  );
}

function gigKeyboard(gigId) {
  return {
    inline_keyboard: [[
      { text: 'INTERESTED', callback_data: `apply_${gigId}` },
    ]],
  };
}

module.exports = {
  isAdmin,
  getAdminIds,
  sanitize,
  isValidEmail,
  isValidPhone,
  formatTime,
  formatDate,
  minutesAgo,
  getCelebrationEmoji,
  formatInstallationPost,
  formatGigPost,
  formatApplicationAlert,
  formatDailySummary,
  formatAnnouncement,
  formatPreview,
  gigKeyboard,
};
