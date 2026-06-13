# Supabase + GitHub Pages — настройка за 15 минут

## Шаг 1: Создать проект Supabase

1. **supabase.com** → Sign Up / Login → New Project
2. Введи название, пароль БД, регион (EU West — ближе всего к РФ)
3. Подожди ~2 минуты

## Шаг 2: Выполнить полную схему БД

1. Dashboard → **SQL Editor** → New Query
2. Открой файл **`supabase_schema.sql`** (в корне проекта) — скопируй **весь** файл
3. Вставь и нажми **Run**

Это создаст:
- `profiles` — сотрудники и роли
- `departments` — цеха (с базовым набором: Горячий, Холодный, Кондитерский, Склад и т.д.)
- `materials` — номенклатура сырья
- `templates` — шаблоны этикеток (+ 3 системных)
- `print_queue` — очередь печати
- `activity` — история операций
- `settings` — настройки организации
- `journals` + `journal_entries` — журналы ХАССП (температурный, уборка, дезинфекция)
- все RLS-политики и индексы для быстрого поиска

## Шаг 3: Проверить Realtime

Database → Replication — должны быть включены:
`materials`, `templates`, `print_queue`, `profiles`, `activity`, `journal_entries`

(Схема уже включает их через `alter publication`, но проверь визуально)

## Шаг 4: Вставить ключи в приложение

Settings → API:
- `Project URL`
- `anon public` key

Открой `js/supabase.js`, строки 8–9:
```js
const SUPABASE_URL  = 'https://ТВОЙ_ПРОЕКТ.supabase.co';
const SUPABASE_ANON = 'ТВОЙ_ANON_KEY';
```

## Шаг 5: Создать первого суперадмина

1. Authentication → Users → **Invite user**
2. Email: например `09admin01@vlavashe.ru`
3. Пользователь получит письмо, установит пароль, войдёт — профиль создастся автоматически (роль по умолчанию `staff`)
4. В SQL Editor выполни:
```sql
UPDATE profiles
SET role = 'superadmin', name = '09Admin01', active = true
WHERE email = '09admin01@vlavashe.ru';
```

## Шаг 6: Деплой на GitHub Pages

```bash
git init
git add .
git commit -m "NEURAL LABEL PRO v2.0 + Supabase"
git remote add origin https://github.com/ВАШ_НИК/neural-label.git
git push -u origin main
```
GitHub → Settings → Pages → Source: **main / root**

Через 1–2 минуты: `https://ВАШ_НИК.github.io/neural-label/`

## Шаг 7: Redirect URLs

Authentication → URL Configuration:
- Site URL: `https://ВАШ_НИК.github.io/neural-label`
- Redirect URLs: `https://ВАШ_НИК.github.io/neural-label`

(нужно для писем подтверждения регистрации и сброса пароля)

---

## Создание сотрудников

Вход как Суперадмин → **👥 Сотрудники** → **+ Добавить**:
- ФИО, email (будущий логин), временный пароль (мин. 6 символов)
- Роль: `staff` / `admin` / `superadmin` (последнее — только если назначает SA)
- Цех, должность, телефон, Telegram, медкнижка

Сотрудник входит со своим email + временным паролем, может сменить пароль в **⚙️ Настройки → 👤 Мой профиль**.

---

## Роли и ограничения

| Действие | staff | admin | superadmin |
|---|---|---|---|
| Просмотр номенклатуры, шаблонов, истории | ✅ | ✅ | ✅ |
| Печать / заявка в очередь | ✅ | ✅ | ✅ |
| Добавление/редактирование сырья | ❌ | ✅ | ✅ |
| Создание сотрудников | ❌ | ✅ | ✅ |
| Изменение ролей | ❌ | ❌ | ✅ |
| Подтверждение очереди печати | ❌ | ✅ | ✅ |
| Очистка истории / очереди | ❌ | ❌ | ✅ |
| Полный бэкап | ❌ | ❌ | ✅ |

Эти ограничения работают **на уровне базы данных (RLS)** — даже при прямом запросе к Supabase API из обхода интерфейса staff не сможет ничего изменить.

---

## Журналы ХАССП

Раздел **📔 Журналы** доступен всем. Любой сотрудник может добавить запись (с автоподписью своим именем). Если нужны дополнительные журналы — добавь строку в таблицу `journals` через SQL Editor по образцу существующих (`fields_schema` — JSON-массив полей).

---

## Возможные проблемы

**Письмо не приходит** → Authentication → Email Templates → проверь, что встроенный SMTP Supabase не лимитирован (по умолчанию ~3-4 письма/час на free плане). Для продакшена подключи свой SMTP (Resend, SendGrid) в Settings → Auth.

**CORS / не грузится с GitHub Pages** → Settings → API → добавь домен в Allowed Origins (обычно не требуется для anon key + RLS).

**Realtime не работает** → Database → Replication → убедись что таблицы включены; проверь что в браузере не блокируется WebSocket (некоторые корпоративные прокси блокируют `wss://`).

**Сотрудник видит "Недостаточно прав"** → проверь его роль в **Настройки → Роли & Доступ** (только Superadmin может менять роли).
