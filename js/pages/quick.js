/* === quick.js — quick print page === */
const QUICK = {
  init() {
    const pg = document.getElementById('pg-quick');
    pg.innerHTML = `
      <div class="sh"><span class="st">⚡ Быстрая печать</span><span style="font-size:11px;color:var(--muted2)">Цель: 1 минута</span></div>
      <div class="qgrid">
        <div class="qpanel">
          <div class="qsec"><div class="qst">1. ПРОДУКТ</div>
            <div class="fg mb8"><label>Продукт / Сырьё</label><select id="q_prod" onchange="QUICK.prodChange()"><option value="">-- Выберите --</option></select></div>
            <div id="q_info" class="hidden" style="padding:7px 9px;background:var(--bg3);border-radius:4px;border:1px solid var(--border2);font-size:11px;line-height:1.9;margin-bottom:7px"></div>
            <div id="q_expind" class="hidden expind"></div>
          </div>
          <div class="qsec"><div class="qst">2. ПАРАМЕТРЫ</div>
            <div class="g2 mb8">
              <div class="fg"><label>Дата вскрытия</label><input type="datetime-local" id="q_dt" onchange="QUICK.preview()"></div>
              <div class="fg"><label>Партия</label><input type="text" id="q_bat" placeholder="PAR-001" oninput="QUICK.preview()"></div>
            </div>
            <div class="fg mb8"><label>Сотрудник</label><select id="q_emp" onchange="QUICK.preview()"><option value="">-- Выберите --</option></select></div>
            <div class="fg mb8"><label>Или введите вручную</label><input type="text" id="q_empm" placeholder="Иванов И.И." oninput="QUICK.preview()"></div>
            <div class="fg"><label>Кол-во этикеток</label><input type="number" id="q_cnt" value="1" min="1" max="100" oninput="QUICK.preview()"></div>
          </div>
          <div class="qsec"><div class="qst">3. ФОРМАТ</div>
            <div class="g2">
              <div class="fg"><label>Шаблон</label><select id="q_tmpl" onchange="QUICK.preview()"></select></div>
              <div class="fg"><label>Ориентация</label><select id="q_ori" onchange="QUICK.preview()"><option value="portrait">Книжная</option><option value="landscape">Альбомная</option></select></div>
            </div>
          </div>
          <div class="qsec">
            <button class="btn bs btn-lg w100" onclick="QUICK.print()">🖨️ ПЕЧАТЬ ЭТИКЕТКИ</button>
            <button class="btn bg w100 mt8" onclick="BATCH.openModal()">📦 ПАКЕТНАЯ ПЕЧАТЬ</button>
            <button class="btn bg w100 mt8" onclick="ZPL.open()">🦓 ZPL для Zebra</button>
          </div>
        </div>
        <div class="qprev" id="qprev">
          <div class="ptb">
            <span style="font-size:11px;color:var(--muted2)">Предпросмотр:</span>
            <span id="qpinfo" style="font-size:11px;color:var(--accent);font-family:var(--ff)">—</span>
          </div>
          <div id="qpc"></div>
        </div>
      </div>`;

    // Populate selects
    const ps = document.getElementById('q_prod');
    S.mats.filter(m => m.st !== 'arc').forEach(m => {
      const o = document.createElement('option'); o.value = m.id; o.textContent = m.name; ps.appendChild(o);
    });
    const es = document.getElementById('q_emp');
    S.emps.filter(e => e.st !== 'arc').forEach(e => {
      const o = document.createElement('option'); o.value = e.id; o.textContent = e.name; es.appendChild(o);
    });
    const ts = document.getElementById('q_tmpl');
    S.tmpls.forEach(t => {
      const o = document.createElement('option'); o.value = t.id;
      o.textContent = t.name;
      if (t.id === S.sett.defaultTmpl) o.selected = true;
      ts.appendChild(o);
    });
    // Set datetime now
    const now = new Date();
    document.getElementById('q_dt').value = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    this.preview();
  },

  prodChange() {
    const id  = parseInt(document.getElementById('q_prod').value);
    const m   = S.mats.find(x => x.id === id);
    const inf = document.getElementById('q_info');
    if (m) {
      inf.innerHTML = `🌡️ <b>${m.tmp || '—'}</b> &nbsp; ⏱️ <b>${m.sh || '—'} ч.</b> &nbsp; ⚠️ ${m.all || '—'}`;
      inf.classList.remove('hidden');
    } else {
      inf.classList.add('hidden');
    }
    this.preview();
  },

  getData() {
    const mid = parseInt(document.getElementById('q_prod').value);
    const m   = S.mats.find(x => x.id === mid) || {};
    const eid = parseInt(document.getElementById('q_emp').value);
    const emp = S.emps.find(e => e.id === eid);
    const od  = document.getElementById('q_dt').value;
    const ob  = emp ? emp.name : (document.getElementById('q_empm').value || '—');
    const bat = document.getElementById('q_bat').value || m.lot || '—';
    return LABEL.matToData(m, od, ob, bat);
  },

  preview() {
    const tid = document.getElementById('q_tmpl')?.value;
    if (!tid) return;
    const t   = S.tmpls.find(x => x.id === tid) || S.tmpls[0];
    if (!t) return;
    const d   = this.getData();
    const c   = document.getElementById('qpc');
    if (c) { c.innerHTML = ''; c.appendChild(LABEL.build(d, t)); }
    const pi  = document.getElementById('qpinfo');
    if (pi) pi.textContent = `${t.w}×${t.h}мм`;
    this._updExpInd();
  },

  _updExpInd() {
    const mid = AC.getSelectedId('q_prod_input');
    const m   = S.mats.find(x => x.id === mid);
    const od  = document.getElementById('q_dt')?.value;
    const ind = document.getElementById('q_expind');
    if (!ind) return;
    if (m && m.sh && od) {
      const exp  = new Date(od); exp.setHours(exp.getHours() + parseInt(m.sh));
      const diff = (exp - Date.now()) / 3600000;
      ind.className = 'expind ' + (diff < 0 ? 'cr' : diff < 6 ? 'w' : 'ok');
      ind.textContent = diff < 0
        ? `⚠️ СРОК ИСТЁК ${Math.abs(Math.round(diff))} ч. назад`
        : diff < 6
          ? `⏰ Годен ещё ${Math.round(diff)} ч.`
          : `✅ Годен до: ${exp.toLocaleString('ru', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}`;
      ind.classList.remove('hidden');
    } else {
      ind.classList.add('hidden');
    }
  },

  print() {
    const tid = document.getElementById('q_tmpl')?.value;
    const t   = S.tmpls.find(x => x.id === tid) || S.tmpls[0];
    const d   = this.getData();
    const cnt = parseInt(document.getElementById('q_cnt')?.value) || 1;
    const ori = document.getElementById('q_ori')?.value || 'portrait';
    LABEL.printBatch([{ data: d, tmpl: t, count: cnt }], ori);
    logAct('Печать этикетки', S.ses?.name, d.name, 'print');
    if (S.tg.np && S.tg.tok && S.tg.cid) TG_MOD.send(`🖨️ Этикетка: ${d.name}\nСотрудник: ${d.openedBy}`);
  },

  printMat(id) {
    NAV.go('quick');
    setTimeout(() => {
      const m   = S.mats.find(x => x.id === id);
      const inp = document.getElementById('q_prod_input');
      if (m && inp) {
        inp.value = m.name;
        inp.setAttribute('data-mat-id', id);
        this.prodChange(id);
      }
    }, 100);
  }
};
