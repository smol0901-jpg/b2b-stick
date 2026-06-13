/* === state.js — global app state ===
 *
 * S.mats / S.emps / S.tmpls / S.sett / S.logos are populated from Supabase
 * (see index.html APP.loadFromSupabase + realtime subscriptions) and kept
 * in sync in realtime. S.ai / S.tg are local-only (per-browser) settings
 * for the AI assistant and Telegram bot integrations.
 */
const S = {
  ses: null,           // current session user (from Supabase auth + profiles)

  mats:  [],           // materials      ← Supabase `materials`
  emps:  [],           // employees      ← Supabase `profiles` (excluding self)
  tmpls: [],           // label templates ← Supabase `templates`
  sett:  {},           // org settings   ← Supabase `settings.data`
  logos: {},           // logos          ← Supabase `settings.logos`

  ai: {},              // local-only: AI assistant connection
  tg: {},              // local-only: Telegram bot connection

  // UI state
  page: 'dash',
  settTab: 'org',
  cTmpl: null,        // active template in constructor
  eMat: null,         // editing material id
  eEmp: null,         // editing employee id (profile uuid)

  // helpers
  canEdit()    { return this.ses && (this.ses.role === 'superadmin' || this.ses.role === 'admin'); },
  isSA()       { return this.ses && this.ses.role === 'superadmin'; },
  isStaff()    { return this.ses && this.ses.role === 'staff'; }
};

/** Initialize local-only fallback state (called before Supabase login,
 *  so Quick Print / Constructor have system templates to render). */
function initState() {
  S.tmpls = DB.load(DB.KEYS.tmpls, DB.DEFAULTS.tmpls);
  S.sett  = DB.load(DB.KEYS.sett,  DB.DEFAULTS.sett);
  S.ai    = DB.load(DB.KEYS.ai,    DB.DEFAULTS.ai);
  S.tg    = DB.load(DB.KEYS.tg,    DB.DEFAULTS.tg);
  S.logos = DB.load(DB.KEYS.logos, DB.DEFAULTS.logos);
}

/** Persist local-only state (AI/TG settings + template/logo fallback cache).
 *  Business data is written directly to Supabase by each page module. */
function saveState() {
  DB.save(DB.KEYS.tmpls, S.tmpls);
  DB.save(DB.KEYS.ai,    S.ai);
  DB.save(DB.KEYS.tg,    S.tg);
  DB.save(DB.KEYS.logos, S.logos);
}

/** Add activity log entry.
 *  Writes to the shared Supabase `activity` table (visible org-wide,
 *  realtime). Requires an active session — silently no-ops otherwise. */
function logAct(action, user, det = '', entityType = null, entityId = null) {
  if (typeof SB !== 'undefined' && SB.ready && S.ses?.id) {
    SB.logActivity(action, S.ses.id, det, entityType, entityId);
  }
}

/* Lookup helpers */
const CATI = {dairy:'🥛', meat:'🥩', fish:'🐟', veg:'🥦', dry:'🌾', sauce:'🫙', other:'📦'};
const RMAP = {
  superadmin: {lb:'SUPERADMIN', cls:'r-sa', bcls:'b-g'},
  admin:      {lb:'ADMIN',      cls:'r-a',  bcls:'b-p'},
  staff:      {lb:'STAFF',      cls:'r-s',  bcls:'b-a'}
};
