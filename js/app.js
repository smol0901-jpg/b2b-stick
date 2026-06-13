/* === app.js — batch print, ZPL modal, modals container, app init === */

/* ============================================================
   BATCH PRINT
   ============================================================ */
const BATCH = {
  openModal() {
    // Inject modal if not yet present
    if (!document.getElementById('modal-batch')) {
      document.getElementById('modals-container').insertAdjacentHTML('beforeend', this._tpl());
    }
    // Fill dropdowns
    document.getElementById('bt_tmpl').innerHTML =
      S.tmpls.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    document.getElementById('bt_emp').innerHTML =
      '<option value="">-- Сотрудник --</option>' +
      S.emps.filter(e => e.st !== 'arc').map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    const now = new Date();
    document.getElementById('bt_dt').value =
      new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    this._renderList();
    UI.openModal('modal-batch');
  },

  _tpl() {
    return `
    <div class="modal" id="modal-batch">
      <div class="mbox mlg">
        <div class="mh"><h3>📦 Пакетная печать этикеток</h3><button class="mc" onclick="UI.closeModal('modal-batch')">✕</button></div>
        <div class="mb">
          <div style="display:flex;gap:9px;margin-bottom:12px;flex-wrap:wrap;align-items:flex-end">
            <div class="fg" style="flex:1;min-width:150px"><label>Шаблон</label>
              <select id="bt_tmpl" class="sel-inline" style="width:100%;padding:6px 8px;font-size:12px"></select></div>
            <div class="fg" style="width:80px"><label>Кол-во</label>
              <input type="number" id="bt_cnt" value="1" min="1" max="50"
                style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:6px 8px;border-radius:var(--r);font-size:12px;width:100%"></div>
            <div class="fg" style="width:160px"><label>Сотрудник</label>
              <select id="bt_emp" class="sel-inline" style="width:100%;padding:6px 8px;font-size:12px"></select></div>
            <div class="fg" style="width:175px"><label>Дата вскрытия</label>
              <input type="datetime-local" id="bt_dt"
                style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:5px 7px;border-radius:var(--r);font-size:11px;width:100%"></div>
          </div>
          <div style="display:flex;gap:7px;margin-bottom:8px;align-items:center">
            <button class="btn bg btn-sm" onclick="BATCH.selAll(true)">Выбрать все</button>
            <button class="btn bg btn-sm" onclick="BATCH.selAll(false)">Снять все</button>
            <span id="bt_selc" style="font-size:11px;color:var(--accent);font-family:var(--ff);margin-left:auto"></span>
          </div>
          <div id="bt_list" style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r)"></div>
        </div>
        <div class="mf">
          <button class="btn bg" onclick="UI.closeModal('modal-batch')">Отмена</button>
          <button class="btn bs btn-lg" onclick="BATCH.print()">🖨️ Печать выбранных</button>
        </div>
      </div>
    </div>`;
  },

  _renderList() {
    const el = document.getElementById('bt_list');
    if (!el) return;
    const mats = S.mats.filter(m => m.st !== 'arc');
    el.innerHTML = mats.map(m => `
      <div class="bt-row">
        <input type="checkbox" class="btcb" data-id="${m.id}" checked
          style="width:15px;height:15px;accent-color:var(--accent);cursor:pointer;flex-shrink:0"
          onchange="BATCH.updCount()">
        <span style="font-size:18px;flex-shrink:0">${CATI[m.cat]||'📦'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600">${m.name}</div>
          <div style="font-size:10px;color:var(--muted2)">${m.tmp||'—'} · ${m.sh?m.sh+'ч':''} · ${m.all||'нет аллергенов'}</div>
        </div>
        <span style="font-size:10px;color:var(--muted2);font-family:var(--ff);flex-shrink:0">${m.lot||''}</span>
      </div>`).join('');
    this.updCount();
  },

  selAll(v) {
    document.querySelectorAll('.btcb').forEach(c => c.checked = v);
    this.updCount();
  },

  updCount() {
    const n = document.querySelectorAll('.btcb:checked').length;
    const el = document.getElementById('bt_selc');
    if (el) el.textContent = `Выбрано: ${n}`;
  },

  print() {
    const ids = Array.from(document.querySelectorAll('.btcb:checked')).map(c => parseInt(c.dataset.id));
    if (!ids.length) { UI.toast('Выберите хотя бы один продукт', 'err'); return; }

    const tid  = document.getElementById('bt_tmpl').value;
    const tmpl = S.tmpls.find(t => t.id === tid) || S.tmpls[0];
    const cnt  = parseInt(document.getElementById('bt_cnt').value) || 1;
    const eid  = parseInt(document.getElementById('bt_emp').value);
    const emp  = S.emps.find(e => e.id === eid);
    const od   = document.getElementById('bt_dt').value;
    const ob   = emp ? emp.name : '—';

    const items = ids.map(id => {
      const m = S.mats.find(x => x.id === id);
      if (!m) return null;
      return { data: LABEL.matToData(m, od, ob, m.lot), tmpl, count: cnt };
    }).filter(Boolean);

    LABEL.printBatch(items, 'portrait');
    UI.closeModal('modal-batch');
    logAct(`Пакетная печать (${ids.length} поз.)`, S.ses?.name);
    UI.toast(`🖨️ Печать: ${ids.length} × ${cnt} этикеток`, 'inf');
    if (S.tg.np && S.tg.tok && S.tg.cid)
      TG_MOD.send(`📦 Пакетная печать: ${ids.length} позиций\nСотрудник: ${ob}`);
  }
};

/* ============================================================
   ZPL MODULE
   ============================================================ */
const ZPL = {
  open(matId) {
    if (!document.getElementById('modal-zpl')) {
      document.getElementById('modals-container').insertAdjacentHTML('beforeend', this._tpl());
    }
    const sel = document.getElementById('zp_mat');
    sel.innerHTML = S.mats.filter(m => m.st !== 'arc')
      .map(m => `<option value="${m.id}" ${m.id === matId ? 'selected' : ''}>${m.name}</option>`).join('');
    document.getElementById('zpl_out').value = '';
    UI.openModal('modal-zpl');
  },

  _tpl() {
    return `
    <div class="modal" id="modal-zpl">
      <div class="mbox">
        <div class="mh"><h3>🦓 ZPL — Zebra Label Printer</h3><button class="mc" onclick="UI.closeModal('modal-zpl')">✕</button></div>
        <div class="mb">
          <p style="font-size:11px;color:var(--muted2);margin-bottom:12px;line-height:1.7">
            Генерация ZPL-кода для прямой отправки на Zebra-совместимые принтеры.<br>
            203 dpi: 1 мм ≈ 8 pt &nbsp;·&nbsp; 300 dpi: 1 мм ≈ 12 pt
          </p>
          <div class="g2 mb8">
            <div class="fg"><label>Продукт</label>
              <select id="zp_mat" class="sel-inline" style="width:100%;padding:6px 8px;font-size:12px"></select>
            </div>
            <div class="fg"><label>Ширина этикетки (точки)</label>
              <input type="number" id="zp_w" value="720"
                style="background:var(--bg2);border:1px solid var(--border);color:var(--text);padding:6px 8px;border-radius:var(--r);font-size:12px;width:100%">
            </div>
          </div>
          <textarea id="zpl_out" readonly placeholder="Нажмите «Генерировать»..."></textarea>
        </div>
        <div class="mf">
          <button class="btn bg"  onclick="UI.closeModal('modal-zpl')">Закрыть</button>
          <button class="btn bp"  onclick="ZPL.gen()">⚡ Генерировать</button>
          <button class="btn bg"  onclick="ZPL.copy()">📋 Копировать</button>
          <button class="btn bg"  onclick="ZPL.download()">💾 Скачать .zpl</button>
        </div>
      </div>
    </div>`;
  },

  gen() {
    const id  = parseInt(document.getElementById('zp_mat').value);
    const m   = S.mats.find(x => x.id === id) || {};
    const w   = parseInt(document.getElementById('zp_w').value) || 720;
    const now = new Date();
    const of  = now.toLocaleDateString('ru');
    let exp   = '—';
    if (m.sh) {
      const d = new Date(now.getTime() + parseInt(m.sh) * 3600000);
      exp = d.toLocaleDateString('ru') + ' ' + d.toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit'});
    }
    const emp   = S.ses?.name || '—';
    const org   = S.sett.orgSh || 'ВЛАВАШЕ ФУД';
    const allgn = m.all && m.all !== '—' ? m.all : '';
    const yAllg = allgn ? 230 : 200;

    const zpl = [
      '^XA',
      '^CI28',
      `^FO20,20^A0N,40,40^FD${(m.name||'').substring(0,28)}^FS`,
      `^FO20,70^GB${w-40},2,2^FS`,
      `^FO20,82^A0N,22,22^FDВскрыт: ${of}^FS`,
      `^FO20,112^A0N,22,22^FDГоден до: ${exp}^FS`,
      `^FO20,142^A0N,22,22^FDХранение: ${m.tmp||'—'}^FS`,
      `^FO20,172^A0N,22,22^FDСотрудник: ${emp}^FS`,
      `^FO20,202^A0N,22,22^FDПартия: ${m.lot||'—'}^FS`,
      allgn ? `^FO20,232^A0N,24,24^FR^FDАЛЛЕРГЕНЫ: ${allgn}^FS` : '',
      `^FO${w-125},22^BQN,2,4^FDHM,N:${(m.name||'').substring(0,18)}|E:${exp}^FS`,
      `^FO20,${yAllg+30}^GB${w-40},2,2^FS`,
      `^FO20,${yAllg+42}^A0N,18,18^FD${org} | ХАССП^FS`,
      '^XZ'
    ].filter(Boolean).join('\n');

    document.getElementById('zpl_out').value = zpl;
  },

  copy() {
    const ta = document.getElementById('zpl_out');
    if (!ta.value) { UI.toast('Сначала нажмите Генерировать', 'err'); return; }
    navigator.clipboard?.writeText(ta.value)
      .then(() => UI.toast('📋 ZPL скопирован'))
      .catch(() => { ta.select(); document.execCommand('copy'); UI.toast('📋 Скопировано'); });
  },

  download() {
    const val = document.getElementById('zpl_out').value;
    if (!val) { UI.toast('Сначала нажмите Генерировать', 'err'); return; }
    UI.download(val, `label_${new Date().toISOString().slice(0,10)}.zpl`, 'text/plain');
    UI.toast('💾 ZPL файл скачан');
  }
};

/* ============================================================
   HELP MODAL
   ============================================================ */
function initHelpModal() {
  document.getElementById('modals-container').insertAdjacentHTML('beforeend', `
    <div class="modal" id="modal-help">
      <div class="mbox msm">
        <div class="mh"><h3>⌨️ Горячие клавиши</h3><button class="mc" onclick="UI.closeModal('modal-help')">✕</button></div>
        <div class="mb" style="font-size:12px;line-height:2">
          <div style="display:grid;grid-template-columns:80px 1fr;gap:3px 12px">
            <code class="mono" style="color:var(--accent)">1 – 0</code><span>Переход по разделам навигации</span>
            <code class="mono" style="color:var(--accent)">P</code><span>Печать (на странице Быстрая печать)</span>
            <code class="mono" style="color:var(--accent)">Esc</code><span>Закрыть модальное окно / Дровер</span>
            <code class="mono" style="color:var(--accent)">⇆ (кнопка)</code><span>Развернуть / Свернуть меню</span>
          </div>
          <hr style="border-color:var(--border);margin:12px 0">
          <div style="font-size:11px;color:var(--muted2);line-height:1.8">
            <b>Плейсхолдеры шаблонов:</b><br>
            <span class="mono" style="color:var(--accent)">{name}</span> {openDate} {expiry} {temp}<br>
            {openedBy} {batch} {allergens} {haccpNote}
          </div>
          <hr style="border-color:var(--border);margin:12px 0">
          <div style="font-size:11px;color:var(--muted2)">
            <b>Экспорт шаблона для ИИ:</b><br>
            Конструктор → 🧠 → ИИ → вставить в ChatGPT / Claude.ai → 📥 ← ИИ
          </div>
        </div>
      </div>
    </div>`);
}

/* ============================================================
   APP ENTRY POINT
   ============================================================ */
(function init() {
  initState();
  initHelpModal();
  // Login screen is visible by default (header/nav/app hidden via CSS display:none)
  // AUTH.login() called on button click
})();
