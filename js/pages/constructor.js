/* === constructor.js === */
const CONS = {
  render() {
    const pg = document.getElementById('pg-cons');
    pg.innerHTML = `
      <div class="sh"><span class="st">🛠️ Конструктор шаблонов</span>
        <div class="sa">
          <select id="csel" class="sel-inline" onchange="CONS.load()"></select>
          <button class="btn bg btn-sm" onclick="CONS.clone()">📋 Клон</button>
          <button class="btn bg btn-sm" onclick="CONS.exportAI()">🧠 → ИИ</button>
          <button class="btn bg btn-sm" onclick="document.getElementById('aiImp').click()">📥 ← ИИ</button>
          <input type="file" id="aiImp" accept=".json" style="display:none" onchange="CONS.importAI(event)">
          <button class="btn bp btn-sm" onclick="CONS.save()">💾 Сохранить</button>
        </div>
      </div>
      <div class="cgrid">
        <div class="cpanel">
          <div class="csec">
            <div class="cst">📐 Размер (мм)</div>
            <div class="g2">
              <div class="fg"><label>Ширина</label><input type="number" id="cw" value="90" oninput="CONS.updSize()"></div>
              <div class="fg"><label>Высота</label><input type="number" id="ch" value="60" oninput="CONS.updSize()"></div>
            </div>
          </div>
          <div class="csec">
            <div class="cst">🖼️ Логотип шаблона</div>
            <div class="lzone" id="clzone" onclick="document.getElementById('clf').click()">
              <div id="clprev">📷 Загрузить логотип</div>
            </div>
            <input type="file" id="clf" accept="image/*" style="display:none" onchange="CONS.loadLogo(event)">
            <button class="btn bg btn-sm mt8 hidden" id="clrm" onclick="CONS.rmLogo()">✕ Убрать логотип</button>
          </div>
          <div class="csec">
            <div class="cst">➕ Добавить блок</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
              <button class="btn bg btn-sm" onclick="CONS.addBlk('text')">📝 Текст</button>
              <button class="btn bg btn-sm" onclick="CONS.addBlk('grid2')">⊞ 2 поля</button>
              <button class="btn bg btn-sm" onclick="CONS.addBlk('qr')">🔳 QR-код</button>
              <button class="btn bg btn-sm" onclick="CONS.addBlk('divider')">➖ Линия</button>
              <button class="btn bg btn-sm" onclick="CONS.addBlk('logo')">🖼️ Лого</button>
              <button class="btn bg btn-sm" onclick="CONS.addBlk('html')">💻 HTML</button>
            </div>
          </div>
          <div class="csec" style="flex:1;overflow-y:auto">
            <div class="cst">🗂️ Редактор блоков</div>
            <div id="cblks"></div>
          </div>
        </div>
        <div class="qprev" id="cprev">
          <div class="ptb" style="max-width:680px;width:100%">
            <span style="font-size:11px;color:var(--muted2)">Превью шаблона:</span>
            <span id="cpinfo" style="font-size:11px;color:var(--accent);font-family:var(--ff)">—</span>
          </div>
          <div id="cpc"></div>
          <p style="margin-top:12px;font-size:11px;color:var(--muted2);text-align:center">
            Плейсхолдеры: {name} {openDate} {expiry} {temp} {openedBy} {batch} {allergens} {haccpNote}
          </p>
        </div>
      </div>`;

    this._fillSelect();
    if (!S.cTmpl && S.tmpls.length) S.cTmpl = S.tmpls[0].id;
    const t = S.tmpls.find(x => x.id === S.cTmpl) || S.tmpls[0];
    if (t) this._applyTemplate(t);
  },

  _fillSelect() {
    const sel = document.getElementById('csel');
    if (!sel) return;
    sel.innerHTML = S.tmpls.map(t =>
      `<option value="${t.id}" ${t.id === S.cTmpl ? 'selected' : ''}>${t.name}</option>`
    ).join('');
  },

  _applyTemplate(t) {
    const cw = document.getElementById('cw');
    const ch = document.getElementById('ch');
    if (cw) cw.value = t.w;
    if (ch) ch.value = t.h;
    this._renderLogo(t);
    this._renderBlocks(t);
    this._renderPreview(t);
  },

  load() {
    S.cTmpl = document.getElementById('csel').value;
    const t = S.tmpls.find(x => x.id === S.cTmpl);
    if (t) this._applyTemplate(t);
  },

  updSize() {
    const t = S.tmpls.find(x => x.id === S.cTmpl); if (!t) return;
    t.w = parseFloat(document.getElementById('cw').value) || 90;
    t.h = parseFloat(document.getElementById('ch').value) || 60;
    this._renderPreview(t);
  },

  async loadLogo(ev) {
    if (!S.canEdit()) { UI.toast('Нет прав', 'err'); return; }
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async e => {
      const t = S.tmpls.find(x => x.id === S.cTmpl);
      if (t) t.logo = e.target.result;
      S.logos.global = e.target.result;
      try {
        await SB.update('templates', t.id, { logo: t.logo, updated_by: S.ses?.id });
        await SB.updateSettings(S.ses?.orgId || 'vlavashe', null, S.logos);
        this._renderLogo(t);
        this._renderPreview(t);
        UI.toast('🖼️ Логотип загружен');
      } catch(err) { UI.toast('❌ ' + err.message, 'err'); }
    };
    r.readAsDataURL(f);
  },

  async rmLogo() {
    if (!S.canEdit()) { UI.toast('Нет прав', 'err'); return; }
    const t = S.tmpls.find(x => x.id === S.cTmpl);
    if (t) t.logo = null;
    try {
      await SB.update('templates', t.id, { logo: null, updated_by: S.ses?.id });
      this._renderLogo(t);
      this._renderPreview(t);
      UI.toast('Логотип удалён');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  _renderLogo(t) {
    const zone = document.getElementById('clzone');
    const rm   = document.getElementById('clrm');
    if (!zone) return;
    const src = t?.logo || S.logos.global;
    if (src) {
      zone.innerHTML = `<img src="${src}"><div style="font-size:10px;color:var(--muted2);margin-top:4px">Нажмите для замены</div>`;
      zone.classList.add('has');
      if (rm) rm.classList.remove('hidden');
    } else {
      zone.innerHTML = '📷 Загрузить логотип';
      zone.classList.remove('has');
      if (rm) rm.classList.add('hidden');
    }
  },

  addBlk(tp) {
    const t = S.tmpls.find(x => x.id === S.cTmpl); if (!t) return;
    const id = Date.now();
    const defs = {
      text:    {id, t:'text',    lb:'', val:'Текст',         fs:11, bold:false, al:'left',   cl:'#000000'},
      grid2:   {id, t:'grid2',  l1:'Поле 1:', v1:'Данные',  l2:'Поле 2:',    v2:'Данные',  fs:10},
      qr:      {id, t:'qr',     qd:'auto', sz:80},
      divider: {id, t:'divider'},
      logo:    {id, t:'logo'},
      html:    {id, t:'html',   html:'<div style="font-size:9px">Свой HTML</div>'}
    };
    t.blocks.push(defs[tp] || {id, t: tp});
    this._renderBlocks(t);
    this._renderPreview(t);
  },

  delBlk(bid) {
    const t = S.tmpls.find(x => x.id === S.cTmpl); if (!t) return;
    t.blocks = t.blocks.filter(b => b.id !== bid);
    this._renderBlocks(t);
    this._renderPreview(t);
  },

  mvBlk(bid, dir) {
    const t = S.tmpls.find(x => x.id === S.cTmpl); if (!t) return;
    const i = t.blocks.findIndex(b => b.id === bid);
    if (dir === 'up'   && i > 0)                  [t.blocks[i], t.blocks[i-1]] = [t.blocks[i-1], t.blocks[i]];
    if (dir === 'dn'   && i < t.blocks.length - 1) [t.blocks[i], t.blocks[i+1]] = [t.blocks[i+1], t.blocks[i]];
    this._renderBlocks(t);
    this._renderPreview(t);
  },

  upd(bid, key, val) {
    const t = S.tmpls.find(x => x.id === S.cTmpl); if (!t) return;
    const b = t.blocks.find(x => x.id === bid);    if (!b) return;
    if (key === 'bold') val = (val === true || val === 'true');
    if (['fs','sz'].includes(key)) val = parseInt(val) || 10;
    b[key] = val;
    this._renderPreview(t);
  },

  _renderBlocks(t) {
    const el = document.getElementById('cblks');
    if (!el) return;

    el.innerHTML = (t.blocks || []).map(b => {
      let fields = '';

      if (b.t === 'text') {
        fields = `
          <div class="g2 mb4">
            ${UI.inp('placeholder="Метка"',   b.lb,  `CONS.upd(${b.id},'lb',this.value)`)}
            ${UI.inp('placeholder="{name}..."', b.val, `CONS.upd(${b.id},'val',this.value)`)}
          </div>
          <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
            <input type="number" value="${b.fs||11}" oninput="CONS.upd(${b.id},'fs',this.value)"
              style="width:50px;background:var(--panel);border:1px solid var(--border);color:var(--text);padding:3px;border-radius:3px;font-size:11px">
            <select onchange="CONS.upd(${b.id},'al',this.value)"
              style="background:var(--panel);border:1px solid var(--border);color:var(--text);padding:3px;border-radius:3px;font-size:11px">
              <option value="left"   ${b.al==='left'   ?'selected':''}>Лево</option>
              <option value="center" ${b.al==='center' ?'selected':''}>Центр</option>
            </select>
            <input type="color" value="${b.cl||'#000000'}" oninput="CONS.upd(${b.id},'cl',this.value)"
              style="width:30px;height:24px;padding:1px;cursor:pointer;border:1px solid var(--border);border-radius:3px">
            <label style="font-size:11px;display:flex;align-items:center;gap:3px;cursor:pointer">
              <input type="checkbox" ${b.bold?'checked':''} onchange="CONS.upd(${b.id},'bold',this.checked)"> Ж
            </label>
          </div>`;

      } else if (b.t === 'grid2') {
        fields = `
          <div class="g2 mb4">
            ${UI.inp('placeholder="Метка 1"', b.l1, `CONS.upd(${b.id},'l1',this.value)`)}
            ${UI.inp('placeholder="Знач. 1"', b.v1, `CONS.upd(${b.id},'v1',this.value)`)}
          </div>
          <div class="g2">
            ${UI.inp('placeholder="Метка 2"', b.l2, `CONS.upd(${b.id},'l2',this.value)`)}
            ${UI.inp('placeholder="Знач. 2"', b.v2, `CONS.upd(${b.id},'v2',this.value)`)}
          </div>`;

      } else if (b.t === 'qr') {
        fields = `<div style="font-size:11px;color:var(--muted2)">Размер (px):
          <input type="number" value="${b.sz||80}" oninput="CONS.upd(${b.id},'sz',this.value)"
            style="width:60px;background:var(--panel);border:1px solid var(--border);color:var(--text);padding:3px;border-radius:3px;margin-left:4px"></div>`;

      } else if (b.t === 'html') {
        const escaped = (b.html || '').replace(/"/g, '&quot;');
        fields = `<textarea oninput="CONS.upd(${b.id},'html',this.value)"
          style="width:100%;min-height:48px;background:var(--panel);border:1px solid var(--border);color:var(--text);padding:3px;border-radius:3px;font-size:10px;font-family:monospace"
          >${escaped}</textarea>`;

      } else if (b.t === 'logo') {
        fields = `<div style="font-size:11px;color:var(--muted2)">Отображает логотип шаблона</div>`;

      } else if (b.t === 'divider') {
        fields = `<div style="font-size:11px;color:var(--muted2)">Горизонтальная линия-разделитель</div>`;
      }

      return `<div class="blk">
        <div class="bh">
          <span class="btb">${b.t.toUpperCase()}</span>
          <div class="bact">
            <button onclick="CONS.mvBlk(${b.id},'up')">▲</button>
            <button onclick="CONS.mvBlk(${b.id},'dn')">▼</button>
            <button class="del" onclick="CONS.delBlk(${b.id})">✕</button>
          </div>
        </div>
        <div class="bb">${fields}</div>
      </div>`;
    }).join('');
  },

  _renderPreview(t) {
    const sample = {
      name:'Соус бешамель', openDate:'15.01.26 14:30', expiry:'18.01.26 14:30',
      temp:'+2...+6°C', openedBy:'Иванов И.И.', batch:'B-001',
      allergens:'Молоко, глютен', haccpNote:'Хранить закрытым'
    };
    const c = document.getElementById('cpc');
    if (c) { c.innerHTML = ''; c.appendChild(LABEL.build(sample, t)); }
    const pi = document.getElementById('cpinfo');
    if (pi) pi.textContent = `${t.w}×${t.h}мм · ${t.blocks.length} блоков`;
  },

  async save() {
    if (!S.canEdit()) { UI.toast('Нет прав', 'err'); return; }
    const t = S.tmpls.find(x => x.id === S.cTmpl);
    if (!t) return;
    try {
      await SB.update('templates', t.id, {
        name: t.name, width_mm: t.w, height_mm: t.h, logo: t.logo, blocks: t.blocks,
        updated_by: S.ses?.id
      });
      UI.toast('✅ Шаблон сохранён');
      logAct('Сохранён шаблон', S.ses?.name, t.name, 'template', t.id);
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async clone() {
    if (!S.canEdit()) { UI.toast('Нет прав', 'err'); return; }
    const t = S.tmpls.find(x => x.id === S.cTmpl);
    if (!t) { UI.toast('Выберите шаблон', 'err'); return; }
    const c = JSON.parse(JSON.stringify(t));
    c.id   = 't' + Date.now();
    c.name = 'Копия: ' + c.name;
    c.sys  = false;
    try {
      await SB.insert('templates', {
        id: c.id, name: c.name, is_system: false,
        width_mm: c.w, height_mm: c.h, logo: c.logo, blocks: c.blocks,
        created_by: S.ses?.id, org_id: S.ses?.orgId || 'vlavashe'
      });
      S.tmpls.push(c);
      S.cTmpl = c.id;
      logAct('Клонирован шаблон', S.ses?.name, c.name, 'template', c.id);
      this.render();
      UI.toast('✅ Шаблон клонирован');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  exportAI() {
    const t = S.tmpls.find(x => x.id === S.cTmpl) || S.tmpls[0];
    const payload = {
      sys: 'NEURAL_LABEL_PRO_v2',
      instruction: 'Оптимизируй шаблон этикетки по ХАССП ТР ТС 022/2011. Добавь прослеживаемость, аллергены, условия хранения. Верни JSON с полем template.',
      template: t,
      sample_materials: S.mats.slice(0, 3)
    };
    UI.download(JSON.stringify(payload, null, 2), `ai_template_${new Date().toISOString().slice(0,10)}.json`);
    UI.toast('📥 Выгружено для ИИ');
  },

  importAI(ev) {
    if (!S.canEdit()) { UI.toast('Нет прав', 'err'); ev.target.value=''; return; }
    const f = ev.target.files[0]; if (!f) return;
    ev.target.value = '';
    const r = new FileReader();
    r.onload = e => {
      try {
        const d    = JSON.parse(e.target.result.replace(/^\uFEFF/, ''));
        const tmpl = d.template || d;
        if (!tmpl.blocks || !Array.isArray(tmpl.blocks)) throw new Error('Нет массива blocks');
        const t = S.tmpls.find(x => x.id === S.cTmpl) || S.tmpls[0];
        t.blocks = tmpl.blocks;
        if (tmpl.w) t.w = tmpl.w;
        if (tmpl.h) t.h = tmpl.h;
        if (tmpl.name) t.name = tmpl.name;
        // Render immediately; user must click "Сохранить" to persist to Supabase
        this.render();
        UI.toast('✅ Применено. Нажмите 💾 Сохранить, чтобы записать в базу');
      } catch(err) { UI.toast('❌ ' + err.message, 'err'); }
    };
    r.readAsText(f);
  }
};
