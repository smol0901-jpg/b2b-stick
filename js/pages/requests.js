/* === requests.js — Material requests from staff (free-input prints) === */
const REQS = {
  async render() {
    const pg = document.getElementById('pg-reqs');
    if (!pg) return;
    pg.innerHTML = `
      <div class="sh">
        <span class="st">⏳ Заявки на сырьё</span>
        <div class="sa">
          <span style="font-size:10px;font-family:var(--ff);color:var(--muted2)">
            Названия, которые ввели сотрудники вручную
          </span>
          <button class="btn bg btn-sm" onclick="REQS.refresh()">🔄</button>
        </div>
      </div>
      <div style="overflow-y:auto;flex:1" id="reqs-list">
        <div style="padding:40px;text-align:center;color:var(--muted2);font-size:12px">Загрузка...</div>
      </div>
      ${this._modal()}`;

    await this.load();
  },

  _modal() {
    return `
    <div class="modal" id="modal-newmat-req">
      <div class="mbox">
        <div class="mh"><h3 id="nmrmt">➕ Создать карточку сырья</h3>
          <button class="mc" onclick="UI.closeModal('modal-newmat-req')">✕</button></div>
        <div class="mb">
          <div style="font-size:11px;color:var(--accent);margin-bottom:10px;padding:8px;background:rgba(0,212,255,.06);border-radius:4px">
            📨 Сотрудник <b id="nmr_who"></b> ввёл это название вручную при печати этикетки.
          </div>
          <div class="g2">
            <div class="fg" style="grid-column:span 2"><label>Название *</label>
              <input type="text" id="nmr_name" placeholder="Соус майонез"></div>
            <div class="fg"><label>Категория</label>
              <select id="nmr_cat">
                <option value="dairy">🥛 Молочное</option>
                <option value="meat">🥩 Мясное</option>
                <option value="fish">🐟 Рыба</option>
                <option value="veg">🥦 Овощи/Фрукты</option>
                <option value="dry">🌾 Сухие</option>
                <option value="sauce">🫙 Соусы</option>
                <option value="other" selected>📦 Прочее</option>
              </select></div>
            <div class="fg"><label>Ед. изм.</label>
              <select id="nmr_unit">
                <option value="кг">кг</option><option value="л">л</option>
                <option value="шт">шт</option><option value="уп">уп</option>
                <option value="г">г</option><option value="мл">мл</option>
              </select></div>
            <div class="fg"><label>Температура хранения</label>
              <input type="text" id="nmr_tmp" placeholder="+2…+6°C"></div>
            <div class="fg"><label>Срок после вскрытия (ч)</label>
              <input type="number" id="nmr_sh" min="0" placeholder="72"></div>
            <div class="fg" style="grid-column:span 2"><label>Аллергены</label>
              <input type="text" id="nmr_all" placeholder="молоко, яйцо, глютен"></div>
            <div class="fg"><label>Партия по умолчанию</label>
              <input type="text" id="nmr_lot" placeholder="LOT-001"></div>
            <div class="fg"><label>Поставщик</label>
              <input type="text" id="nmr_sup" placeholder="ООО .."></div>
          </div>
        </div>
        <div class="mf">
          <button class="btn bg" onclick="UI.closeModal('modal-newmat-req')">Отмена</button>
          <button class="btn bp" onclick="REQS.createFromReq()">💾 Создать карточку</button>
        </div>
      </div>
    </div>`;
  },

  async load() {
    try {
      // Берём все заявки (где material_id is null И is_request=true) из print_queue
      const { data, error } = await _sb
        .from('print_queue')
        .select('*')
        .eq('is_request', true)
        .is('material_id', null)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      this._items = data || [];
      this._renderList();
      // Бейдж в nav
      const nb = document.getElementById('nb-reqs');
      if (nb) {
        const pending = this._items.filter(i => i.status !== 'done' && i.status !== 'rejected').length;
        if (pending > 0) { nb.textContent = pending; nb.classList.remove('hidden'); }
        else nb.classList.add('hidden');
      }
    } catch(e) {
      console.error('Requests load error:', e);
      const el = document.getElementById('reqs-list');
      if (el) el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--danger);font-size:12px">❌ ${e.message}</div>`;
    }
  },

  refresh() { this.load(); },

  _renderList() {
    const el = document.getElementById('reqs-list');
    if (!el) return;
    if (!this._items.length) {
      el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted2);font-size:12px">Нет заявок 🎉</div>';
      return;
    }
    // Группируем по названию (одно название = одна заявка)
    const groups = {};
    this._items.forEach(it => {
      const k = (it.raw_name || '').toLowerCase().trim();
      if (!groups[k]) groups[k] = { name: it.raw_name, items: [] };
      groups[k].items.push(it);
    });

    el.innerHTML = Object.values(groups).map(g => {
      const last = g.items[0];
      const cnt  = g.items.length;
      const who  = last.employee_name || '—';
      const when = new Date(last.created_at || last.opened_at || Date.now()).toLocaleString('ru', {
        day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'
      });
      return `<div class="card" style="margin-bottom:10px;padding:12px">
        <div style="display:flex;gap:10px;align-items:center">
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700">📝 ${g.name}</div>
            <div style="font-size:10px;color:var(--muted2);margin-top:3px">
              ${cnt > 1 ? `<b style="color:var(--accent)">×${cnt}</b> &nbsp;` : ''}
              от <b>${who}</b> &nbsp;·&nbsp; ${when}
              ${last.batch ? `&nbsp;·&nbsp; партия: <span class="mono">${last.batch}</span>` : ''}
            </div>
          </div>
          <button class="btn bp btn-sm" onclick="REQS.openCreateDlg('${g.name.replace(/'/g,"\\'")}')">+ Создать карточку</button>
          <button class="btn bg btn-sm" onclick="REQS.dismissGroup('${g.name.replace(/'/g,"\\'")}')" title="Скрыть заявку">✕</button>
        </div>
      </div>`;
    }).join('');
  },

  openCreateDlg(name) {
    document.getElementById('nmr_name').value = name || '';
    document.getElementById('nmr_cat').value  = 'other';
    document.getElementById('nmr_unit').value = 'кг';
    document.getElementById('nmr_tmp').value  = '';
    document.getElementById('nmr_sh').value   = '';
    document.getElementById('nmr_all').value  = '';
    document.getElementById('nmr_lot').value  = '';
    document.getElementById('nmr_sup').value  = '';
    document.getElementById('nmr_who').textContent = '';
    UI.openModal('modal-newmat-req');
  },

  async createFromReq() {
    const name = document.getElementById('nmr_name').value.trim();
    if (!name) { UI.toast('Введите название', 'err'); return; }
    try {
      // 1) Создаём карточку сырья
      const row = await SB.insert('materials', {
        name,
        category:      document.getElementById('nmr_cat').value,
        unit:          document.getElementById('nmr_unit').value,
        storage_temp:  document.getElementById('nmr_tmp').value || null,
        shelf_hours:   parseInt(document.getElementById('nmr_sh').value) || 0,
        allergens:     document.getElementById('nmr_all').value || '',
        lot:           document.getElementById('nmr_lot').value || '',
        supplier:      document.getElementById('nmr_sup').value || '',
        status:        'active',
        org_id:        S.ses?.orgId || 'vlavashe',
        created_by:    S.ses?.id,
        notes:         'создано из заявки сотрудника'
      });
      // 2) Помечаем все заявки с этим названием как обработанные
      const { error: upErr } = await _sb
        .from('print_queue')
        .update({ status: 'done', material_id: row.id, raw_name: null })
        .eq('is_request', true)
        .ilike('raw_name', name);
      if (upErr) console.warn('queue update warning:', upErr);

      // 3) Локально добавляем в S.mats
      const mat = {
        id: row.id, name: row.name, cat: row.category, un: row.unit,
        tmp: row.storage_temp, sh: row.shelf_hours, exp: row.expiry_date,
        all: row.allergens || '', hac: '', lot: row.lot || '',
        st: 'act', supplier: row.supplier || '', dept: '', av: null
      };
      S.mats.push(mat);

      UI.toast('✅ Карточка создана: ' + name, 'ok');
      UI.closeModal('modal-newmat-req');
      await this.load();
    } catch(e) {
      UI.toast('❌ ' + e.message, 'err');
    }
  },

  async dismissGroup(name) {
    if (!confirm(`Скрыть все заявки с названием "${name}"?`)) return;
    try {
      const { error } = await _sb
        .from('print_queue')
        .update({ status: 'rejected' })
        .eq('is_request', true)
        .ilike('raw_name', name);
      if (error) throw error;
      await this.load();
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  }
};
