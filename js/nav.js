/* === nav.js — page navigation & sidebar === */
const NAV = {
  // Pages staff are never allowed to view, regardless of how navigation is triggered
  STAFF_BLOCKED: ['cons', 'ai', 'sett'],

  go(p) {
    // Guard: staff cannot reach admin-only pages (defense in depth, RLS is primary)
    if (S.ses?.role === 'staff' && this.STAFF_BLOCKED.includes(p)) {
      UI.toast('Недостаточно прав', 'err');
      p = 'dash';
    }

    document.querySelectorAll('.pg').forEach(el => el.classList.remove('on'));
    const pg = document.getElementById('pg-' + p);
    if (pg) pg.classList.add('on');

    document.querySelectorAll('.ni[data-pg]').forEach(el => el.classList.remove('on'));
    const ni = document.querySelector(`.ni[data-pg="${p}"]`);
    if (ni) ni.classList.add('on');

    S.page = p;

    // Delegate rendering to each page module
    const map = {
      dash:  () => DASH.render(),
      quick: () => QUICK.init(),
      mats:  () => MATS.render(),
      emps:  () => EMPS.render(),
      tmpls: () => TMPLS.render(),
      cons:  () => CONS.render(),
      depts: () => DEPTS.render(),
      jour:  () => JOURNALS.render(),
      hist:  () => HIST.render(),
      scan:  () => SCAN.render(),
      ai:    () => AI_MOD.render(),
      sett:  () => SETT.render(),
      reqs:  () => REQS.render()
    };
    if (map[p]) map[p]();
  },

  toggleSidebar() {
    document.getElementById('nav').classList.toggle('expanded');
    document.body.classList.toggle('nex');
  },

  updateBadge(id, count) {
    const el = document.getElementById('nb-' + id);
    if (!el) return;
    if (count > 0) { el.textContent = count; el.classList.remove('hidden'); }
    else           { el.classList.add('hidden'); }
  }
};
