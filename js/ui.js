/* === ui.js — toast, modals, drawer, global helpers === */
const UI = {
  _toastTimer: null,

  toast(msg, type = 'ok') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className   = type + ' show';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  },

  openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
  },

  closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
  },

  openDrw(id) {
    const m = S.mats.find(x => x.id === id);
    if (!m) return;
    const now  = Date.now();
    const days = m.exp ? Math.ceil((new Date(m.exp) - now) / 86400000) : null;
    const icon = CATI[m.cat] || '📦';

    document.getElementById('drwt').textContent = icon + ' ' + m.name;

    document.getElementById('drwb').innerHTML = `
      ${days !== null ? `<div style="padding:11px;border-radius:7px;margin-bottom:12px;
        background:${days < 0 ? 'rgba(255,45,85,.1)' : days <= 3 ? 'rgba(255,107,53,.08)' : 'rgba(0,230,118,.06)'};
        border:1px solid ${days < 0 ? 'var(--danger)' : days <= 3 ? 'var(--warn)' : 'var(--success)'}">
        <div style="font-size:24px;font-weight:900;font-family:var(--ff);color:${days < 0 ? 'var(--danger)' : days <= 3 ? 'var(--warn)' : 'var(--success)'}">
          ${days < 0 ? 'ПРОСРОЧЕНО' : days + ' дней'}
        </div>
        <div style="font-size:10px;color:var(--muted2)">до окончания срока</div>
      </div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:12px">
        ${[['Категория',m.cat],['Хранение',m.tmp||'—'],['Срок вскр.',m.sh?m.sh+' ч.':'—'],['Годен до',m.exp||'—'],
           ['Аллергены',m.all||'—'],['Партия',m.lot||'—'],['Поставщик',m.sup||'—'],['Ед.',m.un||'—']]
          .map(([l,v]) => `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:7px">
            <div style="font-size:9px;color:var(--muted2);margin-bottom:2px;text-transform:uppercase">${l}</div>
            <div style="font-size:12px;font-weight:600">${v}</div>
          </div>`).join('')}
      </div>
      ${m.hac ? `<div style="background:rgba(0,212,255,.04);border:1px solid var(--border2);border-radius:4px;padding:9px;font-size:11px"><b>🛡️ ХАССП:</b> ${m.hac}</div>` : ''}
      <div style="font-size:10px;color:var(--muted2);margin-top:10px">
        Добавлено: ${m.crd ? new Date(m.crd).toLocaleDateString('ru') : '—'}
      </div>`;

    document.getElementById('drwa').innerHTML = `
      ${S.canEdit() ? `<button class="btn bg btn-sm" onclick="MATS.openModal(${m.id});UI.closeDrw()">✏️ Ред.</button>` : ''}
      <button class="btn bp btn-sm" onclick="QUICK.printMat(${m.id});UI.closeDrw()">🖨️ Печать</button>
      <button class="btn bg btn-sm" onclick="ZPL.open(${m.id});UI.closeDrw()">🦓 ZPL</button>`;

    document.getElementById('drw').style.right = '0';
    this._showDrwOverlay();
  },

  closeDrw() {
    document.getElementById('drw').style.right = '-380px';
    const ov = document.getElementById('_drw_ov');
    if (ov) ov.style.display = 'none';
  },

  _showDrwOverlay() {
    let ov = document.getElementById('_drw_ov');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = '_drw_ov';
      ov.style.cssText = 'position:fixed;inset:0;z-index:199;background:rgba(0,0,0,.3);';
      ov.onclick = () => this.closeDrw();
      document.body.appendChild(ov);
    }
    ov.style.display = 'block';
  },

  /** Small inline input helper for constructor */
  inp(attrs, val, cb) {
    const escaped = (val || '').toString().replace(/"/g, '&quot;');
    return `<input ${attrs} value="${escaped}" oninput="${cb}"
      style="background:var(--panel);border:1px solid var(--border);color:var(--text);
             padding:3px 6px;border-radius:3px;font-size:11px;width:100%">`;
  },

  /** Download a blob as file */
  download(content, filename, mime = 'application/json') {
    const blob = new Blob([content], { type: mime });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  confirm(msg) { return window.confirm(msg); }
};

/* KEYBOARD SHORTCUTS */
document.addEventListener('keydown', function(e) {
  if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if (!S.ses) return;
  const pages = ['dash','quick','mats','emps','tmpls','cons','hist','scan','ai','sett'];
  const n = parseInt(e.key);
  if (n >= 1 && n <= pages.length) NAV.go(pages[n - 1]);
  if ((e.key === 'p' || e.key === 'P') && S.page === 'quick') QUICK.print();
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    UI.closeDrw();
  }
});

/* OFFLINE BANNER */
window.addEventListener('offline',  () => { const b = document.getElementById('offline-bar'); if (b) b.style.display = 'block'; });
window.addEventListener('online',   () => { const b = document.getElementById('offline-bar'); if (b) b.style.display = 'none';  });

/* Inject offline bar */
document.addEventListener('DOMContentLoaded', () => {
  const bar = document.createElement('div');
  bar.id = 'offline-bar';
  bar.textContent = '⚡ OFFLINE — все данные сохранены локально';
  document.body.appendChild(bar);
  if (!navigator.onLine) bar.style.display = 'block';
});
