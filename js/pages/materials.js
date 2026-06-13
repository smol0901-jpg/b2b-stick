/* === materials.js === */
const MATS = {
  render() {
    const pg = document.getElementById('pg-mats');
    pg.innerHTML = `
      <div class="sh"><span class="st">🧪 База сырья</span>
        <div class="sa">
          <div class="srch"><span>🔍</span><input type="text" id="ms" placeholder="Поиск..." oninput="MATS.render()"></div>
          <select id="mf" class="sel-inline" onchange="MATS.render()">
            <option value="all">Все</option><option value="active">Активные</option>
            <option value="exp">Истекают</option><option value="arc">Архив</option>
          </select>
          <button class="btn bp btn-sm" onclick="MATS.openModal()">+ Добавить</button>
        </div>
      </div>
      <div style="overflow-y:auto;flex:1" id="mlist"></div>
      ${this._modal()}`;
    this._renderList();
  },

  _renderList() {
    const q   = (document.getElementById('ms')?.value || '').toLowerCase();
    const f   = document.getElementById('mf')?.value || 'all';
    const now = Date.now();
    const list = S.mats.filter(m => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (f === 'active' && m.st === 'arc') return false;
      if (f === 'arc' && m.st !== 'arc')    return false;
      if (f === 'exp') {
        if (!m.exp || m.st === 'arc') return false;
        const d = (new Date(m.exp) - now) / 86400000;
        return d >= 0 && d <= 7;
      }
      return true;
    });
    const el = document.getElementById('mlist');
    if (!el) return;
    if (!list.length) { el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted2);font-size:12px">Нет записей</div>'; return; }

    el.innerHTML = `<table class="tbl"><thead><tr>
      <th></th><th>Наименование</th><th>Хранение</th><th>Срок вскр.</th>
      <th>Годен до</th><th>Аллергены</th><th>Партия</th><th>Статус</th>
      ${S.canEdit() ? '<th>Действия</th>' : ''}
    </tr></thead><tbody>${list.map(m => {
      const d   = m.exp ? Math.ceil((new Date(m.exp) - now) / 86400000) : null;
      const eb  = d === null ? ''
        : d < 0  ? `<span class="bdg b-no">ПРОСРОЧЕНО</span>`
        : d <= 3 ? `<span class="bdg b-w">${d}д.</span>`
                 : `<span class="bdg b-ok">${d}д.</span>`;
      const arc = m.st === 'arc';
      return `<tr class="${arc ? 'arc' : ''}">
        <td style="font-size:18px;text-align:center">${CATI[m.cat]||'📦'}</td>
        <td style="cursor:pointer" onclick="UI.openDrw(${m.id})">
          <b>${m.name}</b>${m.sup ? `<div style="font-size:10px;color:var(--muted2)">${m.sup}</div>` : ''}
        </td>
        <td style="font-size:11px;font-family:var(--ff)">${m.tmp||'—'}</td>
        <td style="font-size:11px">${m.sh ? m.sh + 'ч.' : '—'}</td>
        <td>${eb || `<span style="font-size:11px;color:var(--muted2)">${m.exp||'—'}</span>`}</td>
        <td style="font-size:11px;color:var(--warn)">${m.all||'—'}</td>
        <td style="font-size:11px;font-family:var(--ff)">${m.lot||'—'}</td>
        <td>${arc ? '<span class="bdg b-arc">АРХИВ</span>' : '<span class="bdg b-ok">АКТИВ</span>'}</td>
        ${S.canEdit() ? `<td><div class="fx gap4">
          <button class="btn bg btn-sm" onclick="MATS.openModal(${m.id})">✏️</button>
          <button class="btn bg btn-sm" onclick="MATS.toggle(${m.id})">${arc ? '♻️' : '📦'}</button>
          <button class="btn bg btn-sm" onclick="QUICK.printMat(${m.id})">🖨️</button>
          ${S.isSA() ? `<button class="btn bg btn-sm" onclick="MATS.del(${m.id})">🗑️</button>` : ''}
        </div></td>` : ''}
      </tr>`;
    }).join('')}</tbody></table>`;
  },

  _modal() {
    return `
    <div class="modal" id="modal-mat">
      <div class="mbox">
        <div class="mh"><h3 id="matmt">➕ Новое сырьё</h3><button class="mc" onclick="UI.closeModal('modal-mat')">✕</button></div>
        <div class="mb">
          <div class="g2">
            <div class="fg" style="grid-column:span 2"><label>Наименование *</label><input type="text" id="m_name" placeholder="Сливки 33%"></div>
            <div class="fg"><label>Категория</label><select id="m_cat"><option value="dairy">Молочное</option><option value="meat">Мясное</option><option value="fish">Рыба</option><option value="veg">Овощи/Фрукты</option><option value="dry">Сухие</option><option value="sauce">Соусы</option><option value="other">Прочее</option></select></div>
            <div class="fg"><label>Хранение</label><input type="text" id="m_tmp" placeholder="+2...+6°C"></div>
            <div class="fg"><label>Срок после вскрытия (ч.)</label><input type="number" id="m_sh" placeholder="48" min="1"></div>
            <div class="fg"><label>Годен до (дата)</label><input type="date" id="m_exp"></div>
            <div class="fg"><label>Аллергены</label><input type="text" id="m_all" placeholder="Молоко, глютен"></div>
            <div class="fg"><label>Партия / Лот</label><input type="text" id="m_lot" placeholder="LOT-001"></div>
            <div class="fg" style="grid-column:span 2"><label>ХАССП примечание</label><input type="text" id="m_hac" placeholder="Хранить закрытым..."></div>
            <div class="fg"><label>Поставщик</label><input type="text" id="m_sup" placeholder="ООО Поставщик"></div>
            <div class="fg"><label>Ед. измерения</label><select id="m_un"><option>кг</option><option>л</option><option>шт</option><option>уп</option><option>г</option><option>мл</option></select></div>
          </div>
        </div>
        <div class="mf"><button class="btn bg" onclick="UI.closeModal('modal-mat')">Отмена</button><button class="btn bp" onclick="MATS.save()">💾 Сохранить</button></div>
      </div>
    </div>`;
  },

  openModal(id) {
    S.eMat = id || null;
    document.getElementById('matmt').textContent = id ? '✏️ Редактировать' : '➕ Новое сырьё';
    const m = id ? S.mats.find(x => x.id === id) : {};
    ['name','cat','tmp','sh','exp','all','lot','hac','sup','un'].forEach(k => {
      const el = document.getElementById('m_' + k);
      if (el) el.value = m[k] || '';
    });
    UI.openModal('modal-mat');
  },

  async save() {
    const nm = document.getElementById('m_name').value.trim();
    if (!nm) { UI.toast('Введите название', 'err'); return; }
    const fields = {
      name:        nm,
      category:    document.getElementById('m_cat').value,
      temperature: document.getElementById('m_tmp').value,
      shelf_hours: parseInt(document.getElementById('m_sh').value) || null,
      expiry_date: document.getElementById('m_exp').value || null,
      allergens:   document.getElementById('m_all').value,
      lot:         document.getElementById('m_lot').value,
      haccp_note:  document.getElementById('m_hac').value,
      supplier:    document.getElementById('m_sup').value,
      unit:        document.getElementById('m_un').value
    };
    try {
      if (S.eMat) {
        await SB.update('materials', S.eMat, { ...fields, updated_by: S.ses?.id });
        UI.toast('✅ Сырьё обновлено');
        logAct('Обновлено сырьё', S.ses?.name, nm, 'material', S.eMat);
      } else {
        const row = await SB.insert('materials', { ...fields, status:'active', created_by: S.ses?.id, org_id: S.ses?.orgId || 'vlavashe' });
        UI.toast('✅ Сырьё добавлено');
        logAct('Добавлено сырьё', S.ses?.name, nm, 'material', row.id);
      }
      UI.closeModal('modal-mat');
      // Realtime subscription will refresh S.mats and re-render automatically;
      // also refresh immediately for instant feedback
      await this._reload();
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async toggle(id) {
    const m = S.mats.find(x => x.id === id);
    const newStatus = m.st === 'arc' ? 'active' : 'arc';
    try {
      await SB.update('materials', id, { status: newStatus, updated_by: S.ses?.id });
      logAct(newStatus === 'arc' ? 'Архивировано сырьё' : 'Восстановлено сырьё', S.ses?.name, m.name, 'material', id);
      UI.toast(newStatus === 'active' ? '♻️ Восстановлено' : '📦 Архивировано');
      await this._reload();
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async del(id) {
    if (!UI.confirm('Удалить навсегда?')) return;
    const m = S.mats.find(x => x.id === id);
    try {
      await SB.remove('materials', id);
      logAct('Удалено сырьё', S.ses?.name, m?.name||'', 'material', id);
      UI.toast('🗑️ Удалено');
      await this._reload();
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  /** Re-fetch materials from Supabase and re-render (used after writes) */
  async _reload() {
    try {
      const rows = await SB.getAll('materials');
      S.mats = (rows||[]).map(m => ({
        id:m.id, name:m.name, cat:m.category, tmp:m.temperature,
        sh:m.shelf_hours, exp:m.expiry_date, all:m.allergens,
        lot:m.lot, hac:m.haccp_note, sup:m.supplier, un:m.unit||'кг',
        st:m.status||'active', crd:new Date(m.created_at).getTime()
      }));
    } catch(e) { console.error('Materials reload error:', e); }
    this._renderList();
  }
};

