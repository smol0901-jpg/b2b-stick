/* === label.js — label rendering, QR, placeholders, print helpers === */
const LABEL = {

  px(mm) { return mm * 3.7795; },

  /** Fill template placeholders */
  fph(s, d) {
    return (s || '')
      .replace(/\{name\}/g,      d.name      || '')
      .replace(/\{openDate\}/g,  d.openDate  || '')
      .replace(/\{expiry\}/g,    d.expiry    || '')
      .replace(/\{temp\}/g,      d.temp      || '')
      .replace(/\{openedBy\}/g,  d.openedBy  || '')
      .replace(/\{batch\}/g,     d.batch     || '')
      .replace(/\{allergens\}/g, d.allergens || '')
      .replace(/\{haccpNote\}/g, d.haccpNote || '');
  },

  /** Build QR payload string */
  qrPayload(d) {
    const p = [];
    if (d.name)                p.push('N:' + d.name);
    if (d.openDate)            p.push('O:' + d.openDate);
    if (d.expiry)              p.push('E:' + d.expiry);
    if (d.batch && d.batch !== '—') p.push('B:' + d.batch);
    if (d.temp)                p.push('T:' + d.temp);
    if (d.openedBy)            p.push('P:' + d.openedBy);
    return p.join('|');
  },

  /** Generate QR SVG string */
  genQR(txt, sz) {
    try {
      const q  = qrcode(0, 'M');
      q.addData(String(txt), 'Byte');
      q.make();
      const mc = q.getModuleCount();
      const cs = Math.max(2, Math.floor(sz / mc));
      const as = cs * mc;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${as}" height="${as}">
        <rect width="${as}" height="${as}" fill="white"/>`;
      for (let r = 0; r < mc; r++)
        for (let c = 0; c < mc; c++)
          if (q.isDark(r, c))
            svg += `<rect x="${c * cs}" y="${r * cs}" width="${cs}" height="${cs}" fill="black"/>`;
      return svg + '</svg>';
    } catch { return '<div style="color:red;font-size:8px">QR ERR</div>'; }
  },

  /** Build label DOM element */
  build(d, t) {
    const div   = document.createElement('div');
    div.className = 'lc';
    div.style.cssText = `width:${this.px(t.w)}px;min-height:${this.px(t.h)}px;padding:6px;font-size:10px;font-family:Arial,sans-serif;`;
    const logo = t.logo || S.logos.global;

    (t.blocks || []).forEach(b => {
      let el;
      switch (b.t) {
        case 'text': {
          if (b.cond && !d[b.cond]) return;
          el = document.createElement('div');
          el.className = 'lr';
          el.style.justifyContent = b.al === 'center' ? 'center' : 'flex-start';
          if (b.lb) {
            const lbl = document.createElement('span');
            lbl.className = 'll';
            lbl.style.cssText = `font-size:${b.fs || 10}px;${b.cl ? 'color:' + b.cl : ''}`;
            lbl.textContent = b.lb;
            el.appendChild(lbl);
          }
          const val = document.createElement('span');
          val.style.cssText = `font-size:${b.fs || 10}px;${b.bold ? 'font-weight:700;' : ''}${b.cl ? 'color:' + b.cl + ';' : ''}${b.al === 'center' ? 'text-align:center;width:100%;' : ''}`;
          val.textContent = this.fph(b.val, d);
          el.appendChild(val);
          break;
        }
        case 'divider':
          el = document.createElement('div');
          el.className = 'ldiv';
          break;
        case 'grid2': {
          el = document.createElement('div');
          el.className = 'lgr';
          [1, 2].forEach(n => {
            const c   = document.createElement('div');
            c.className = 'lgc';
            if (b.fs) c.style.fontSize = b.fs + 'px';
            const lbl = document.createElement('b');
            lbl.textContent = b['l' + n] || '';
            const v   = document.createElement('span');
            v.textContent = this.fph(b['v' + n] || '', d);
            c.appendChild(lbl);
            c.appendChild(v);
            el.appendChild(c);
          });
          break;
        }
        case 'qr': {
          el = document.createElement('div');
          el.className = 'lqr';
          const txt = b.qd === 'auto' ? this.qrPayload(d) : this.fph(b.qd || '', d);
          el.innerHTML = this.genQR(txt, b.sz || 70);
          break;
        }
        case 'logo': {
          if (!logo) return;
          el = document.createElement('div');
          el.className = 'llog';
          const img = document.createElement('img');
          img.src = logo;
          el.appendChild(img);
          break;
        }
        case 'html': {
          el = document.createElement('div');
          el.innerHTML = this.fph(b.html || '', d);
          break;
        }
        default: return;
      }
      if (el) div.appendChild(el);
    });
    return div;
  },

  /** Add @page print style */
  addPS(ori) {
    const s = document.createElement('style');
    s.id = '_ps';
    s.textContent = `@page{size:${ori === 'landscape' ? 'A4 landscape' : 'A4 portrait'};margin:0;}`;
    document.head.appendChild(s);
  },

  rmPS() { const s = document.getElementById('_ps'); if (s) s.remove(); },

  /** Generic print: array of {data, tmpl, count} */
  printBatch(items, ori = 'portrait') {
    const pa = document.getElementById('parea');
    pa.style.display = 'block';
    pa.innerHTML = '';
    items.forEach(({ data, tmpl, count }) => {
      const pg = document.createElement('div');
      pg.className = 'ppage';
      for (let i = 0; i < Math.min(count, 50); i++) {
        const l = this.build(data, tmpl);
        l.style.display = 'inline-block';
        l.style.margin  = '2mm';
        pg.appendChild(l);
      }
      pa.appendChild(pg);
    });
    this.addPS(ori);
    setTimeout(() => {
      window.print();
      setTimeout(() => { pa.style.display = 'none'; pa.innerHTML = ''; this.rmPS(); }, 500);
    }, 300);
  },

  /** Build data object from material + params */
  matToData(mat, openDate, openedBy, batchOverride) {
    let expiry = '—';
    if (openDate && mat.sh) {
      const d = new Date(openDate);
      d.setHours(d.getHours() + parseInt(mat.sh));
      expiry = d.toLocaleString('ru', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'});
    }
    const odf = openDate
      ? new Date(openDate).toLocaleString('ru', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'})
      : '—';
    return {
      name:      mat.name    || '—',
      openDate:  odf,
      expiry,
      temp:      mat.tmp     || '—',
      openedBy:  openedBy    || '—',
      batch:     batchOverride || mat.lot || '—',
      allergens: mat.all     || '',
      haccpNote: mat.hac     || ''
    };
  }
};
