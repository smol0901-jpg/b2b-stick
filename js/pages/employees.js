/* === employees.js === */
const EMPS = {
  render() {
    const pg = document.getElementById('pg-emps');
    pg.innerHTML = `
      <div class="sh"><span class="st">👥 Сотрудники</span>
        <div class="sa">
          <div class="srch"><span>🔍</span><input type="text" id="es" placeholder="Поиск..." oninput="EMPS._renderGrid()"></div>
          <select id="ef" class="sel-inline" onchange="EMPS._renderGrid()">
            <option value="all">Все</option><option value="active">Активные</option><option value="arc">Архив</option>
          </select>
          <button class="btn bp btn-sm" id="btn-emp-add" onclick="EMPS.openModal()">+ Добавить</button>
        </div>
      </div>
      <div class="egrid" id="egrid"></div>
      ${this._modal()}`;
    if (S.isStaff()) { const b = document.getElementById('btn-emp-add'); if (b) b.style.display = 'none'; }
    this._renderGrid();
  },

  _renderGrid() {
    const q    = (document.getElementById('es')?.value || '').toLowerCase();
    const f    = document.getElementById('ef')?.value || 'all';
    const list = S.emps.filter(e => {
      if (q && !e.name.toLowerCase().includes(q)) return false;
      if (f === 'active' && e.st === 'arc') return false;
      if (f === 'arc'    && e.st !== 'arc') return false;
      return true;
    });
    const g = document.getElementById('egrid');
    if (!g) return;
    if (!list.length) { g.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted2);font-size:12px;grid-column:1/-1">Нет сотрудников</div>'; return; }
    g.innerHTML = list.map(e => {
      const rm  = RMAP[e.role] || RMAP.staff;
      const arc = e.st === 'arc';
      const medOk = e.med ? (new Date(e.med) - Date.now() > 0) : true;
      return `<div class="ecard ${arc ? 'arc' : ''}">
        <div class="fx gap6 aic">
          <div class="eav">${e.avatar ? `<img src="${e.avatar}">` : '👤'}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700">${e.name}</div>
            <div class="mt4"><span class="bdg ${rm.bcls}">${rm.lb}</span></div>
            <div style="font-size:11px;color:var(--muted2);margin-top:3px">${e.pos||'—'}${e.dep?' · '+e.dep:''}</div>
          </div>
        </div>
        <div style="font-size:10px;color:var(--muted2);line-height:1.9">
          ${e.ph  ? '📱 ' + e.ph  + '<br>' : ''}
          ${e.tg  ? '✈️ ' + e.tg  + '<br>' : ''}
          ${e.med ? `🏥 ${e.med} ${!medOk ? '<span class="c-danger">(!)</span>' : ''}<br>` : ''}
          🔑 <span class="mono">${e.email||'—'}</span>
        </div>
        ${S.canEdit() ? `<div class="fx gap4 mt4">
          ${!arc ? `<button class="btn bg btn-sm" onclick="EMPS.openModal(${e.id})">✏️</button>` : ''}
          <button class="btn bg btn-sm" onclick="EMPS.toggle(${e.id})">${arc ? '♻️' : '📦'}</button>
          ${S.isSA() ? `<button class="btn bg btn-sm" onclick="EMPS.resetPwdDlg(${e.id})">🔑</button>
          <button class="btn bg btn-sm" onclick="EMPS.del(${e.id})">🗑️</button>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');
  },

  _modal() {
    return `
    <div class="modal" id="modal-emp">
      <div class="mbox">
        <div class="mh"><h3 id="empmt">➕ Новый сотрудник</h3><button class="mc" onclick="UI.closeModal('modal-emp')">✕</button></div>
        <div class="mb">
          <div class="g2">
            <div class="fg" style="grid-column:span 2"><label>ФИО *</label><input type="text" id="e_nm" placeholder="Иванов Иван Иванович"></div>
            <div class="fg" style="grid-column:span 2" id="e_email_wrap">
              <label>Email * (логин для входа)</label><input type="email" id="e_email" placeholder="ivanov@vlavashe.ru">
            </div>
            <div class="fg hidden" id="e_pass_wrap" style="grid-column:span 2">
              <label>Временный пароль *</label><input type="text" id="e_pass" placeholder="Минимум 6 символов">
              <div style="font-size:10px;color:var(--muted2);margin-top:3px">Сотрудник сможет сменить пароль после входа</div>
            </div>
            <div class="fg"><label>Должность</label><input type="text" id="e_pos" placeholder="Повар"></div>
            <div class="fg"><label>Роль в системе</label>
              <select id="e_role">
                <option value="staff">Сотрудник (только печать)</option>
                <option value="admin">Администратор</option>
                ${S.isSA() ? '<option value="superadmin">Суперадмин</option>' : ''}
              </select>
            </div>
            <div class="fg"><label>Цех / Отдел</label><select id="e_dep"><option value="">— не выбран —</option></select></div>
            <div class="fg"><label>Телефон</label><input type="tel" id="e_ph" placeholder="+7 900 000-00-00"></div>
            <div class="fg"><label>Telegram</label><input type="text" id="e_tg" placeholder="@username"></div>
            <div class="fg"><label>Медкнижка действительна до</label><input type="date" id="e_med"></div>
          </div>
        </div>
        <div class="mf"><button class="btn bg" onclick="UI.closeModal('modal-emp')">Отмена</button><button class="btn bp" onclick="EMPS.save()">💾 Сохранить</button></div>
      </div>
    </div>
    <div class="modal" id="modal-emp-pwd">
      <div class="mbox msm">
        <div class="mh"><h3>🔑 Сброс пароля</h3><button class="mc" onclick="UI.closeModal('modal-emp-pwd')">✕</button></div>
        <div class="mb">
          <p style="font-size:11px;color:var(--muted2);margin-bottom:12px" id="empPwdFor"></p>
          <p style="font-size:11px;color:var(--muted2);line-height:1.6">
            На почту сотрудника будет отправлена ссылка для установки нового пароля.
          </p>
        </div>
        <div class="mf"><button class="btn bg" onclick="UI.closeModal('modal-emp-pwd')">Отмена</button><button class="btn bp" onclick="EMPS.doResetPwd()">📧 Отправить ссылку</button></div>
      </div>
    </div>`;
  },

  async openModal(id) {
    if (!S.canEdit()) { UI.toast('Нет прав', 'err'); return; }
    S.eEmp = id || null;
    document.getElementById('empmt').textContent = id ? '✏️ Редактировать сотрудника' : '➕ Новый сотрудник';

    // Fill department dropdown
    await DEPTS.load();
    const depSel = document.getElementById('e_dep');
    depSel.innerHTML = '<option value="">— не выбран —</option>' +
      DEPTS._list.filter(d => d.active).map(d => `<option value="${d.name}">${d.name}</option>`).join('');

    const e = id ? S.emps.find(x => x.id === id) : {};
    document.getElementById('e_nm').value    = e?.name  || '';
    document.getElementById('e_pos').value   = e?.pos   || '';
    document.getElementById('e_ph').value    = e?.ph    || '';
    document.getElementById('e_tg').value    = e?.tg    || '';
    document.getElementById('e_dep').value   = e?.dep   || '';
    document.getElementById('e_med').value   = e?.med   || '';
    document.getElementById('e_role').value  = e?.role  || 'staff';

    const emailWrap = document.getElementById('e_email_wrap');
    const passWrap  = document.getElementById('e_pass_wrap');
    if (id) {
      // Editing existing — email is fixed, no password field
      document.getElementById('e_email').value = e?.email || '';
      document.getElementById('e_email').disabled = true;
      emailWrap.style.opacity = '.6';
      passWrap.classList.add('hidden');
    } else {
      document.getElementById('e_email').value = '';
      document.getElementById('e_email').disabled = false;
      emailWrap.style.opacity = '1';
      passWrap.classList.remove('hidden');
      document.getElementById('e_pass').value = '';
    }
    UI.openModal('modal-emp');
  },

  async save() {
    const nm = document.getElementById('e_nm').value.trim();
    if (!nm) { UI.toast('Введите ФИО', 'err'); return; }

    const fields = {
      pos:  document.getElementById('e_pos').value,
      role: document.getElementById('e_role').value,
      ph:   document.getElementById('e_ph').value,
      tg:   document.getElementById('e_tg').value,
      dep:  document.getElementById('e_dep').value,
      med:  document.getElementById('e_med').value || null
    };

    if (S.eEmp) {
      // ---- UPDATE existing profile ----
      try {
        await SB.upsertProfile({
          id: S.eEmp, name: nm,
          role: fields.role, position: fields.pos, dept: fields.dep,
          phone: fields.ph, tg: fields.tg, med_book_date: fields.med
        });
        logAct('Обновлён сотрудник', S.ses?.name, nm, 'employee', S.eEmp);
        UI.toast('✅ Обновлено');
        UI.closeModal('modal-emp');
        await this._reload();
      } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
      return;
    }

    // ---- CREATE new account ----
    const email = document.getElementById('e_email').value.trim();
    const pass  = document.getElementById('e_pass').value;
    if (!email)            { UI.toast('Введите email', 'err'); return; }
    if (!pass || pass.length < 6) { UI.toast('Пароль минимум 6 символов', 'err'); return; }

    const r = await AUTH.register({
      email, password: pass, name: nm,
      role: fields.role, position: fields.pos, dept: fields.dep,
      phone: fields.ph, tg: fields.tg, medBook: fields.med
    });
    UI.toast(r.msg, r.ok ? 'ok' : 'err');
    if (r.ok) { UI.closeModal('modal-emp'); await this._reload(); }
  },

  async toggle(id) {
    const e = S.emps.find(x => x.id === id);
    const newActive = e.st === 'arc';  // currently archived → activate
    try {
      await SB.upsertProfile({ id, active: newActive });
      logAct(newActive ? 'Восстановлен сотрудник' : 'Заблокирован сотрудник', S.ses?.name, e.name, 'employee', id);
      UI.toast(newActive ? '♻️ Восстановлен' : '📦 Заблокирован');
      await this._reload();
    } catch(e2) { UI.toast('❌ ' + e2.message, 'err'); }
  },

  async del(id) {
    if (!S.isSA()) { UI.toast('Только Суперадмин', 'err'); return; }
    if (!UI.confirm('Удалить профиль сотрудника? Аккаунт входа останется, но потеряет доступ.')) return;
    const e = S.emps.find(x => x.id === id);
    try {
      await SB.remove('profiles', id);
      logAct('Удалён профиль сотрудника', S.ses?.name, e?.name||'', 'employee', id);
      UI.toast('🗑️ Удалён');
      await this._reload();
    } catch(err) { UI.toast('❌ ' + err.message, 'err'); }
  },

  resetPwdDlg(id) {
    this._resetTarget = id;
    const e = S.emps.find(x => x.id === id) || {};
    const el = document.getElementById('empPwdFor');
    if (el) el.textContent = `Сотрудник: ${e.name} (${e.email||'—'})`;
    UI.openModal('modal-emp-pwd');
  },

  async doResetPwd() {
    const e = S.emps.find(x => x.id === this._resetTarget);
    if (!e?.email) { UI.toast('Email не найден', 'err'); return; }
    try {
      const { error } = await SB.client.auth.resetPasswordForEmail(e.email, {
        redirectTo: window.location.origin + window.location.pathname
      });
      if (error) throw error;
      logAct('Запрошен сброс пароля', S.ses?.name, e.email, 'employee', e.id);
      UI.toast('📧 Ссылка отправлена на ' + e.email);
      UI.closeModal('modal-emp-pwd');
    } catch(err) { UI.toast('❌ ' + err.message, 'err'); }
  },

  /** Re-fetch profiles from Supabase and re-render */
  async _reload() {
    try {
      const rows = await SB.getAll('profiles');
      S.emps = (rows||[]).filter(p => p.id !== S.ses?.id).map(p => ({
        id:p.id, name:p.name, role:p.role, pos:p.position,
        dep:p.dept, ph:p.phone, tg:p.tg, med:p.med_book_date,
        email:p.email, st:p.active===false?'arc':'active', avatar:p.avatar_url
      }));
    } catch(e) { console.error('Employees reload error:', e); }
    this._renderGrid();
  }
};

