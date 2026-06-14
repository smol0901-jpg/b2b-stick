/* === auth_sb.js — Supabase Auth (replaces local auth.js when SB.ready) === */
const AUTH = {

  /* ---- LOGIN via Supabase email ---- */
  async login() {
    const emailOrPhone = document.getElementById('lu').value.trim();
    const pass         = document.getElementById('lp').value;

    if (!emailOrPhone || !pass) { UI.toast('Введите email и пароль', 'err'); return; }

    // Show loader
    const btn = document.querySelector('.lbtn');
    if (btn) { btn.textContent = '⏳ Вход...'; btn.disabled = true; }

    try {
      // Determine if email or phone format
      const isEmail = emailOrPhone.includes('@');
      let session, user;

      if (isEmail) {
        const res = await SB.signIn(emailOrPhone, pass);
        session = res.session;
        user    = res.user;
      } else {
        // Phone: use phone auth (requires Twilio in Supabase, fallback to email)
        UI.toast('Введите email для входа', 'err');
        if (btn) { btn.textContent = '→ ВОЙТИ'; btn.disabled = false; }
        return;
      }

      if (!user) throw new Error('Нет данных пользователя');

      // Load profile
      const profile = await SB.getProfile(user.id);
      if (!profile) throw new Error('Профиль не найден. Обратитесь к администратору.');
      if (profile.active === false) throw new Error('Аккаунт заблокирован.');

      // Set session
      S.ses = {
        id:       user.id,
        email:    user.email,
        name:     profile.name,
        role:     profile.role,
        position: profile.position,
        dept:     profile.dept,
        avatar:   profile.avatar_url,
        orgId:    profile.org_id
      };

      // Load all data from Supabase
      await APP.loadFromSupabase();

      // Show app
      this._showApp();
      logAct('Вход в систему', S.ses.name, S.ses.role);
      await SB.logActivity('Вход в систему', user.id, S.ses.role);

    } catch(e) {
      UI.toast('❌ ' + (e.message || 'Ошибка входа'), 'err');
    } finally {
      if (btn) { btn.textContent = '→ ВОЙТИ'; btn.disabled = false; }
    }
  },

  async logout() {
    if (S.ses) logAct('Выход', S.ses.name);
    await SB.signOut();
    S.ses = null;
    location.reload();
  },

  _showApp() {
    document.getElementById('login').style.display  = 'none';
    document.getElementById('hdr').style.display    = 'flex';
    document.getElementById('nav').style.display    = 'flex';
    document.getElementById('app').style.display    = 'block';

    const rm = RMAP[S.ses.role] || RMAP.staff;
    const rt = document.getElementById('rtag');
    rt.textContent = rm.lb;
    rt.className   = 'hdr-role ' + rm.cls;
    document.getElementById('utag').textContent = S.ses.name;

    if (S.ses.role === 'staff') {
      // Скрываем все админ-страницы от staff
      ['nav-sett','nav-ai','nav-mats','nav-emps','nav-tmpls','nav-cons','nav-depts','nav-jour','nav-hist','nav-reqs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    } else {
      // Админу показываем заявки (у суперадмина тоже)
      const reqs = document.getElementById('nav-reqs');
      if (reqs) reqs.style.display = '';
    } else {
      // Admins/superadmins print directly — hide the staff-oriented FAB
      const fab = document.getElementById('fab-print');
      if (fab) fab.style.display = 'none';
    }

    NAV.go('dash');
    AI_MOD.updStatus();
    TG_MOD.updStatus();
    setInterval(() => ALERTS.checkExpiry(), 60000);
    setInterval(() => ALERTS.dailyReport(), 3600000);
  },

  /* ---- CHANGE PASSWORD ---- */
  async changePassword(oldPass, newPass, confirmPass) {
    if (newPass.length < 4)       return { ok:false, msg:'Минимум 4 символа' };
    if (newPass !== confirmPass)   return { ok:false, msg:'Пароли не совпадают' };
    try {
      // Re-authenticate to verify old password
      await SB.signIn(S.ses.email, oldPass);
      const { error } = await SB.client.auth.updateUser({ password: newPass });
      if (error) throw error;
      logAct('Смена пароля', S.ses.name);
      return { ok:true, msg:'✅ Пароль изменён' };
    } catch(e) { return { ok:false, msg: e.message || 'Ошибка' }; }
  },

  /* ---- RESET PASSWORD (superadmin sends reset email) ---- */
  async resetPassword(userId, newPass) {
    if (!S.isSA()) return { ok:false, msg:'Только Суперадмин' };
    try {
      const usr = S.emps?.find(u => u.id === userId);
      if (!usr?.email) return { ok:false, msg:'Email пользователя не найден' };
      const { error } = await SB.client.auth.resetPasswordForEmail(usr.email, {
        redirectTo: window.location.origin + window.location.pathname
      });
      if (error) throw error;
      logAct('Отправлен reset пароля', S.ses.name, usr.email, 'employee', userId);
      return { ok:true, msg:'✅ Письмо с ссылкой отправлено на ' + usr.email };
    } catch(e) { return { ok:false, msg: e.message }; }
  },

  /* ---- REGISTER (admin creates new employee account) ---- */
  async register({ email, password, name, role, position, dept, phone, tg, medBook }) {
    if (!S.canEdit()) return { ok:false, msg:'Нет прав' };
    if (role === 'superadmin' && !S.isSA()) return { ok:false, msg:'Только Суперадмин может назначать роль Суперадмин' };
    try {
      const res = await SB.signUp(email, password, { name, role });
      if (!res.user) throw new Error('Не удалось создать аккаунт');

      // Create profile
      await SB.upsertProfile({
        id:            res.user.id,
        name, role, email,
        position:      position || '',
        dept:          dept     || '',
        phone:         phone    || '',
        tg:            tg       || '',
        med_book_date: medBook  || null,
        active:        true,
        org_id:        S.ses?.orgId || 'vlavashe'
      });

      await SB.logActivity('Создан аккаунт сотрудника', S.ses.id, email, 'employee', res.user.id);
      return { ok:true, msg:'✅ Аккаунт создан. Письмо отправлено на ' + email };
    } catch(e) { return { ok:false, msg: e.message }; }
  },

  /* ---- TOGGLE ACTIVE ---- */
  async toggleActive(userId) {
    if (!S.isSA()) return;
    const profile = await SB.getProfile(userId);
    await SB.upsertProfile({ id: userId, active: !profile?.active });
    logAct(profile?.active ? 'Заблокирован сотрудник' : 'Разблокирован сотрудник', S.ses.name, profile?.name||'', 'employee', userId);
  },

  async changeRole(userId, role) {
    if (!S.isSA()) return;
    if (userId === S.ses?.id) { UI.toast('Нельзя менять свою роль', 'err'); return; }
    await SB.upsertProfile({ id: userId, role });
    logAct('Смена роли → ' + role, S.ses.name, '', 'employee', userId);
  },

  strength(p) {
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-ZА-ЯЁ]/.test(p) && /[a-zа-яё]/.test(p)) s++;
    if (/\d/.test(p) && /[^a-zA-Zа-яёА-ЯЁ0-9]/.test(p)) s++;
    return s;
  }
};
