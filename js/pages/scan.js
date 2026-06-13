/* === scan.js === */
const SCAN = {
  render() {
    const pg = document.getElementById('pg-scan');
    pg.innerHTML = `
      <div class="sh"><span class="st">🔍 QR Сканер / Проверка этикетки</span></div>
      <div class="scan-wrap">
        <div style="width:100%;max-width:520px;display:flex;flex-direction:column;gap:14px">
          <div class="card">
            <div class="ch" style="background:linear-gradient(90deg,rgba(0,212,255,.06),transparent)">
              <span style="font-size:15px">🔍</span>
              <span class="ct c-accent">Расшифровка QR-кода</span>
            </div>
            <div class="cb">
              <div class="fg mb12">
                <label>Вставьте данные QR-кода</label>
                <textarea id="scanin" rows="4"
                  placeholder="N:Соус|O:15.01.26 14:30|E:18.01.26 14:30|B:LOT-001|T:+2°C|P:Иванов"
                  oninput="SCAN.parse()"
                  style="font-family:var(--ff);font-size:11px"></textarea>
              </div>
              <div id="scanout" style="background:var(--bg2);border-radius:5px;padding:12px;border:1px solid var(--border);min-height:80px;font-size:12px;color:var(--muted2)">
                Вставьте данные выше — поля заполнятся автоматически
              </div>
            </div>
          </div>
          <div class="card">
            <div class="ch"><span class="ct">📋 Формат QR-данных</span></div>
            <div class="cb" style="font-size:11px;color:var(--muted2);line-height:2;font-family:var(--ff)">
              <span style="color:var(--accent)">N:</span>Продукт &nbsp;
              <span style="color:var(--accent)">O:</span>Дата вскрытия &nbsp;
              <span style="color:var(--accent)">E:</span>Годен до<br>
              <span style="color:var(--accent)">B:</span>Партия &nbsp;
              <span style="color:var(--accent)">T:</span>Хранение &nbsp;
              <span style="color:var(--accent)">P:</span>Сотрудник<br>
              <span style="color:var(--muted2)">Разделитель полей: <b style="color:var(--text)">|</b></span>
            </div>
          </div>
        </div>
      </div>`;
  },

  parse() {
    const raw = document.getElementById('scanin').value.trim();
    const out = document.getElementById('scanout');
    if (!out) return;

    if (!raw) {
      out.innerHTML = '<span style="color:var(--muted2)">Вставьте данные QR-кода</span>';
      return;
    }

    const MAP = {N:'Продукт', O:'Вскрыт', E:'Годен до', B:'Партия', T:'Хранение', P:'Сотрудник', Note:'ХАССП'};
    let html    = '';
    let expired = false;
    let found   = 0;

    raw.split('|').forEach(part => {
      const ci = part.indexOf(':');
      if (ci < 0) return;
      const k = part.substring(0, ci).trim();
      const v = part.substring(ci + 1).trim();
      found++;

      // Check expiry
      if (k === 'E' && v && v !== '—') {
        try {
          const pts = v.split(' ')[0].split('.');
          if (pts.length >= 3) {
            const yr  = parseInt(pts[2]) < 100 ? 2000 + parseInt(pts[2]) : parseInt(pts[2]);
            const exp = new Date(yr, parseInt(pts[1]) - 1, parseInt(pts[0]));
            if (!isNaN(exp) && exp < new Date()) expired = true;
          }
        } catch {}
      }

      const label = MAP[k] || k;
      const isExp = (k === 'E' && expired);
      html += `
        <div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);align-items:center">
          <span style="color:var(--muted2);width:82px;flex-shrink:0;font-size:11px;font-family:var(--ff)">${label}</span>
          <span style="font-weight:600;flex:1;${isExp ? 'color:var(--danger)' : ''}">${v}</span>
          ${isExp ? '<span class="bdg b-no">ПРОСРОЧЕНО</span>' : ''}
        </div>`;
    });

    if (!found) {
      out.innerHTML = '<span style="color:var(--warn)">⚠️ Неверный формат QR-кода</span>';
      return;
    }

    out.innerHTML = html;

    if (expired) {
      out.insertAdjacentHTML('beforeend', `
        <div style="margin-top:10px;padding:9px 12px;background:rgba(255,45,85,.1);
          border:1px solid var(--danger);border-radius:5px;color:var(--danger);
          font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">⚠️</span>
          <span>ПРОДУКТ ПРОСРОЧЕН! Использование запрещено.</span>
        </div>`);
    }
  }
};
