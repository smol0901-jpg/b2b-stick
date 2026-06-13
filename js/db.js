/* === db.js — local-only defaults (AI/Telegram bot settings) + localStorage helper ===
 *
 * IMPORTANT: All business data (materials, employees, templates, print queue,
 * activity log, departments, journals, settings/logos) lives in Supabase —
 * see supabase_schema.sql. This file only covers things intentionally kept
 * per-browser/local:
 *   - AI assistant connection (API key, provider) — js/pages/ai.js
 *   - Telegram bot connection (token, chat id)     — js/pages/ai.js
 *   - System template fallbacks (sys1/sys2/sys3) used before first Supabase sync
 */
const DB = {
  KEYS: {
    tmpls: 'nlp2_tmpls_fallback',
    ai:    'nlp2_ai',
    tg:    'nlp2_tg',
    logos: 'nlp2_logos_fallback'
  },

  DEFAULTS: {
    // System templates — also seeded into Supabase `templates` table via
    // supabase_schema.sql, but kept here as an offline fallback so the
    // Quick Print / Constructor pages render before the first sync completes.
    tmpls: [
      {id:'sys1', name:'Стандарт ХАССП 90×60', sys:true,  w:90, h:60, logo:null, blocks:[
        {id:1,t:'logo'},
        {id:2,t:'text',  lb:'',          val:'{name}',       fs:16, bold:true,  al:'center', cl:'#000000'},
        {id:3,t:'divider'},
        {id:4,t:'grid2', l1:'Вскрыт:',   v1:'{openDate}',    l2:'Годен до:',    v2:'{expiry}',   fs:10},
        {id:5,t:'grid2', l1:'Хранение:', v1:'{temp}',        l2:'Сотрудник:',   v2:'{openedBy}', fs:10},
        {id:6,t:'grid2', l1:'Партия:',   v1:'{batch}',       l2:'',             v2:'',           fs:10},
        {id:7,t:'text',  lb:'⚠ АЛЛЕРГЕНЫ:', val:'{allergens}', fs:10, bold:true, al:'left', cl:'#c62828', cond:'allergens'},
        {id:8,t:'divider'},
        {id:9,t:'qr',    qd:'auto', sz:80},
        {id:10,t:'text', lb:'',          val:'ВЛАВАШЕ ФУД | ХАССП', fs:7, bold:false, al:'center', cl:'#666666'}
      ]},
      {id:'sys2', name:'Компакт 58×40', sys:true, w:58, h:40, logo:null, blocks:[
        {id:1,t:'text',  lb:'',        val:'{name}',     fs:12, bold:true,  al:'center', cl:'#000000'},
        {id:2,t:'grid2', l1:'Вскр:',   v1:'{openDate}', l2:'Год:',  v2:'{expiry}',   fs:9},
        {id:3,t:'grid2', l1:'Темп:',   v1:'{temp}',     l2:'Кто:',  v2:'{openedBy}', fs:9},
        {id:4,t:'qr',    qd:'auto', sz:50}
      ]},
      {id:'sys3', name:'QR-квадрат 50×50', sys:true, w:50, h:50, logo:null, blocks:[
        {id:1,t:'text',  lb:'', val:'{name}',    fs:11, bold:true, al:'center', cl:'#000000'},
        {id:2,t:'qr',    qd:'auto', sz:100},
        {id:3,t:'grid2', l1:'Год:', v1:'{expiry}', l2:'Кто:', v2:'{openedBy}', fs:8}
      ]}
    ],

    sett: {
      org:'ВЛАВАШЕ ФУД КОМПАНИ', orgSh:'ВЛАВАШЕ', inn:'', addr:'',
      haccp:true, haccpStd:'trts022', haccpWarn:'Хранить при указанной температуре. Не повторно замораживать.',
      defaultTmpl:'sys1', defaultOri:'portrait', showQR:true
    },

    ai:    {prov:'none', key:'', ep:'', sp:'Ты ИИ-ассистент NEURAL LABEL PRO. Помогай оптимизировать шаблоны этикеток по ХАССП (ТР ТС 022/2011).'},
    tg:    {tok:'', cid:'', ne:false, np:false, nd:false},
    logos: {}
  },

  load(key, def) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch { return def; }
  },

  save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch(e) { console.error('DB.save error:', e); }
  },

  /** Approximate used storage in MB (local cache only — main DB is Supabase) */
  usedMB() {
    let total = 0;
    for (const k in localStorage) {
      if (!localStorage.hasOwnProperty(k)) continue;
      total += (localStorage[k].length + k.length) * 2;
    }
    return (total / 1024 / 1024).toFixed(2);
  }
};
