/* === departments.js — Цеха / Отделы (admin/SA only edit) === */
const DEPTS = {
  _list: [],

  async load() {
    try { this._list = await SB.getDepartments(); }
    catch(e) { console.error('Depts load error:', e); this._list = []; }
  },

  render() {
    const pg = document.getElementById('pg-depts');
    if (!pg) return;
    pg.innerHTML = `
      <div class="sh"><span class="st">🏭 Цеха и отделы</span>
        <div class="sa">
          ${S.canEdit() ? `<button class="btn bp btn-sm" onclick="DEPTS.openModal()">+ Добавить</button>` : ''}
        </div>
      </div>
      <div style="overflow-y:auto;flex:1;padding:14px" id="depts-list"></div>
      ${this._modal()}`;
    this.load().then(() => this.renderList());
  },

  renderList() {
    const el = document.getElementById('depts-list');
    if (!el) return;
    if (!this._list.length) {
      el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted2);font-size:12px">Нет цехов</div>';
      return;
    }
    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:11px">
      ${this._list.map(d => `
        <div class="card">
          <div class="cb">
            <div class="fx aic gap8 mb8">
              <span style="font-size:20px">🏭</span>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:700">${d.name}</div>
                <div style="font-size:10px;color:var(--muted2);font-family:var(--ff)">${d.code||'—'}</div>
              </div>
              <span class="bdg ${d.active?'b-ok':'b-arc'}">${d.active?'АКТИВЕН':'АРХИВ'}</span>
            </div>
            ${d.description ? `<div style="font-size:11px;color:var(--muted2);margin-bottom:8px">${d.description}</div>` : ''}
            ${S.canEdit() ? `<div class="fx gap4">
              <button class="btn bg btn-sm" onclick="DEPTS.openModal(${d.id})">✏️ Ред.</button>
              <button class="btn bg btn-sm" onclick="DEPTS.toggle(${d.id})">${d.active?'📦':'♻️'}</button>
              ${S.isSA() ? `<button class="btn bg btn-sm" onclick="DEPTS.del(${d.id})">🗑️</button>` : ''}
            </div>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
  },

  _modal() {
    return `
    <div class="modal" id="modal-dept">
      <div class="mbox msm">
        <div class="mh"><h3 id="deptmt">➕ Новый цех</h3><button class="mc" onclick="UI.closeModal('modal-dept')">✕</button></div>
        <div class="mb">
          <div class="fg mb8"><label>Название *</label><input type="text" id="d_name" placeholder="Горячий цех"></div>
          <div class="fg mb8"><label>Код</label><input type="text" id="d_code" placeholder="HOT"></div>
          <div class="fg"><label>Описание</label><textarea id="d_desc" rows="2" placeholder="Приготовление горячих блюд"></textarea></div>
        </div>
        <div class="mf"><button class="btn bg" onclick="UI.closeModal('modal-dept')">Отмена</button><button class="btn bp" onclick="DEPTS.save()">💾 Сохранить</button></div>
      </div>
    </div>`;
  },

  openModal(id) {
    if (!S.canEdit()) { UI.toast('Нет прав', 'err'); return; }
    this._editId = id || null;
    document.getElementById('deptmt').textContent = id ? '✏️ Редактировать' : '➕ Новый цех';
    const d = id ? this._list.find(x => x.id === id) : {};
    document.getElementById('d_name').value = d?.name || '';
    document.getElementById('d_code').value = d?.code || '';
    document.getElementById('d_desc').value = d?.description || '';
    UI.openModal('modal-dept');
  },

  async save() {
    const name = document.getElementById('d_name').value.trim();
    if (!name) { UI.toast('Введите название', 'err'); return; }
    const fields = {
      name,
      code: document.getElementById('d_code').value.trim(),
      description: document.getElementById('d_desc').value.trim()
    };
    try {
      if (this._editId) {
        await SB.updateDepartment(this._editId, fields);
        UI.toast('✅ Цех обновлён');
      } else {
        await SB.addDepartment({ ...fields, active: true });
        UI.toast('✅ Цех добавлен');
        await SB.logActivity('Добавлен цех', S.ses?.id, name, 'department');
      }
      await this.load(); this.renderList();
      UI.closeModal('modal-dept');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async toggle(id) {
    const d = this._list.find(x => x.id === id);
    try {
      await SB.updateDepartment(id, { active: !d.active });
      await this.load(); this.renderList();
      UI.toast(d.active ? '📦 Архивирован' : '♻️ Восстановлен');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async del(id) {
    if (!UI.confirm('Удалить цех?')) return;
    try {
      await SB.removeDepartment(id);
      await this.load(); this.renderList();
      UI.toast('🗑️ Удалён');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  }
};


/* === journals.js — ХАССП журналы (все пишут, admin/SA управляют) === */
const JOURNALS = {
  _journals: [],
  _entries: {},
  _activeId: null,

  async load() {
    try { this._journals = await SB.getJournals(); }
    catch(e) { console.error('Journals load error:', e); this._journals = []; }
  },

  render() {
    const pg = document.getElementById('pg-jour');
    if (!pg) return;
    pg.innerHTML = `
      <div class="sh"><span class="st">📔 Журналы ХАССП</span>
        <div class="sa">
          <select id="jour-sel" class="sel-inline" onchange="JOURNALS.selectJournal(this.value)"></select>
        </div>
      </div>
      <div style="overflow-y:auto;flex:1;padding:14px" id="jour-content"></div>`;
    this.load().then(() => {
      const sel = document.getElementById('jour-sel');
      sel.innerHTML = this._journals.map(j => `<option value="${j.id}">${j.title}</option>`).join('');
      if (this._journals.length) this.selectJournal(this._journals[0].id);
    });
  },

  async selectJournal(id) {
    id = parseInt(id);
    this._activeId = id;
    const j = this._journals.find(x => x.id === id);
    if (!j) return;
    const entries = await SB.getJournalEntries(id);
    this._entries[id] = entries;

    const fields = j.fields_schema || [];
    const c = document.getElementById('jour-content');
    c.innerHTML = `
      <div class="card mb12">
        <div class="ch"><span class="ct c-accent">➕ Новая запись — ${j.title}</span></div>
        <div class="cb">
          <div class="g2" id="jour-form">
            ${fields.map(f => this._renderField(f)).join('')}
          </div>
          <button class="btn bp w100 mt12" onclick="JOURNALS.submit()">💾 Сохранить запись</button>
        </div>
      </div>
      <div class="card">
        <div class="ch"><span class="ct">📋 История записей (${entries.length})</span>
          ${S.isSA() ? `<button class="btn bg btn-sm" style="margin-left:auto" onclick="JOURNALS.clearAll()">🗑️ Очистить</button>` : ''}
        </div>
        <div style="overflow-x:auto">
          <table class="tbl"><thead><tr>
            <th>Дата</th><th>Подписал</th>
            ${fields.map(f => `<th>${f.label}</th>`).join('')}
            ${S.isSA() ? '<th></th>' : ''}
          </tr></thead>
          <tbody>${entries.map(e => `<tr>
            <td class="mono" style="font-size:11px">${new Date(e.created_at).toLocaleString('ru',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
            <td style="font-size:11px;color:var(--accent)">${e.signed_name||'—'}</td>
            ${fields.map(f => `<td style="font-size:11px">${this._fmtVal(e.data?.[f.name], f)}</td>`).join('')}
            ${S.isSA() ? `<td><button class="btn bg btn-sm" onclick="JOURNALS.delEntry(${e.id})">🗑️</button></td>` : ''}
          </tr>`).join('') || `<tr><td colspan="${2+fields.length+(S.isSA()?1:0)}" style="text-align:center;color:var(--muted2);padding:20px">Нет записей</td></tr>`}
          </tbody></table>
        </div>
      </div>`;
  },

  _renderField(f) {
    const id = 'jf_' + f.name;
    if (f.type === 'boolean') {
      return `<div class="fg"><label>${f.label}</label>
        <select id="${id}"><option value="true">Да</option><option value="false">Нет</option></select></div>`;
    }
    if (f.type === 'select') {
      return `<div class="fg"><label>${f.label}</label>
        <select id="${id}">${(f.options||[]).map(o => `<option value="${o}">${o}</option>`).join('')}</select></div>`;
    }
    if (f.type === 'number') {
      return `<div class="fg"><label>${f.label}${f.required?' *':''}</label><input type="number" id="${id}" step="0.1"></div>`;
    }
    return `<div class="fg"><label>${f.label}${f.required?' *':''}</label><input type="text" id="${id}"></div>`;
  },

  _fmtVal(v, f) {
    if (v === null || v === undefined || v === '') return '—';
    if (f.type === 'boolean') return v === true || v === 'true' ? '✅ Да' : '❌ Нет';
    return String(v);
  },

  async submit() {
    const j = this._journals.find(x => x.id === this._activeId);
    if (!j) return;
    const fields = j.fields_schema || [];
    const data = {};
    for (const f of fields) {
      const el = document.getElementById('jf_' + f.name);
      if (!el) continue;
      let val = el.value;
      if (f.type === 'boolean') val = (val === 'true');
      if (f.type === 'number')  val = parseFloat(val);
      if (f.required && (val === '' || val === null || (typeof val === 'number' && isNaN(val)))) {
        UI.toast(`Заполните: ${f.label}`, 'err'); return;
      }
      data[f.name] = val;
    }
    try {
      await SB.addJournalEntry(j.id, data);
      await SB.logActivity('Запись в журнал', S.ses?.id, j.title, 'journal', j.id);
      UI.toast('✅ Запись сохранена');
      this.selectJournal(j.id);
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async delEntry(id) {
    if (!UI.confirm('Удалить запись?')) return;
    try {
      await SB.removeJournalEntry(id);
      this.selectJournal(this._activeId);
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async clearAll() {
    if (!S.isSA()) return;
    if (!UI.confirm('Очистить все записи журнала? Действие нельзя отменить.')) return;
    const entries = this._entries[this._activeId] || [];
    try {
      for (const e of entries) await SB.removeJournalEntry(e.id);
      this.selectJournal(this._activeId);
      UI.toast('🗑️ Журнал очищен');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  }
};
