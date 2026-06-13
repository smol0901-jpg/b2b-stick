/* === templates.js === */
const TMPLS = {
  render() {
    const pg = document.getElementById('pg-tmpls');
    pg.innerHTML = `
      <div class="sh"><span class="st">📐 Форматы печати</span>
        <div class="sa">
          <button class="btn bg btn-sm" onclick="TMPLS.importT()">📥 Импорт</button>
          <button class="btn bg btn-sm" onclick="TMPLS.exportT()">📤 Экспорт</button>
          <button class="btn bp btn-sm" onclick="TMPLS.newT()">+ Новый</button>
        </div>
      </div>
      <div class="tgrid" id="tgrid"></div>`;
    this._renderGrid();
  },

  _renderGrid() {
    const g = document.getElementById('tgrid');
    if (!g) return;
    g.innerHTML = S.tmpls.map(t => `
      <div class="tc ${t.id === S.cTmpl ? 'on' : ''}" onclick="TMPLS.select('${t.id}')">
        <div class="tp">${this._mini(t)}</div>
        <div class="ti">
          <div class="tn">${t.name}</div>
          <div class="fx aic gap6 mt4"><span class="tsz">${t.w}×${t.h}мм</span>${t.sys ? '<span class="bdg b-a">SYS</span>' : ''}</div>
          ${S.canEdit() ? `<div class="fx gap4 mt8">
            <button class="btn bg btn-sm" onclick="event.stopPropagation();TMPLS.edit('${t.id}')">🛠️ Ред.</button>
            ${!t.sys && S.isSA() ? `<button class="btn bg btn-sm" onclick="event.stopPropagation();TMPLS.del('${t.id}')">🗑️</button>` : ''}
          </div>` : ''}
        </div>
      </div>`).join('');
  },

  _mini(t) {
    try {
      const d  = {name:'Продукт', openDate:'15.01', expiry:'17.01', temp:'+2°C', openedBy:'Иванов', batch:'B-001', allergens:''};
      const el = LABEL.build(d, t);
      el.style.cssText = 'transform:scale(.48);transform-origin:top center;position:absolute;';
      const w  = document.createElement('div');
      w.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;';
      w.appendChild(el);
      const tmp = document.createElement('div');
      tmp.appendChild(w);
      return tmp.innerHTML;
    } catch { return ''; }
  },

  select(id) { S.cTmpl = id; this._renderGrid(); UI.toast('Шаблон выбран', 'inf'); },
  edit(id)   { S.cTmpl = id; NAV.go('cons'); },

  async newT() {
    if (!S.canEdit()) { UI.toast('Нет прав', 'err'); return; }
    const t = {
      id: 't' + Date.now(), name: 'Новый шаблон', sys: false, w: 90, h: 60, logo: null,
      blocks: [
        {id:1,t:'text',lb:'',val:'{name}',fs:14,bold:true,al:'center',cl:'#000000'},
        {id:2,t:'divider'},
        {id:3,t:'grid2',l1:'Вскрыт:',v1:'{openDate}',l2:'Годен:',v2:'{expiry}',fs:10}
      ]
    };
    try {
      await SB.insert('templates', {
        id: t.id, name: t.name, is_system: false,
        width_mm: t.w, height_mm: t.h, logo: t.logo, blocks: t.blocks,
        created_by: S.ses?.id, org_id: S.ses?.orgId || 'vlavashe'
      });
      S.tmpls.push(t);
      S.cTmpl = t.id;
      logAct('Создан шаблон', S.ses?.name, t.name, 'template', t.id);
      NAV.go('cons');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async del(id) {
    if (!S.isSA()) { UI.toast('Только Суперадмин', 'err'); return; }
    const t = S.tmpls.find(x => x.id === id);
    if (t?.sys) { UI.toast('Системный шаблон нельзя удалить', 'err'); return; }
    if (!UI.confirm('Удалить шаблон?')) return;
    try {
      await SB.remove('templates', id);
      S.tmpls = S.tmpls.filter(x => x.id !== id);
      logAct('Удалён шаблон', S.ses?.name, t?.name||'', 'template', id);
      this._renderGrid(); UI.toast('🗑️ Удалён');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  exportT() {
    const t = S.tmpls.find(x => x.id === S.cTmpl) || S.tmpls[0];
    UI.download(JSON.stringify({template:t, sys:'NLP_v2', date:new Date().toISOString()}, null, 2), `tmpl_${t.id}.json`);
    UI.toast('📤 Экспортировано');
  },

  importT() {
    if (!S.canEdit()) { UI.toast('Нет прав', 'err'); return; }
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = async ev => {
        try {
          const d = JSON.parse(ev.target.result.replace(/^\uFEFF/, ''));
          const tmpl = d.template || d;
          if (!tmpl.blocks) throw new Error('Нет блоков');
          tmpl.id = 't' + Date.now(); tmpl.sys = false;
          await SB.insert('templates', {
            id: tmpl.id, name: tmpl.name || 'Импортированный шаблон', is_system: false,
            width_mm: tmpl.w || 90, height_mm: tmpl.h || 60, logo: tmpl.logo || null,
            blocks: tmpl.blocks, created_by: S.ses?.id, org_id: S.ses?.orgId || 'vlavashe'
          });
          S.tmpls.push(tmpl);
          logAct('Импортирован шаблон', S.ses?.name, tmpl.name, 'template', tmpl.id);
          this._renderGrid();
          UI.toast('✅ Шаблон импортирован');
        } catch(err) { UI.toast('❌ ' + err.message, 'err'); }
      };
      r.readAsText(f);
    };
    inp.click();
  }
};
