/* === supabase.js — Supabase client + Realtime === */
/* 
  НАСТРОЙКА:
  1. Зайди на supabase.com → создай проект
  2. Settings → API → скопируй URL и anon key
  3. Вставь ниже
*/

const SUPABASE_URL  = 'https://yfxtmmhxbixngdvmucoc.supabase.co';   // ← заменить
const SUPABASE_ANON = 'sb_publishable_N89j1UFUTdFMfHaixSJTlA_3CZXlokJ';                       // ← заменить

// Подключаем SDK через CDN (добавлено в index.html)
const _sb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON);

const SB = {
  client: _sb,
  ready: !!(SUPABASE_URL.includes('.supabase.co') && SUPABASE_ANON.length > 20),

  /* ---- AUTH ---- */
  async signIn(email, password) {
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp(email, password, meta) {
    const { data, error } = await _sb.auth.signUp({
      email, password,
      options: { data: meta }   // { name, role, position, dept, phone, tg }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await _sb.auth.signOut();
  },

  async getUser() {
    const { data } = await _sb.auth.getUser();
    return data?.user || null;
  },

  async getSession() {
    const { data } = await _sb.auth.getSession();
    return data?.session || null;
  },

  /* ---- PROFILE (extends auth.users via profiles table) ---- */
  async getProfile(userId) {
    const { data, error } = await _sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsertProfile(profile) {
    const { data, error } = await _sb
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /* ---- GENERIC CRUD ---- */
  async getAll(table) {
    const { data, error } = await _sb.from(table).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insert(table, row) {
    const { data, error } = await _sb.from(table).insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async update(table, id, updates) {
    const { data, error } = await _sb.from(table).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(table, id) {
    const { error } = await _sb.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async upsert(table, row, conflict = 'id') {
    const { data, error } = await _sb.from(table).upsert(row, { onConflict: conflict }).select().single();
    if (error) throw error;
    return data;
  },

  /* ---- REALTIME ---- */
  /**
   * Subscribe to table changes
   * @param {string} table
   * @param {function} cb - called with {event, new, old}
   * @returns channel (call .unsubscribe() to stop)
   */
  subscribe(table, cb) {
    return _sb
      .channel('rt_' + table)
      .on('postgres_changes', { event: '*', schema: 'public', table }, payload => cb(payload))
      .subscribe();
  },

  /* ---- PRINT QUEUE ---- */
  async addPrintJob(job) {
    return this.insert('print_queue', {
      ...job,
      status: 'pending',
      created_by: job.created_by,
      created_at: new Date().toISOString()
    });
  },

  async getPrintQueue() {
    const { data, error } = await _sb
      .from('print_queue')
      .select('*, profiles(name, role)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updatePrintJob(id, updates) {
    return this.update('print_queue', id, updates);
  },

  /* ---- ACTIVITY LOG ---- */
  async logActivity(action, userId, detail = '', entityType = null, entityId = null) {
    try {
      await _sb.rpc('log_activity', {
        p_action: action,
        p_user_id: userId,
        p_user_name: S.ses?.name || '',
        p_entity_type: entityType,
        p_entity_id: entityId ? String(entityId) : null,
        p_detail: detail,
        p_org_id: S.ses?.orgId || 'vlavashe'
      });
    } catch(e) { console.error('logActivity error:', e); }
  },

  async getActivity(limit = 300) {
    const { data, error } = await _sb
      .from('activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async clearActivity() {
    const { error } = await _sb.from('activity').delete().neq('id', 0);
    if (error) throw error;
  },

  /* ---- DEPARTMENTS (цеха) ---- */
  async getDepartments() {
    const { data, error } = await _sb.from('departments').select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  async addDepartment(dept) {
    return this.insert('departments', { ...dept, created_by: S.ses?.id, org_id: S.ses?.orgId || 'vlavashe' });
  },

  async updateDepartment(id, updates) {
    return this.update('departments', id, updates);
  },

  async removeDepartment(id) {
    return this.remove('departments', id);
  },

  /* ---- JOURNALS (ХАССП журналы) ---- */
  async getJournals() {
    const { data, error } = await _sb.from('journals').select('*').eq('active', true).order('title');
    if (error) throw error;
    return data || [];
  },

  async getJournalEntries(journalId, limit = 100) {
    const { data, error } = await _sb
      .from('journal_entries')
      .select('*')
      .eq('journal_id', journalId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async addJournalEntry(journalId, data) {
    return this.insert('journal_entries', {
      journal_id: journalId,
      data,
      signed_by: S.ses?.id,
      signed_name: S.ses?.name,
      org_id: S.ses?.orgId || 'vlavashe'
    });
  },

  async removeJournalEntry(id) {
    return this.remove('journal_entries', id);
  },

  /* ---- SETTINGS (org-scoped) ---- */
  async getSettings(orgId = 'vlavashe') {
    const { data, error } = await _sb.from('settings').select('*').eq('org_id', orgId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateSettings(orgId, data, logos) {
    const update = { org_id: orgId, updated_by: S.ses?.id, updated_at: new Date().toISOString() };
    if (data)  update.data  = data;
    if (logos) update.logos = logos;
    const { data: res, error } = await _sb.from('settings').upsert(update, { onConflict: 'org_id' }).select().single();
    if (error) throw error;
    return res;
  },

  /* ---- PRINT QUEUE cleanup ---- */
  async clearPrintQueue(statusFilter = null) {
    let q = _sb.from('print_queue').delete();
    q = statusFilter ? q.eq('status', statusFilter) : q.neq('id', 0);
    const { error } = await q;
    if (error) throw error;
  }
};

/* ============================================================
   ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ
   ============================================================
   Весь SQL для создания таблиц находится в отдельном файле:

       supabase_schema.sql

   Выполни его целиком в Supabase Dashboard → SQL Editor → Run.

   Таблицы:
     profiles        — сотрудники + роли (superadmin/admin/staff)
     departments     — цеха и отделы
     materials       — номенклатура сырья
     templates       — шаблоны этикеток
     print_queue     — очередь / журнал печати
     activity        — полная история операций
     settings        — настройки организации + логотипы
     journals        — ХАССП журналы (расширяемые)
     journal_entries — записи в журналах

   RLS правила:
     staff      — только SELECT везде (выбор, без редактирования)
     admin      — INSERT/UPDATE номенклатуры, шаблонов, сотрудников
     superadmin — полный доступ + DELETE + очистка логов
   ============================================================ */
