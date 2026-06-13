# NEURAL LABEL PRO v2.0
**ASV_PROD · NEURAL_ARCHITECT_PREMIUM++**

Система управления этикетками для пищевых производств.
ХАССП / ТР ТС 022/2011 · Роли · Очередь печати · ИИ · Telegram Bot · ZPL Zebra

---

## Архитектура

```
GitHub Pages (статика: index.html + css/ + js/)
        ↕  HTTPS / WebSocket (Realtime)
Supabase (PostgreSQL + Auth + Realtime)
```

**Вся бизнес-база — на Supabase:**
- номенклатура (сырьё)
- сотрудники + роли (через Supabase Auth + profiles)
- цеха / отделы
- шаблоны этикеток
- очередь / журнал печати
- история операций (полный лог)
- журналы ХАССП (температура, уборка, дезинфекция — расширяемо)
- настройки организации + логотипы

Локально (per-browser, не критично) хранятся только:
- подключение к ИИ-ассистенту (API key)
- подключение к Telegram-боту
- кэш системных шаблонов (offline fallback)

---

## Структура файлов

```
neural-label-pro/
├── index.html              ← SPA-оболочка, Supabase client, автокомплит, очередь
├── supabase_schema.sql     ← ПОЛНАЯ схема БД — выполнить в Supabase SQL Editor
├── SUPABASE_SETUP.md       ← Пошаговая настройка
├── css/
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   └── pages.css
└── js/
    ├── supabase.js          ← Supabase client + API-обёртка
    ├── db.js                ← локальные дефолты (AI/TG, fallback-шаблоны)
    ├── state.js             ← глобальное состояние S{}
    ├── auth_sb.js            ← вход/выход/регистрация/смена пароля (Supabase Auth)
    ├── ui.js                ← toast, модалки, дровер, хоткеи
    ├── nav.js                ← навигация + защита страниц по ролям
    ├── label.js              ← рендер этикеток, QR, печать
    ├── app.js                ← batch print, ZPL, точка входа
    └── pages/
        ├── dashboard.js
        ├── quick.js          ← быстрая печать с автокомплитом
        ├── print_queue.js    ← очередь печати (realtime)
        ├── materials.js      ← Сырьё + Сотрудники + Шаблоны
        ├── constructor.js    ← конструктор этикеток
        ├── departments.js    ← Цеха + Журналы ХАССП
        ├── history.js        ← История + QR-сканер + очистка (SA)
        ├── ai.js              ← ИИ, Telegram, импорт/экспорт
        └── settings.js       ← настройки, профиль, пароли
```

---

## Роли и права доступа

| Роль | Чтение | Создание/изменение | Удаление | Настройки | Журналы |
|------|--------|---------------------|----------|-----------|---------|
| **staff** | ✅ всё | ❌ | ❌ | ❌ нет доступа | ✅ может добавлять записи |
| **admin** | ✅ всё | ✅ сырьё, шаблоны, сотрудники, цеха | ❌ | ✅ кроме ролей/очистки | ✅ полностью |
| **superadmin** | ✅ всё | ✅ всё | ✅ всё | ✅ всё + роли + очистка логов | ✅ полностью |

**Сотрудник (staff) только выбирает и печатает — ничего не редактирует.**
Это гарантируется на двух уровнях:
1. UI — кнопки редактирования скрыты (`S.canEdit()`)
2. **RLS-политики PostgreSQL** — даже прямой запрос к API будет отклонён базой

---

## Быстрый старт (15 минут)

### 1. Создать проект Supabase
[supabase.com](https://supabase.com) → New Project

### 2. Выполнить схему БД
Dashboard → SQL Editor → вставить весь файл **`supabase_schema.sql`** → Run

### 3. Включить Realtime
Database → Replication → включить: `materials`, `templates`, `print_queue`, `profiles`, `activity`, `journal_entries`

### 4. Вставить ключи
`js/supabase.js`, строки 8–9:
```js
const SUPABASE_URL  = 'https://ТВОЙ_ПРОЕКТ.supabase.co';
const SUPABASE_ANON = 'ТВОЙ_ANON_KEY';
```
(Dashboard → Settings → API)

### 5. Создать первого суперадмина
Authentication → Users → Invite user → email `09admin01@vlavashe.ru`

После входа выполнить в SQL Editor:
```sql
UPDATE profiles SET role='superadmin', name='09Admin01', active=true
WHERE email='09admin01@vlavashe.ru';
```

### 6. Деплой на GitHub Pages
```bash
git init && git add . && git commit -m "NEURAL LABEL PRO v2.0"
git remote add origin https://github.com/ВАШ_НИК/neural-label.git
git push -u origin main
```
Settings → Pages → Source: `main / root`

Подробности — **SUPABASE_SETUP.md**

---

## Как работает печать

**Сотрудник (телефон/планшет):**
1. Входит по email + паролю
2. Быстрая печать → начинает вводить название продукта — появляется выпадающий список с поиском по буквам
3. Заполняет дату вскрытия, партию, кол-во
4. 🖨️ ПЕЧАТЬ → заявка уходит в очередь (realtime)

**Admin/Superadmin (ПК у принтера):**
1. Раздел **Очередь печати** — все заявки в реальном времени + звук при новой заявке
2. ✅ Печать → документ сразу уходит на принтер ПК
3. ✕ Отклонить → заявка помечается отклонённой

---

## Поиск по номенклатуре

В Быстрой печати — поле с автокомплитом: начните вводить первые буквы названия, лот или категорию — список отфильтруется мгновенно. Стрелки ↑↓ + Enter для выбора с клавиатуры.

---

## Журналы ХАССП

Раздел **📔 Журналы** — готовые журналы:
- Температурный контроль
- Уборка и дезинфекция
- Дератизация и дезинсекция

Любой сотрудник может добавить запись (подпись = его имя). Редактирование схемы полей и удаление записей — Admin/Superadmin.

---

## Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| `1`–`0` | Переход по разделам |
| `P` | Печать (на странице Быстрая печать) |
| `Esc` | Закрыть окно / дровер |

---

## Плейсхолдеры шаблонов

`{name}` `{openDate}` `{expiry}` `{temp}` `{openedBy}` `{batch}` `{allergens}` `{haccpNote}`

---

## Разработка

**ASV_PROD** · Telegram: [@ASV_prod](https://t.me/ASV_prod)
GitHub: [smol0901-jpg](https://github.com/smol0901-jpg)
