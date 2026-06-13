/* === settings.js — Настройки (Supabase-backed) === */
const SETT = {
  _persistTimer: null,

  render() {
    const pg = document.getElementById('pg-sett');
    pg.innerHTML = `
      <div class="sh"><span class="st">⚙️ Настройки системы</span></div>
      <div class="sgrid">
        <div class="snav" id="snav">
          <div class="sni on"  onclick="SETT.tab('org')"     >🏢 Организация</div>
          <div class="sni"     onclick="SETT.tab('roles')"   >🔐 Роли & Доступ</div>
          <div class="sni"     onclick="SETT.tab('profile')" >👤 Мой профиль</div>
          <div class="sni"     onclick="SETT.tab('labels')"  >🏷️ Этикетки</div>
          <div class="sni"     onclick="SETT.tab('logos')"   >🖼️ Логотипы</div>
          <div class="sni"     onclick="SETT.tab('haccp')"   >🛡️ ХАССП</div>
          <div class="sni"     onclick="SETT.tab('data')"    >💾 Данные & Бэкап</div>
          <div class="sni"     onclick="SETT.tab('about')"   >ℹ️ О программе</div>
        </div>
        <div class="scnt" id="scnt"></div>
      </div>`;
    this.tab(S.settTab || 'org');
  },

  tab(name) {
    S.settTab = name;
    document.querySelectorAll('.sni').forEach((el, i) => {
      const tabs = ['org','roles','profile','labels','logos','haccp','data','about'];
      el.classList.toggle('on', tabs[i] === name);
    });
    const c  = document.getElementById('scnt');
    const ss = S.sett;
    const fi = (id, lbl, val, cb, type='text') =>
      `<div class="fg mb8"><label>${lbl}</label><input type="${type}" id="${id}" value="${(val||'').toString().replace(/"/g,'&quot;')}" oninput="${cb}"></div>`;

    switch(name) {

      /* ---- ОРГАНИЗАЦИЯ ---- */
      case 'org':
        c.innerHTML = `
          <div class="ssec">
            <div class="ssect">🏢 Организация</div>
            ${S.canEdit() ? '' : `<p style="font-size:11px;color:var(--muted2);margin-bottom:10px">Только просмотр — изменения доступны Админу/Суперадмину</p>`}
            ${fi('s_org',  'Полное название',           ss.org,    S.canEdit() ? "S.sett.org=this.value;SETT.persist()" : '')}
            ${fi('s_sh',   'Краткое (для этикеток)',    ss.orgSh,  S.canEdit() ? "S.sett.orgSh=this.value;SETT.persist()" : '')}
            ${fi('s_inn',  'ИНН',                       ss.inn,    S.canEdit() ? "S.sett.inn=this.value;SETT.persist()" : '')}
            ${fi('s_addr', 'Адрес производства',        ss.addr,   S.canEdit() ? "S.sett.addr=this.value;SETT.persist()" : '')}
            ${fi('s_email','E-mail организации',        ss.email,  S.canEdit() ? "S.sett.email=this.value;SETT.persist()" : '', 'email')}
          </div>`;
        if (!S.canEdit()) {
          c.querySelectorAll('input').forEach(i => i.disabled = true);
        }
        break;

      /* ---- РОЛИ ---- */
      case 'roles': {
        const allPeople = [
          { id: S.ses?.id, name: S.ses?.name, email: S.ses?.email, role: S.ses?.role, active: true, _self: true },
          ...S.emps
        ];
        c.innerHTML = `
          <div class="ssec">
            <div class="ssect">🔐 Роли пользователей</div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
              <div class="fx gap8 aic"><span class="bdg b-g">SUPERADMIN</span><span style="font-size:11px;color:var(--muted2)">Полный доступ. Настройки, роли, удаление, очистка логов.</span></div>
              <div class="fx gap8 aic"><span class="bdg b-p">ADMIN</span><span style="font-size:11px;color:var(--muted2)">Управление номенклатурой, сотрудниками, шаблонами, цехами.</span></div>
              <div class="fx gap8 aic"><span class="bdg b-a">STAFF</span><span style="font-size:11px;color:var(--muted2)">Только выбор и печать. Без редактирования каких-либо данных.</span></div>
            </div>
            <table class="tbl" style="width:100%">
              <thead><tr>
                <th>Имя</th><th>Email</th><th>Роль</th><th>Статус</th>
                ${S.isSA() ? '<th>Действия</th>' : ''}
              </tr></thead>
              <tbody>${allPeople.map(u => `
                <tr>
                  <td>${u.name}${u._self ? ' <span class="bdg b-a">ВЫ</span>' : ''}</td>
                  <td style="font-size:11px;color:var(--muted2)">${u.email||'—'}</td>
                  <td><span class="bdg ${RMAP[u.role]?.bcls||'b-m'}">${RMAP[u.role]?.lb||u.role}</span></td>
                  <td><span class="bdg ${u.active!==false&&u.st!=='arc'?'b-ok':'b-no'}">${u.active!==false&&u.st!=='arc'?'АКТИВЕН':'БЛОК'}</span></td>
                  ${S.isSA() && !u._self ? `<td>
                    <div class="fx gap4">
                      <select onchange="AUTH.changeRole('${u.id}',this.value).then(()=>SETT.tab('roles'))"
                        class="sel-inline" style="font-size:10px">
                        <option value="staff"      ${u.role==='staff'      ?'selected':''}>staff</option>
                        <option value="admin"      ${u.role==='admin'      ?'selected':''}>admin</option>
                        <option value="superadmin" ${u.role==='superadmin' ?'selected':''}>superadmin</option>
                      </select>
                      <button class="btn bg btn-sm" onclick="AUTH.toggleActive('${u.id}').then(()=>SETT.tab('roles'))"
                        title="${u.active!==false&&u.st!=='arc'?'Заблокировать':'Разблокировать'}">
                        ${u.active!==false&&u.st!=='arc'?'🔒':'🔓'}
                      </button>
                      <button class="btn bg btn-sm" onclick="SETT.resetPwdDlg('${u.id}')" title="Сбросить пароль">🔑</button>
                    </div>
                  </td>` : (S.isSA() ? '<td></td>' : '')}
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${this._resetPwdModal()}`;
        break;
      }

      /* ---- МОЙ ПРОФИЛЬ ---- */
      case 'profile':
        c.innerHTML = `
          <div class="ssec">
            <div class="ssect">👤 Мой профиль</div>
            <div class="profile-card">
              <div class="fx gap12 aic mb12">
                <div class="avatar-big" id="avatarBig">
                  ${S.ses?.avatar ? `<img src="${S.ses.avatar}">` : '👤'}
                </div>
                <div>
                  <div style="font-size:16px;font-weight:700">${S.ses?.name||'—'}</div>
                  <div style="margin-top:4px"><span class="bdg ${RMAP[S.ses?.role]?.bcls||'b-m'}">${RMAP[S.ses?.role]?.lb||'—'}</span></div>
                  <div style="font-size:11px;color:var(--muted2);margin-top:4px">Email: <span class="mono">${S.ses?.email||'—'}</span></div>
                  ${S.ses?.position ? `<div style="font-size:11px;color:var(--muted2);margin-top:2px">${S.ses.position}${S.ses.dept?' · '+S.ses.dept:''}</div>` : ''}
                </div>
              </div>
              <button class="btn bg btn-sm mb12" onclick="document.getElementById('avatarFile').click()">📷 Сменить аватар</button>
              <input type="file" id="avatarFile" accept="image/*" style="display:none" onchange="SETT.loadAvatar(event)">
              <hr style="border-color:var(--border);margin:12px 0">
              <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">🔑 Смена пароля</div>
              <div class="fg mb8"><label>Текущий пароль</label><input type="password" id="pw_old" placeholder="••••"></div>
              <div class="fg mb8">
                <label>Новый пароль</label>
                <input type="password" id="pw_new" placeholder="Минимум 6 символов" oninput="SETT.checkStrength()">
                <div class="pass-strength" id="passBar" style="background:var(--border)"></div>
                <span id="passHint" style="font-size:10px;color:var(--muted2)"></span>
              </div>
              <div class="fg mb12"><label>Повторите пароль</label><input type="password" id="pw_conf" placeholder="••••"></div>
              <button class="btn bp w100" onclick="SETT.changePass()">🔑 Изменить пароль</button>
            </div>
          </div>`;
        break;

      /* ---- ЭТИКЕТКИ ---- */
      case 'labels':
        c.innerHTML = `
          <div class="ssec">
            <div class="ssect">🏷️ Настройки этикеток</div>
            ${!S.canEdit() ? `<p style="font-size:11px;color:var(--muted2);margin-bottom:10px">Только просмотр</p>` : ''}
            <div class="fg mb8"><label>Шаблон по умолчанию</label>
              <select ${S.canEdit() ? `onchange="S.sett.defaultTmpl=this.value;SETT.persist()"` : 'disabled'} class="sel-inline" style="font-size:12px;padding:6px 9px;width:100%">
                ${S.tmpls.map(t => `<option value="${t.id}" ${ss.defaultTmpl===t.id?'selected':''}>${t.name}</option>`).join('')}
              </select>
            </div>
            <div class="fg mb8"><label>Ориентация печати по умолчанию</label>
              <select ${S.canEdit() ? `onchange="S.sett.defaultOri=this.value;SETT.persist()"` : 'disabled'} class="sel-inline" style="font-size:12px;padding:6px 9px;width:100%">
                <option value="portrait"  ${ss.defaultOri!=='landscape'?'selected':''}>Книжная (Portrait)</option>
                <option value="landscape" ${ss.defaultOri==='landscape' ?'selected':''}>Альбомная (Landscape)</option>
              </select>
            </div>
            <div class="srow">
              <div class="srow-info"><div class="srow-label">QR-код на этикетке</div><div class="srow-desc">Автоматически добавлять QR с данными</div></div>
              <input type="checkbox" ${ss.showQR!==false?'checked':''} ${S.canEdit() ? `onchange="S.sett.showQR=this.checked;SETT.persist()"` : 'disabled'} style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer">
            </div>
            <div class="srow">
              <div class="srow-info"><div class="srow-label">Авто-партия</div><div class="srow-desc">Генерировать номер партии автоматически</div></div>
              <input type="checkbox" ${ss.autoBatch?'checked':''} ${S.canEdit() ? `onchange="S.sett.autoBatch=this.checked;SETT.persist()"` : 'disabled'} style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer">
            </div>
          </div>`;
        break;

      /* ---- ЛОГОТИПЫ ---- */
      case 'logos':
        c.innerHTML = `
          <div class="ssec">
            <div class="ssect">🖼️ Глобальный логотип</div>
            <p style="font-size:11px;color:var(--muted2);margin-bottom:12px;line-height:1.7">
              Используется в шаблонах с блоком «Лого». Можно переопределить в каждом шаблоне отдельно.
            </p>
            ${S.canEdit() ? `
            <div class="lzone ${S.logos.global?'has':''}" onclick="document.getElementById('lgf').click()" style="max-width:280px">
              ${S.logos.global
                ? `<img src="${S.logos.global}"><div style="font-size:10px;color:var(--muted2);margin-top:5px">Нажмите для замены</div>`
                : '📷 Загрузить глобальный логотип'}
            </div>
            <input type="file" id="lgf" accept="image/*" style="display:none" onchange="SETT.loadLogo(event)">
            <div class="fx gap6 mt8">
              ${S.logos.global ? `<button class="btn bg btn-sm" onclick="SETT.removeLogo()">✕ Удалить</button>` : ''}
              <button class="btn bg btn-sm" onclick="document.getElementById('lgf').click()">📷 Загрузить</button>
            </div>` : `
            <div class="lzone" style="max-width:280px;cursor:default">
              ${S.logos.global ? `<img src="${S.logos.global}">` : 'Логотип не загружен'}
            </div>`}
          </div>`;
        break;

      /* ---- ХАССП ---- */
      case 'haccp':
        c.innerHTML = `
          <div class="ssec">
            <div class="ssect">🛡️ Настройки ХАССП</div>
            ${!S.canEdit() ? `<p style="font-size:11px;color:var(--muted2);margin-bottom:10px">Только просмотр</p>` : ''}
            <div class="srow">
              <div class="srow-info"><div class="srow-label">Модуль ХАССП активен</div><div class="srow-desc">Контроль критических точек на этикетках</div></div>
              <input type="checkbox" ${ss.haccp?'checked':''} ${S.canEdit() ? `onchange="S.sett.haccp=this.checked;SETT.persist()"` : 'disabled'} style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer">
            </div>
            <div class="fg mt12 mb8"><label>Стандарт</label>
              <select ${S.canEdit() ? `onchange="S.sett.haccpStd=this.value;SETT.persist()"` : 'disabled'} class="sel-inline" style="font-size:12px;padding:6px 9px;width:100%">
                <option value="trts022" ${ss.haccpStd==='trts022'?'selected':''}>ТР ТС 022/2011 (Россия)</option>
                <option value="trts021" ${ss.haccpStd==='trts021'?'selected':''}>ТР ТС 021/2011 (Безопасность пищевой продукции)</option>
                <option value="codex"   ${ss.haccpStd==='codex'  ?'selected':''}>Codex Alimentarius</option>
                <option value="iso22000" ${ss.haccpStd==='iso22000'?'selected':''}>ISO 22000</option>
                <option value="custom"  ${ss.haccpStd==='custom' ?'selected':''}>Свой стандарт</option>
              </select>
            </div>
            <div class="fg mb8"><label>Предупреждение по умолчанию на этикетке</label>
              <input id="s_hwarn" value="${(ss.haccpWarn||'').replace(/"/g,'&quot;')}" ${S.canEdit() ? `oninput="S.sett.haccpWarn=this.value;SETT.persist()"` : 'disabled'}>
            </div>
            <div class="fg mb8"><label>Порог истечения срока (дней для предупреждения)</label>
              <input type="number" id="s_hdays" value="${ss.haccpDays||3}" min="1" max="30"
                ${S.canEdit() ? `oninput="S.sett.haccpDays=parseInt(this.value)||3;SETT.persist()"` : 'disabled'}>
            </div>
          </div>`;
        break;

      /* ---- ДАННЫЕ ---- */
      case 'data':
        c.innerHTML = `
          <div class="ssec">
            <div class="ssect">💾 Данные & Бэкап</div>
            ${S.isSA() ? `
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
              <button class="btn bp" onclick="DATA.exportAll()">📤 Полный бэкап (JSON)</button>
            </div>` : `<p style="font-size:11px;color:var(--muted2);margin-bottom:16px">Экспорт бэкапа доступен Суперадмину</p>`}
            <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px;font-size:11px;color:var(--muted2);line-height:2;margin-bottom:16px">
              Хранилище: <b style="color:var(--accent)">Supabase (PostgreSQL, общая база)</b><br>
              Сырьё: <b>${S.mats.length}</b> записей &nbsp;·&nbsp;
              Сотрудники: <b>${S.emps.length + 1}</b> &nbsp;·&nbsp;
              Шаблоны: <b>${S.tmpls.length}</b>
            </div>
            ${S.isSA() ? `
            <div style="border-top:1px solid var(--border);padding-top:14px">
              <div style="font-size:12px;font-weight:700;color:var(--danger);margin-bottom:8px">⚠️ Опасная зона</div>
              <p style="font-size:11px;color:var(--muted2);margin-bottom:10px;line-height:1.7">
                Очистка истории операций и очереди печати доступна в разделе
                <a href="#" onclick="NAV.go('hist')" style="color:var(--accent)">📋 История → 🧹 Очистка</a>.
              </p>
            </div>` : '<div style="font-size:11px;color:var(--muted2)">Управление данными доступно только Суперадмину</div>'}
          </div>`;
        break;

      /* ---- О ПРОГРАММЕ ---- */
      case 'about':
        c.innerHTML = `
          <div class="ssec">
            <div class="ssect">ℹ️ О программе</div>
            <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:22px">
              <div style="font-family:var(--ff);font-size:20px;font-weight:700;color:var(--accent);text-shadow:0 0 20px rgba(0,212,255,.5);margin-bottom:8px">
                NEURAL<span style="color:var(--neon)">LABEL</span> PRO v2.0
              </div>
              <div style="font-size:11px;color:var(--muted2);line-height:2">
                Система управления этикетками для пищевых производств<br>
                Разработка: <span style="color:var(--accent)">ASV_PROD</span> · NEURAL_ARCHITECT_PREMIUM++<br>
                Telegram: <span style="color:var(--neon)">@ASV_prod</span> &nbsp;·&nbsp; GitHub: <span style="color:var(--neon)">smol0901-jpg</span><br>
                <br>
                ✅ ХАССП ТР ТС 022/2011 &nbsp;·&nbsp; ✅ Роли: SA / Admin / Staff<br>
                ✅ Вся база на Supabase (номенклатура, сотрудники, журналы, история)<br>
                ✅ Realtime синхронизация между всеми устройствами<br>
                ✅ Конструктор шаблонов + логотипы &nbsp;·&nbsp; ✅ QR-коды<br>
                ✅ Очередь печати с подтверждением &nbsp;·&nbsp; ✅ ZPL Zebra экспорт<br>
                ✅ Журналы ХАССП (температурный, уборка, дезинфекция)<br>
                ✅ Цеха и отделы &nbsp;·&nbsp; ✅ QR-сканер &nbsp;·&nbsp; ✅ История операций<br>
                ✅ Регистрация сотрудников по email &nbsp;·&nbsp; ✅ Сброс паролей<br>
                ✅ GitHub Pages (фронтенд) + Supabase (база данных)
              </div>
              <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-size:10px;color:var(--muted2);font-family:var(--ff)">
                Build: ${new Date().getFullYear()} &nbsp;·&nbsp; Org: ${S.ses?.orgId||'vlavashe'}
              </div>
            </div>
          </div>`;
        break;
    }
  },

  /* ---- PERSIST settings (debounced write to Supabase) ---- */
  persist() {
    if (!S.canEdit()) return;
    clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(async () => {
      try {
        await SB.updateSettings(S.ses?.orgId || 'vlavashe', S.sett, null);
        logAct('Изменены настройки', S.ses?.name, S.settTab, 'system');
      } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
    }, 500);
  },

  /* ---- helpers ---- */
  checkStrength() {
    const p    = document.getElementById('pw_new')?.value || '';
    const s    = AUTH.strength(p);
    const bar  = document.getElementById('passBar');
    const hint = document.getElementById('passHint');
    const colors = ['var(--border)','var(--danger)','var(--warn)','var(--warn)','var(--success)'];
    const labels = ['','Очень слабый','Слабый','Средний','Надёжный'];
    if (bar)  { bar.style.width = (s * 25) + '%'; bar.style.background = colors[s]; bar.style.height = '4px'; }
    if (hint) { hint.textContent = labels[s]; hint.style.color = colors[s]; }
  },

  async changePass() {
    const old  = document.getElementById('pw_old')?.value  || '';
    const np   = document.getElementById('pw_new')?.value  || '';
    const conf = document.getElementById('pw_conf')?.value || '';
    const r    = await AUTH.changePassword(old, np, conf);
    UI.toast(r.msg, r.ok ? 'ok' : 'err');
    if (r.ok) {
      document.getElementById('pw_old').value  = '';
      document.getElementById('pw_new').value  = '';
      document.getElementById('pw_conf').value = '';
      document.getElementById('passBar').style.width = '0';
      document.getElementById('passHint').textContent = '';
    }
  },

  async loadLogo(ev) {
    if (!S.canEdit()) return;
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async e => {
      S.logos.global = e.target.result;
      try {
        await SB.updateSettings(S.ses?.orgId || 'vlavashe', null, S.logos);
        this.tab('logos');
        UI.toast('🖼️ Логотип сохранён');
        logAct('Изменён глобальный логотип', S.ses?.name, '', 'system');
      } catch(err) { UI.toast('❌ ' + err.message, 'err'); }
    };
    r.readAsDataURL(f);
  },

  async removeLogo() {
    if (!S.canEdit()) return;
    S.logos.global = null;
    try {
      await SB.updateSettings(S.ses?.orgId || 'vlavashe', null, S.logos);
      this.tab('logos');
      UI.toast('Логотип удалён');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  },

  async loadAvatar(ev) {
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async e => {
      try {
        await SB.upsertProfile({ id: S.ses.id, avatar_url: e.target.result });
        S.ses.avatar = e.target.result;
        this.tab('profile');
        UI.toast('📷 Аватар обновлён');
        logAct('Изменён аватар', S.ses?.name, '', 'employee', S.ses.id);
      } catch(err) { UI.toast('❌ ' + err.message, 'err'); }
    };
    r.readAsDataURL(f);
  },

  _resetPwdModal() {
    return `
    <div class="modal" id="modal-reset-pwd">
      <div class="mbox msm">
        <div class="mh"><h3>🔑 Сброс пароля</h3><button class="mc" onclick="UI.closeModal('modal-reset-pwd')">✕</button></div>
        <div class="mb">
          <p id="rp_for" style="font-size:11px;color:var(--muted2);margin-bottom:12px;line-height:1.6"></p>
          <p style="font-size:11px;color:var(--muted2);line-height:1.6">
            На email пользователя будет отправлена ссылка для установки нового пароля.
          </p>
        </div>
        <div class="mf">
          <button class="btn bg" onclick="UI.closeModal('modal-reset-pwd')">Отмена</button>
          <button class="btn bp" onclick="SETT.doResetPwd()">📧 Отправить ссылку</button>
        </div>
      </div>
    </div>`;
  },

  resetPwdDlg(uid) {
    this._rpTarget = uid;
    const usr = S.emps.find(x => x.id === uid) || {};
    const el  = document.getElementById('rp_for');
    if (el) el.textContent = `Пользователь: ${usr.name} (${usr.email||'—'})`;
    UI.openModal('modal-reset-pwd');
  },

  async doResetPwd() {
    const usr = S.emps.find(x => x.id === this._rpTarget);
    if (!usr?.email) { UI.toast('Email не найден', 'err'); return; }
    try {
      const { error } = await SB.client.auth.resetPasswordForEmail(usr.email, {
        redirectTo: window.location.origin + window.location.pathname
      });
      if (error) throw error;
      logAct('Запрошен сброс пароля', S.ses?.name, usr.email, 'employee', usr.id);
      UI.toast('📧 Ссылка отправлена на ' + usr.email);
      UI.closeModal('modal-reset-pwd');
    } catch(e) { UI.toast('❌ ' + e.message, 'err'); }
  }
};
