/* === print_queue.js — Print Queue page (Supabase realtime) === */
const QUEUE = {
  _channel: null,

  async render() {
    const pg = document.getElementById('pg-queue');
    if (!pg) return;
    pg.innerHTML = `
      <div class="sh">
        <span class="st">🖨️ Очередь печати</span>
        <div class="sa">
          <span id="q-live" style="font-size:10px;font-family:var(--ff);color:var(--success);display:flex;align-items:center;gap:5px">
            <span style="width:7px;height:7px;border-radius:50%;background:var(--success);animation:pdot 2s infinite;display:inline-block"></span>LIVE
          </span>
          <select id="qf" class="sel-inline" onchange="QUEUE.renderList()">
            <option value="all">Все</option>
            <option value="pending">Ожидают</option>
            <option value="approved">Одобрены</option>
            <option value="done">Выполнены</option>
            <option value="rejected">Отклонены</option>
          </select>
        </div>
      </div>
      <div style="overflow-y:auto;flex:1" id="qlist">
        <div style="padding:40px;text-align:center;color:var(--muted2);font-size:12px">Загрузка...</div>
      </div>`;

    await this.load();
    this.subscribeRealtime();
  },

  safeRender() {
    this.render().catch(e => console.error('Queue render error:', e));
  },

  async load() {
    try {
      const jobs = await SB.getPrintQueue();
      this._jobs = jobs;
      this.renderList();
    } catch(e) {
      console.error('Queue load error:', e);
    }
  },

  renderList() {
    const el  = document.getElementById('qlist');
    if (!el) return;
    const f   = document.getElementById('qf')?.value || 'all';
    const list = (this._jobs || []).filter(j => f === 'all' || j.status === f);

    if (!list.length) {
      el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted2);font-size:12px">Нет заявок</div>';
      return;
    }

    const STATUS = {
      pending:  {label:'ОЖИДАЕТ', cls:'b-w'},
      approved: {label:'ОДОБРЕНА', cls:'b-ok'},
      printing: {label:'ПЕЧАТЬ', cls:'b-a'},
      done:     {label:'ВЫПОЛНЕНО', cls:'b-m'},
      rejected: {label:'ОТКЛОНЕНО', cls:'b-no'}
    };

    el.innerHTML = `
      <table class="tbl">
        <thead><tr>
          <th>#</th><th>Продукт</th><th>Сотрудник</th><th>Дата откр.</th>
          <th>Копии</th><th>Шаблон</th><th>Статус</th>
          ${S.canEdit() ? '<th>Действия</th>' : ''}
        </tr></thead>
        <tbody>${list.map(j => {
          const st = STATUS[j.status] || STATUS.pending;
          const emp = j.profiles?.name || j.opened_by || '—';
          const dt  = j.open_date ? new Date(j.open_date).toLocaleString('ru', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—';
          return `<tr>
            <td class="mono" style="font-size:11px;color:var(--muted2)">#${j.id}</td>
            <td><b>${j.material_name}</b>${j.batch?`<div style="font-size:10px;color:var(--muted2)">Партия: ${j.batch}</div>`:''}</td>
            <td style="font-size:11px">${emp}</td>
            <td style="font-size:11px;font-family:var(--ff)">${dt}</td>
            <td style="text-align:center;font-weight:700">${j.copies}</td>
            <td style="font-size:11px;color:var(--muted2)">${j.template_id||'—'}</td>
            <td><span class="bdg ${st.cls}">${st.label}</span></td>
            ${S.canEdit() ? `<td>
              <div class="fx gap4">
                ${j.status === 'pending' ? `
                  <button class="btn bs btn-sm" onclick="QUEUE.approve(${j.id})" title="Одобрить и печатать">✅ Печать</button>
                  <button class="btn bd btn-sm" onclick="QUEUE.reject(${j.id})"  title="Отклонить">✕</button>
                ` : ''}
                ${j.status === 'approved' ? `
                  <button class="btn bp btn-sm" onclick="QUEUE.printJob(${j.id})">🖨️ Печатать</button>
                ` : ''}
                ${j.status === 'done' || j.status === 'rejected' ? `
                  <button class="btn bg btn-sm" onclick="QUEUE.archive(${j.id})">🗑️</button>
                ` : ''}
              </div>
            </td>` : ''}
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  },

  async approve(id) {
    try {
      await SB.updatePrintJob(id, { status: 'approved', approved_by: S.ses?.id, updated_at: new Date().toISOString() });
      UI.toast('✅ Заявка одобрена');
      // Auto-print
      this.printJob(id);
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async reject(id) {
    try {
      await SB.updatePrintJob(id, { status: 'rejected', updated_at: new Date().toISOString() });
      UI.toast('Заявка отклонена', 'inf');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async archive(id) {
    try {
      await SB.remove('print_queue', id);
      this._jobs = (this._jobs||[]).filter(j => j.id !== id);
      this.renderList();
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async printJob(queueId) {
    const job  = (this._jobs||[]).find(j => j.id === queueId);
    if (!job) return;
    const mat  = S.mats.find(m => m.id == job.material_id) || { name: job.material_name, tmp:'—', sh:0, all:'', hac:'' };
    const tmpl = S.tmpls.find(t => t.id === job.template_id) || S.tmpls[0];
    if (!tmpl) { UI.toast('Шаблон не найден', 'err'); return; }
    const data = LABEL.matToData(mat, job.open_date, job.opened_by, job.batch);
    LABEL.printBatch([{ data, tmpl, count: job.copies || 1 }], 'portrait');
    await SB.updatePrintJob(queueId, { status: 'done', updated_at: new Date().toISOString() });
    UI.toast('🖨️ Печать запущена');
  },

  subscribeRealtime() {
    // Защита от двойной подписки
    if (this._channel) {
      try { this._channel.unsubscribe(); } catch(_) {}
      this._channel = null;
    }
    try {
      this._channel = SB.subscribe('print_queue', async (payload) => {
        try {
          await this.load();
          if (payload?.eventType === 'INSERT') {
            UI.toast('📥 Новая заявка: ' + (payload.new?.material_name || ''), 'inf');
            try { const ctx = new AudioContext(); const o = ctx.createOscillator(); o.connect(ctx.destination); o.frequency.value=800; o.start(); setTimeout(()=>o.stop(),120); } catch {}
          }
        } catch(e) {
          console.error('Realtime callback error:', e);
        }
      });
    } catch(e) {
      console.warn('Realtime subscribe failed (UI works):', e);
    }
  },

  unsubscribe() {
    if (this._channel) {
      try { this._channel.unsubscribe(); } catch(_) {}
      this._channel = null;
    }
  }
};
