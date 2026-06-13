/* === ai.js — AI integrations, Telegram bot, import/export === */

/* ---------- AI module ---------- */
const AI_MOD = {
  _chat: [],
  _loading: false,

  render() {
    const pg = document.getElementById('pg-ai');
    pg.innerHTML = `
      <div class="sh"><span class="st">🧠 ИИ & Интеграции</span></div>
      <div style="overflow-y:auto;flex:1;padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:14px;align-content:start">

        <!-- AI API -->
        <div class="card">
          <div class="ch" style="background:linear-gradient(90deg,rgba(0,212,255,.07),transparent)">
            <span style="font-size:15px">🧠</span><span class="ct c-accent">Нейросеть</span>
          </div>
          <div class="cb">
            <div class="fg mb8"><label>Провайдер</label>
              <select id="aiprov" onchange="AI_MOD.saveSettings()">
                <option value="anthropic">Anthropic Claude</option>
                <option value="openai">OpenAI GPT-4</option>
                <option value="yandex">YandexGPT</option>
                <option value="giga">GigaChat</option>
                <option value="local">Локальная (Ollama)</option>
                <option value="none">Не подключён</option>
              </select>
            </div>
            <div class="fg mb8"><label>API Ключ</label>
              <input type="password" id="aikey" placeholder="sk-..." oninput="AI_MOD.saveSettings()">
            </div>
            <div class="fg mb8"><label>Endpoint (custom / local)</label>
              <input type="text" id="aiep" placeholder="http://localhost:11434/api" oninput="AI_MOD.saveSettings()">
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <button class="btn bp btn-sm" onclick="AI_MOD.test()">🔌 Проверить</button>
              <span id="aitr" style="font-size:11px;font-family:var(--ff)"></span>
            </div>
            <div class="aip mt12">
              <div class="aih">
                <div class="ai-dot" id="aicd"></div>
                <span class="ait">ИИ АССИСТЕНТ</span>
                <button class="btn bg btn-sm" style="margin-left:auto;font-size:10px" onclick="AI_MOD.clearChat()">Очистить</button>
              </div>
              <div class="ach" id="aichat"></div>
              <div class="air">
                <input type="text" id="aiinp" placeholder="Оптимизируй шаблон для ХАССП..."
                  onkeydown="if(event.key==='Enter')AI_MOD.send()">
                <button class="btn bp btn-sm" onclick="AI_MOD.send()">→</button>
              </div>
            </div>
          </div>
        </div>

        <!-- TELEGRAM -->
        <div class="card">
          <div class="ch"><span style="font-size:15px">✈️</span><span class="ct">Telegram Бот</span></div>
          <div class="cb">
            <div class="tgs mb8" id="tgst">
              <div class="sd s-off" id="tgdot"></div>
              <span id="tgtxt">Не настроен</span>
            </div>
            <div class="fg mb8"><label>BOT TOKEN</label>
              <input type="password" id="tgtok" placeholder="123456:ABC..." oninput="TG_MOD.save()">
            </div>
            <div class="fg mb8"><label>CHAT ID (группа / канал / пользователь)</label>
              <input type="text" id="tgcid" placeholder="-100123456789" oninput="TG_MOD.save()">
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn bp btn-sm" onclick="TG_MOD.test()">🔌 Проверить</button>
              <button class="btn bg btn-sm" onclick="TG_MOD.sendReport()">📊 Отчёт сейчас</button>
            </div>
            <div class="fg mt12"><label>Авто-уведомления</label>
              <div style="display:flex;flex-direction:column;gap:6px;margin-top:5px">
                <label style="display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text);text-transform:none;cursor:pointer">
                  <input type="checkbox" id="tgne" onchange="TG_MOD.save()"> Истечение сроков годности
                </label>
                <label style="display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text);text-transform:none;cursor:pointer">
                  <input type="checkbox" id="tgnp" onchange="TG_MOD.save()"> При каждой печати этикетки
                </label>
                <label style="display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text);text-transform:none;cursor:pointer">
                  <input type="checkbox" id="tgnd" onchange="TG_MOD.save()"> Ежедневный отчёт
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- AI TEMPLATES без API -->
        <div class="card">
          <div class="ch"><span style="font-size:15px">🔄</span><span class="ct">ИИ Шаблоны без API</span></div>
          <div class="cb">
            <p style="font-size:11px;color:var(--muted2);margin-bottom:12px;line-height:1.7">
              Выгрузите шаблон в JSON → загрузите в ChatGPT / Claude.ai → получите улучшенный JSON → загрузите обратно.<br>
              <b style="color:var(--accent)">Не требует API ключа.</b>
            </p>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn bp btn-sm" onclick="CONS.exportAI()">📥 Выгрузить шаблон</button>
              <button class="btn bg btn-sm" onclick="document.getElementById('aiImp2').click()">📤 Загрузить шаблон</button>
              <input type="file" id="aiImp2" accept=".json" style="display:none" onchange="CONS.importAI(event)">
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
              ${S.isSA() ? `
              <button class="btn bg btn-sm" onclick="DATA.exportAll()">💾 Полный бэкап</button>
              <button class="btn bg btn-sm" onclick="document.getElementById('impAll').click()">📥 Восстановить бэкап</button>
              <input type="file" id="impAll" accept=".json" style="display:none" onchange="DATA.importAll(event)">
              ` : `<span style="font-size:10px;color:var(--muted2)">Бэкап доступен Суперадмину</span>`}
            </div>
          </div>
        </div>

        <!-- ИМПОРТ БАЗЫ -->
        <div class="card">
          <div class="ch"><span style="font-size:15px">📊</span><span class="ct">Импорт базы данных</span></div>
          <div class="cb">
            <p style="font-size:11px;color:var(--muted2);margin-bottom:10px;line-height:1.7">
              Загрузите CSV с колонками: Наименование; Категория; Температура; Срок_вскрытия_ч; Аллергены; Поставщик
            </p>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn bp btn-sm" onclick="document.getElementById('csvImp').click()">📊 Загрузить CSV / JSON</button>
              <input type="file" id="csvImp" accept=".csv,.json" style="display:none" onchange="DATA.importCSV(event)">
              <button class="btn bg btn-sm" onclick="DATA.dlTemplate()">⬇️ Шаблон CSV</button>
            </div>
            <div class="fg mt12">
              <label>Системный промпт для ИИ-ассистента</label>
              <textarea id="aisp" rows="3" placeholder="Ты ИИ-ассистент NEURAL LABEL PRO..." oninput="AI_MOD.saveSettings()"></textarea>
            </div>
          </div>
        </div>

      </div>`;

    // Fill values
    document.getElementById('aiprov').value = S.ai.prov || 'none';
    document.getElementById('aikey').value  = S.ai.key  || '';
    document.getElementById('aiep').value   = S.ai.ep   || '';
    document.getElementById('aisp').value   = S.ai.sp   || '';
    document.getElementById('tgtok').value  = S.tg.tok  || '';
    document.getElementById('tgcid').value  = S.tg.cid  || '';
    document.getElementById('tgne').checked = S.tg.ne   || false;
    document.getElementById('tgnp').checked = S.tg.np   || false;
    document.getElementById('tgnd').checked = S.tg.nd   || false;
    this.updStatus();
    TG_MOD.updStatus();
  },

  saveSettings() {
    S.ai.prov = document.getElementById('aiprov').value;
    S.ai.key  = document.getElementById('aikey').value;
    S.ai.ep   = document.getElementById('aiep').value;
    S.ai.sp   = document.getElementById('aisp').value;
    saveState();
    this.updStatus();
  },

  updStatus() {
    const on = S.ai.prov !== 'none' && S.ai.key;
    ['aidot','aicd'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.className = 'ai-dot' + (on ? ' on' : '');
    });
    const st = document.getElementById('aistat');
    if (st) st.textContent = on ? 'AI:' + S.ai.prov.toUpperCase() : 'AI:OFF';
  },

  async test() {
    const r = document.getElementById('aitr');
    if (!r) return;
    r.textContent = '⏳ Проверка...'; r.style.color = 'var(--muted)';
    if (S.ai.prov === 'none' || !S.ai.key) {
      r.textContent = '❌ Не настроен'; r.style.color = 'var(--danger)'; return;
    }
    if (S.ai.prov === 'anthropic') {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {'Content-Type':'application/json','x-api-key':S.ai.key,'anthropic-version':'2023-06-01'},
          body: JSON.stringify({model:'claude-sonnet-4-20250514', max_tokens:10, messages:[{role:'user',content:'ping'}]})
        });
        const d = await res.json();
        if (d.content) { r.textContent = '✅ Подключено'; r.style.color = 'var(--success)'; }
        else           { r.textContent = '❌ ' + (d.error?.message || 'Ошибка'); r.style.color = 'var(--danger)'; }
      } catch(e) { r.textContent = '❌ ' + e.message; r.style.color = 'var(--danger)'; }
    } else {
      r.textContent = '⚠️ Тест для ' + S.ai.prov + ' — проверьте вручную';
      r.style.color = 'var(--warn)';
    }
  },

  async send() {
    if (this._loading) return;
    const inp = document.getElementById('aiinp');
    const msg = inp?.value.trim();
    if (!msg) return;
    inp.value = '';
    this._addMsg(msg, 'u');

    if (S.ai.prov === 'none' || !S.ai.key) {
      this._addMsg('⚠️ Нейросеть не подключена. Настройте API ключ выше.', 'b');
      return;
    }

    this._loading = true;
    this._addMsg('⏳ Генерация ответа...', 'b');

    const history = this._chat.slice(-12).map(x => ({
      role: x.r === 'u' ? 'user' : 'assistant',
      content: x.t
    }));
    history.push({role:'user', content:msg});

    try {
      let reply = '';
      if (S.ai.prov === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {'Content-Type':'application/json','x-api-key':S.ai.key,'anthropic-version':'2023-06-01'},
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: S.ai.sp || 'Ты ИИ-ассистент NEURAL LABEL PRO. Помогай оптимизировать шаблоны этикеток по ХАССП.',
            messages: history
          })
        });
        const d = await res.json();
        reply = d.content?.[0]?.text || JSON.stringify(d.error || 'Нет ответа');
      } else {
        reply = `Провайдер "${S.ai.prov}" — используйте режим "Без API": выгрузите шаблон → отправьте в ChatGPT → загрузите ответ.`;
      }
      // Remove loading bubble
      const chat = document.getElementById('aichat');
      const last = chat?.querySelector('.am-b:last-child');
      if (last && last.textContent.includes('⏳')) last.remove();
      this._addMsg(reply, 'b');
      this._chat.push({r:'u', t:msg}, {r:'b', t:reply});
    } catch(e) {
      const chat = document.getElementById('aichat');
      const last = chat?.querySelector('.am-b:last-child');
      if (last) last.remove();
      this._addMsg('❌ Ошибка: ' + e.message, 'b');
    }
    this._loading = false;
  },

  _addMsg(text, from) {
    const chat = document.getElementById('aichat');
    if (!chat) return;
    const el = document.createElement('div');
    el.className = 'am am-' + from;
    if (from === 'b') {
      const s = document.createElement('div');
      s.className = 'ams'; s.textContent = 'NEURAL AI';
      el.appendChild(s);
    }
    const t = document.createElement('div');
    t.textContent = text;
    el.appendChild(t);
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  },

  clearChat() {
    const el = document.getElementById('aichat');
    if (el) el.innerHTML = '';
    this._chat = [];
  }
};

/* ---------- Telegram module ---------- */
const TG_MOD = {
  save() {
    S.tg.tok = document.getElementById('tgtok')?.value || '';
    S.tg.cid = document.getElementById('tgcid')?.value || '';
    S.tg.ne  = document.getElementById('tgne')?.checked || false;
    S.tg.np  = document.getElementById('tgnp')?.checked || false;
    S.tg.nd  = document.getElementById('tgnd')?.checked || false;
    saveState();
    this.updStatus();
  },

  updStatus() {
    const ok  = S.tg.tok && S.tg.cid;
    const dot = document.getElementById('tgdot');
    const txt = document.getElementById('tgtxt');
    if (dot) dot.className = 'sd ' + (ok ? 's-on' : 's-off');
    if (txt) txt.textContent = ok ? 'Подключён: ' + S.tg.cid : 'Не настроен';
  },

  async test() {
    if (!S.tg.tok || !S.tg.cid) { UI.toast('Введите токен и Chat ID', 'err'); return; }
    try {
      const r = await fetch(`https://api.telegram.org/bot${S.tg.tok}/sendMessage`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({chat_id: S.tg.cid, text: '🔌 *NEURAL LABEL PRO* — тест соединения ✅', parse_mode:'Markdown'})
      });
      const d = await r.json();
      if (d.ok) { UI.toast('✅ Telegram подключён!'); this.updStatus(); }
      else      { UI.toast('❌ TG: ' + d.description, 'err'); }
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async sendReport() {
    if (!S.tg.tok || !S.tg.cid) { UI.toast('Telegram не настроен', 'err'); return; }
    const now  = Date.now();
    const cr   = S.mats.filter(m => m.exp && m.st !== 'arc' && (new Date(m.exp) - now) < 0);
    const wr   = S.mats.filter(m => m.exp && m.st !== 'arc' && (new Date(m.exp) - now) / 86400000 <= 3 && (new Date(m.exp) - now) >= 0);
    const text = [
      `📊 *NEURAL LABEL PRO — Отчёт*`,
      `📅 ${new Date().toLocaleDateString('ru')}`,
      ``,
      `🧪 Активное сырьё: ${S.mats.filter(m => m.st !== 'arc').length}`,
      `👥 Сотрудники: ${S.emps.filter(e => e.st !== 'arc').length}`,
      ``,
      cr.length ? `🚨 *Просрочено:* ${cr.map(m => m.name).join(', ')}` : `✅ Просроченных нет`,
      wr.length ? `⚠️ *Истекают скоро:* ${wr.map(m => m.name).join(', ')}` : `✅ Критичных сроков нет`,
    ].join('\n');
    await this.send(text);
    UI.toast('📊 Отчёт отправлен в TG');
  },

  async send(text) {
    if (!S.tg.tok || !S.tg.cid) return;
    try {
      await fetch(`https://api.telegram.org/bot${S.tg.tok}/sendMessage`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({chat_id: S.tg.cid, text, parse_mode: 'Markdown'})
      });
    } catch(e) { console.error('TG send error:', e); }
  }
};

/* ---------- Alerts ---------- */
const ALERTS = {
  checkExpiry() {
    const now = Date.now();
    const cr  = S.mats.filter(m => m.exp && m.st !== 'arc' && (new Date(m.exp) - now) < 0);
    if (cr.length && S.tg.ne && S.tg.tok && S.tg.cid) {
      TG_MOD.send(`🚨 *ПРОСРОЧЕНО:* ${cr.map(m => m.name).join(', ')}`);
    }
  },

  dailyReport() {
    if (!S.tg.nd || !S.tg.tok || !S.tg.cid) return;
    const last  = parseInt(localStorage.getItem('_nlp_ds') || '0');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (last < today.getTime()) {
      TG_MOD.sendReport();
      localStorage.setItem('_nlp_ds', String(Date.now()));
    }
  }
};

/* ---------- Data import/export (Supabase-backed) ---------- */
const DATA = {
  /** Export a full snapshot of the shared database (materials, templates,
   *  settings, activity). Employee accounts are NOT exported (managed via
   *  Supabase Auth). Superadmin only. */
  async exportAll() {
    if (!S.isSA()) { UI.toast('Только Суперадмин', 'err'); return; }
    UI.toast('⏳ Формирование бэкапа...', 'inf');
    try {
      const [mats, tmpls, act] = await Promise.all([
        SB.getAll('materials'),
        SB.getAll('templates'),
        SB.getActivity(500)
      ]);
      const payload = {
        version: '2.0',
        org: S.ses?.orgId || 'vlavashe',
        date: new Date().toISOString(),
        mats, tmpls,
        sett: S.sett,
        logos: S.logos,
        activity: act
      };
      UI.download(JSON.stringify(payload, null, 2), `nlp_backup_${new Date().toISOString().slice(0,10)}.json`);
      UI.toast('💾 Бэкап создан');
      logAct('Экспорт полного бэкапа', S.ses?.name, '', 'system');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  /** Restore materials + templates from a previously exported backup.
   *  Inserts new rows (does not overwrite existing IDs) to avoid collisions.
   *  Superadmin only. */
  async importAll(ev) {
    if (!S.isSA()) { UI.toast('Только Суперадмин', 'err'); ev.target.value=''; return; }
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async e => {
      try {
        const d = JSON.parse(e.target.result.replace(/^\uFEFF/, ''));
        let cntM = 0, cntT = 0;

        if (Array.isArray(d.mats)) {
          for (const m of d.mats) {
            const { id, created_at, updated_at, ...fields } = m;
            await SB.insert('materials', { ...fields, created_by: S.ses?.id, org_id: S.ses?.orgId || 'vlavashe' });
            cntM++;
          }
        }
        if (Array.isArray(d.tmpls)) {
          for (const t of d.tmpls) {
            if (t.is_system) continue; // never overwrite system templates
            const newId = 't' + Date.now() + '_' + Math.floor(Math.random()*1000);
            await SB.insert('templates', {
              id: newId, name: t.name, is_system: false,
              width_mm: t.width_mm, height_mm: t.height_mm, logo: t.logo, blocks: t.blocks,
              created_by: S.ses?.id, org_id: S.ses?.orgId || 'vlavashe'
            });
            cntT++;
          }
        }
        if (d.sett) {
          S.sett = { ...S.sett, ...d.sett };
          await SB.updateSettings(S.ses?.orgId || 'vlavashe', S.sett, d.logos || null);
        }

        logAct('Импорт бэкапа', S.ses?.name, `сырьё: ${cntM}, шаблоны: ${cntT}`, 'system');
        UI.toast(`✅ Импортировано: сырьё ${cntM}, шаблоны ${cntT}`);
        await MATS._reload();
      } catch(err) { UI.toast('❌ ' + err.message, 'err'); }
    };
    r.readAsText(f);
    ev.target.value = '';
  },

  /** Import materials from CSV directly into Supabase `materials` table. */
  importCSV(ev) {
    if (!S.canEdit()) { UI.toast('Нет прав', 'err'); ev.target.value=''; return; }
    const f = ev.target.files[0]; if (!f) return;
    if (f.name.endsWith('.json')) { this.importAll(ev); return; }

    const r = new FileReader();
    r.onload = async e => {
      const lines = e.target.result.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
      const hdr   = lines[0].split(';').map(h => h.trim().toLowerCase());
      let cnt = 0, errors = 0;

      for (const line of lines.slice(1)) {
        const cols = line.split(';');
        const o    = {};
        hdr.forEach((h, i) => o[h] = (cols[i] || '').trim());
        const nm = o['наименование'] || o['name'] || o['название'];
        if (!nm) continue;

        try {
          await SB.insert('materials', {
            name: nm,
            category:    o['категория']   || o['category'] || 'other',
            temperature: o['температура'] || o['temp']     || '',
            shelf_hours: parseInt(o['срок_вскрытия_ч'] || o['shelf'] || '') || null,
            allergens:   o['аллергены']    || o['allergens'] || '',
            supplier:    o['поставщик']    || o['supplier']  || '',
            unit: 'кг', status: 'active',
            created_by: S.ses?.id, org_id: S.ses?.orgId || 'vlavashe'
          });
          cnt++;
        } catch { errors++; }
      }

      logAct('Импорт CSV', S.ses?.name, `добавлено: ${cnt}${errors?', ошибок: '+errors:''}`, 'material');
      UI.toast(`✅ Импортировано: ${cnt} позиций${errors ? `, ошибок: ${errors}` : ''}`);
      await MATS._reload();
    };
    r.readAsText(f, 'utf-8');
    ev.target.value = '';
  },

  dlTemplate() {
    const csv = [
      'Наименование;Категория;Температура;Срок_вскрытия_ч;Аллергены;Поставщик',
      'Сливки 33%;dairy;+2...+6°C;48;Молоко;МолоПром',
      'Фарш говяжий;meat;0...+2°C;24;—;МяСнаб',
      'Соус Бешамель;sauce;+2...+6°C;72;Молоко, глютен;СоусПак'
    ].join('\n');
    UI.download('\uFEFF' + csv, 'nlp_import_template.csv', 'text/csv;charset=utf-8');
    UI.toast('⬇️ Шаблон CSV скачан');
  }
};
