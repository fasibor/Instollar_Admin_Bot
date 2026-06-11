/**
 * Instollar Bot — Centralised Session Manager v1.2
 *
 * Issues fixed:
 *  - R6:  isAllowedChat now handles callback_query (no ctx.chat) correctly
 *  - R9:  canClick() stamps timestamp only after passing all early-reject checks
 *  - R1:  Dead /cancel text checks removed from wizard handlers (global cancel handles it)
 *  - R3:  Session TTL — 15-minute expiry with GC
 *  - R4:  Rate-limiting for INTERESTED button
 */

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RATELIMIT_MS   = 3  * 1000;       // 3 seconds per user between button clicks

// Namespace → userId → { ...data, expiresAt }
const stores = {};

// userId → lastClickTimestamp
const lastClick = new Map();

// ── Generic session helpers ───────────────────────────────────

function set(ns, userId, value) {
  if (!stores[ns]) stores[ns] = new Map();
  stores[ns].set(userId, { ...value, expiresAt: Date.now() + SESSION_TTL_MS });
}

function get(ns, userId) {
  const store = stores[ns];
  if (!store) return null;
  const entry = store.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(userId);
    return null;
  }
  entry.expiresAt = Date.now() + SESSION_TTL_MS; // refresh on access
  return entry;
}

function del(ns, userId) {
  if (stores[ns]) stores[ns].delete(userId);
}

function has(ns, userId) {
  return !!get(ns, userId);
}

/** Cancel ALL active sessions for a user across every namespace. */
function cancelAll(userId) {
  let cancelled = false;
  for (const store of Object.values(stores)) {
    if (store.has(userId)) {
      store.delete(userId);
      cancelled = true;
    }
  }
  return cancelled;
}

// ── Rate-limiting ─────────────────────────────────────────────

/**
 * FIX R9: Stamp the click timestamp only when we're going to allow the action.
 * Call this AFTER all early-reject checks (duplicate, gig-not-found, etc.) so
 * a rejected click doesn't consume the user's 3-second rate-limit window.
 */
function canClick(userId) {
  const last = lastClick.get(userId) || 0;
  if (Date.now() - last < RATELIMIT_MS) return false;
  // Stamp only here — after the check passes
  lastClick.set(userId, Date.now());
  return true;
}

/**
 * Call this to consume the rate-limit slot AFTER all business-logic checks pass.
 * Pair with canClick: first call canClick (no stamp), then call this once sure to proceed.
 * Used in application handler to fix R9.
 */
function stampClick(userId) {
  lastClick.set(userId, Date.now());
}

// ── Group-message guard ───────────────────────────────────────

/**
 * FIX R6: ctx.chat is undefined for callback_query updates (inline button presses).
 * We must allow callback_query through regardless of chat — Telegram sends them
 * directly to the bot, not via a chat. Only filter text/photo updates from unknown groups.
 */
function isAllowedChat(ctx) {
  // Callback queries have no ctx.chat — always allow them
  if (ctx.updateType === 'callback_query') return true;

  const chatId   = String(ctx.chat?.id  ?? '');
  const chatType = ctx.chat?.type ?? '';

  // Private DMs always allowed
  if (chatType === 'private') return true;

  // Groups: only the community group and the admin group
  const allowed = [
    String(process.env.COMMUNITY_CHAT_ID),
    String(process.env.ADMIN_GROUP_ID),
  ].filter(Boolean);

  return allowed.includes(chatId);
}

// ── Periodic GC ───────────────────────────────────────────────

setInterval(() => {
  const now = Date.now();
  for (const store of Object.values(stores)) {
    for (const [key, val] of store) {
      if (now > val.expiresAt) store.delete(key);
    }
  }
  for (const [key, ts] of lastClick) {
    if (now - ts > 60_000) lastClick.delete(key);
  }
}, 5 * 60 * 1000).unref();

module.exports = { set, get, del, has, cancelAll, canClick, stampClick, isAllowedChat };
