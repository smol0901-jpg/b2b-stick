/* === history.js — История операций (Supabase activity log) === */
const HIST = {
  _list: [],

  render() {
    const pg = document.getElementById('pg-hist');
    pg.innerHTML = `
      <div class="sh"><span class="st">📋 История операций</span>
        <div class="sa">
          <div class="srch"><span>🔍</span><input type="text" id="hs" placeholder="Поиск..." oninput="HIST._renderTable()"></div>
          <select id="hf" class="sel-inline" onchange="HIST._renderTable()">
            <option value="all">Все типы</option>
            <option value="material">Сырьё</option>
            <option value="employee">Сотрудники</option>
            <option value="template">Шаблоны</option>
            <option value="print">Печать</option>
            <option value="journal">Журналы</option>
            <option value="department">Цеха</option>
            <option value="system">Система</option>
          </select>
          <button class="btn bg btn-sm" onclick="HIST.export()">📤 CSV</button>
          ${S.isSA() ? `<button class="btn bg btn-sm" onclick="HIST.openCleanup()">🧹 Очистка</button>` : ''}
        </div>
      </div>
      <div class="hpg" id="histcnt">
        <div style="padding:40px;text-align:center;color:var(--muted2);font-size:12px">Загрузка...</div>
      </div>
      ${this._cleanupModal()}`;
    this.load();
  },

  async load() {
    try {
      this._list = await SB.getActivity(300);
    } catch(e) {
      console.error('Activity load error:', e);
      this._list = [];
    }
    this._renderTable();
  },

  _renderTable() {
    const el = document.getElementById('histcnt');
    if (!el) return;
    const q = (document.getElementById('hs')?.value || '').toLowerCase();
    const tf = document.getElementById('hf')?.value || 'all';

    let list = this._list;
    if (tf !== 'all') list = list.filter(a => (a.entity_type||'system') === tf);
    if (q) list = list.filter(a =>
      (a.action||'').toLowerCase().includes(q) ||
      (a.user_name||'').toLowerCase().includes(q) ||
      (a.detail||'').toLowerCase().includes(q));

    if (!list.length) {
      el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted2);font-size:12px">История пуста</div>';
      return;
    }
    const TYPE_ICON = {material:'🧪', employee:'👥', template:'📐', print:'🖨️', journal:'📔', department:'🏭', system:'⚙️'};
    el.innerHTML = `
      <table class="tbl">
        <thead><tr>
          <th>Дата</th><th>Время</th><th></th><th>Действие</th><th>Пользователь</th><th>Детали</th>
        </tr></thead>
        <tbody>${list.map(a => {
          const d = new Date(a.created_at);
          return `<tr>
            <td class="mono" style="font-size:11px">${d.toLocaleDateString('ru')}</td>
            <td class="mono" style="font-size:11px">${d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</td>
            <td style="font-size:14px;text-align:center">${TYPE_ICON[a.entity_type]||'•'}</td>
            <td style="font-size:12px;font-weight:600">${a.action}</td>
            <td style="font-size:11px;color:var(--accent)">${a.user_name||'—'}</td>
            <td style="font-size:11px;color:var(--muted2)">${a.detail||'—'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  },

  export() {
    const rows = ['\uFEFFДата;Время;Тип;Действие;Пользователь;Детали'];
    this._list.forEach(a => {
      const d = new Date(a.created_at);
      rows.push([
        d.toLocaleDateString('ru'), d.toLocaleTimeString('ru'),
        a.entity_type || 'system', a.action, a.user_name || '', a.detail || ''
      ].join(';'));
    });
    UI.download(rows.join('\n'), `history_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8');
    UI.toast('📤 История экспортирована');
  },

  /* ---- CLEANUP MODAL (Superadmin only) ---- */
  _cleanupModal() {
    if (!S.isSA()) return '';
    return `
    <div class="modal" id="modal-cleanup">
      <div class="mbox msm">
        <div class="mh"><h3>🧹 Очистка данных</h3><button class="mc" onclick="UI.closeModal('modal-cleanup')">✕</button></div>
        <div class="mb" style="display:flex;flex-direction:column;gap:10px">
          <p style="font-size:11px;color:var(--muted2);line-height:1.7">
            Доступно только Суперадмину. Действия необратимы.
          </p>
          <button class="btn bw w100" onclick="HIST.clearLog()">📋 Очистить историю операций</button>
          <button class="btn bw w100" onclick="HIST.clearQueue('done')">🖨️ Очистить выполненные заявки печати</button>
          <button class="btn bw w100" onclick="HIST.clearQueue('rejected')">🖨️ Очистить отклонённые заявки</button>
          <button class="btn bd w100" onclick="HIST.clearQueue(null)">🖨️ Очистить ВСЮ очередь печати</button>
        </div>
        <div class="mf"><button class="btn bg" onclick="UI.closeModal('modal-cleanup')">Закрыть</button></div>
      </div>
    </div>`;
  },

  openCleanup() { UI.openModal('modal-cleanup'); },

  async clearLog() {
    if (!S.isSA()) return;
    if (!UI.confirm('Очистить всю историю операций? Действие нельзя отменить.')) return;
    try {
      await SB.clearActivity();
      await this.load();
      UI.toast('🗑️ История очищена');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async clearQueue(status) {
    if (!S.isSA()) return;
    const label = status === 'done' ? 'выполненные' : status === 'rejected' ? 'отклонённые' : 'ВСЕ';
    if (!UI.confirm(`Очистить ${label} заявки печати? Действие нельзя отменить.`)) return;
    try {
      await SB.clearPrintQueue(status);
      await SB.logActivity('Очистка очереди печати', S.ses?.id, label, 'print');
      UI.toast('🗑️ Очередь очищена');
      if (S.page === 'queue') QUEUE.load();
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  }
};

