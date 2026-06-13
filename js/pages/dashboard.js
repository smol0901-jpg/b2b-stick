/* === dashboard.js === */
const DASH = {
  _recentAct: [],

  render() {
    const pg = document.getElementById('pg-dash');
    pg.innerHTML = `
      <div class="sh">
        <span class="st">🏠 Дашборд</span>
        <span style="font-size:11px;color:var(--muted2)" id="dash-dt">—</span>
        <div class="sa"><button class="btn bp btn-sm" onclick="NAV.go('quick')">⚡ Быстрая печать</button></div>
      </div>
      <div style="overflow-y:auto;flex:1">
        <div class="dgrid" id="dstats"></div>
        <div class="dash-panels">
          <div class="card"><div class="ch"><span class="ct">⏰ Контроль сроков</span><button class="btn bg btn-sm" style="margin-left:auto" onclick="NAV.go('mats')">Все →</button></div><div class="exl" style="max-height:270px" id="dexp"></div></div>
          <div class="card"><div class="ch"><span class="ct">📋 Последние действия</span></div><div style="padding:11px;overflow-y:auto;max-height:270px" id="dact"></div></div>
        </div>
      </div>`;
    this.update();
  },

  async update() {
    const now = Date.now();
    const dtEl = document.getElementById('dash-dt');
    if (dtEl) dtEl.textContent = new Date().toLocaleDateString('ru', {weekday:'long', year:'numeric', month:'long', day:'numeric'});

    const am  = S.mats.filter(m => m.st !== 'arc').length;
    const ae  = S.emps.filter(e => e.st !== 'arc').length + 1; // +1 = текущий пользователь
    const expW = S.mats.filter(m => m.exp && m.st !== 'arc' && (new Date(m.exp) - now) / 86400000 <= 3 && (new Date(m.exp) - now) >= 0).length;
    const expC = S.mats.filter(m => m.exp && m.st !== 'arc' && (new Date(m.exp) - now) < 0).length;

    const statTiles = [
      ['Сырьё',          am,              '🧪', 'var(--accent)'],
      ['Сотрудники',     ae,              '👥', 'var(--success)'],
      ['Истекают (3д)',  expW,            '⏰', expW > 0 ? 'var(--warn)' : 'var(--muted2)'],
      ['Просрочено',     expC,            '⚠️', expC > 0 ? 'var(--danger)' : 'var(--muted2)'],
      ['Форматов',       S.tmpls.length,  '📐', 'var(--purple)']
    ];
    // Activity-log counter only meaningful for admin/SA (staff see only own entries via RLS)
    if (!S.isStaff()) statTiles.push(['Операций в логе', this._recentAct.length, '📋', 'var(--gold)']);

    const stats = document.getElementById('dstats');
    if (stats) stats.innerHTML = statTiles
      .map(([l, v, i, c]) => `<div class="sc"><div class="sv" style="color:${c}">${v}</div><div class="sl">${l}</div><div class="si">${i}</div></div>`).join('');

    // Expiry list
    const exList = S.mats.filter(m => m.exp && m.st !== 'arc')
      .map(m => ({...m, days: Math.ceil((new Date(m.exp) - now) / 86400000)}))
      .sort((a, b) => a.days - b.days).slice(0, 8);
    const dexp = document.getElementById('dexp');
    if (dexp) dexp.innerHTML = exList.length
      ? exList.map(m => {
          const c = m.days < 0 ? 'cr' : m.days <= 3 ? 'w' : 'ok';
          return `<div class="exi"><div class="exd ${c}">${m.days < 0 ? '!' : m.days}</div>
            <div style="flex:1"><div style="font-size:12px;font-weight:600">${CATI[m.cat]||'📦'} ${m.name}</div>
            <div style="font-size:10px;color:var(--muted2)">${m.exp} · ${m.tmp||'—'}</div></div></div>`;
        }).join('')
      : '<div style="padding:18px;text-align:center;font-size:11px;color:var(--muted2)">Нет данных</div>';

    // Activity — pulled from Supabase (RLS: staff sees only own entries)
    const dact = document.getElementById('dact');
    if (dact) dact.innerHTML = '<div style="padding:18px;text-align:center;font-size:11px;color:var(--muted2)">Загрузка...</div>';
    try {
      this._recentAct = (typeof SB !== 'undefined' && SB.ready) ? await SB.getActivity(14) : [];
    } catch(e) { this._recentAct = []; }

    if (dact) dact.innerHTML = this._recentAct.length
      ? this._recentAct.map(a => {
          const d = new Date(a.created_at);
          return `<div style="display:flex;gap:7px;padding:4px 0;border-bottom:1px solid var(--border);font-size:11px">
            <span class="c-muted mono" style="flex-shrink:0">${d.toLocaleDateString('ru',{day:'2-digit',month:'2-digit'})} ${d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</span>
            <span style="flex:1">${a.action}</span><span class="c-muted">${a.user_name||'—'}</span></div>`;
        }).join('')
      : '<div style="padding:18px;text-align:center;font-size:11px;color:var(--muted2)">Нет записей</div>';

    NAV.updateBadge('mats', expW + expC);
  }
};
