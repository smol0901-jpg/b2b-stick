-- ================================================================
-- NEURAL LABEL PRO v2.0 — ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ
-- Supabase / PostgreSQL
-- Выполни весь файл в: Dashboard → SQL Editor → New Query → Run
-- ================================================================

-- ----------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";   -- для быстрого поиска по тексту


-- ================================================================
-- 1. PROFILES — расширение auth.users
-- ================================================================
create table if not exists profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  name          text        not null,
  role          text        not null default 'staff'
                            check (role in ('superadmin','admin','staff')),
  position      text,
  dept          text,
  phone         text,
  tg            text,
  email         text,
  med_book_date date,
  avatar_url    text,
  active        boolean     not null default true,
  org_id        text        not null default 'vlavashe',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS
alter table profiles enable row level security;

-- Каждый видит свой профиль
create policy "profiles_own_select"   on profiles for select  using (auth.uid() = id);
-- Каждый обновляет только свой профиль (аватар, пароль)
create policy "profiles_own_update"   on profiles for update  using (auth.uid() = id)
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
-- Admin/SA видит всех в своей орг
create policy "profiles_admin_select" on profiles for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin') and p.org_id = org_id));
-- Только SA создаёт/редактирует профили
create policy "profiles_sa_all"       on profiles for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin'));

-- Автообновление updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();


-- ================================================================
-- 2. DEPARTMENTS (цеха / отделы)
-- ================================================================
create table if not exists departments (
  id          bigint      generated always as identity primary key,
  name        text        not null,
  code        text        unique,
  description text,
  manager_id  uuid        references profiles(id) on delete set null,
  active      boolean     not null default true,
  org_id      text        not null default 'vlavashe',
  created_by  uuid        references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table departments enable row level security;
-- Все авторизованные читают
create policy "depts_auth_select" on departments for select using (auth.role() = 'authenticated');
-- Только admin/SA изменяют
create policy "depts_admin_all" on departments for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));

create trigger depts_updated_at before update on departments
  for each row execute function set_updated_at();

-- Базовые цеха (вставим после создания таблицы)
insert into departments (name, code, description) values
  ('Горячий цех',    'HOT',   'Приготовление горячих блюд'),
  ('Холодный цех',   'COLD',  'Приготовление холодных блюд и салатов'),
  ('Кондитерский',   'CONFEC','Выпечка и кондитерские изделия'),
  ('Склад',          'STORE', 'Складское хранение и приёмка'),
  ('Заготовочный',   'PREP',  'Первичная обработка сырья'),
  ('Мясной цех',     'MEAT',  'Разделка и обработка мяса'),
  ('Рыбный цех',     'FISH',  'Обработка рыбы и морепродуктов'),
  ('Овощной цех',    'VEG',   'Обработка овощей и зелени')
on conflict do nothing;


-- ================================================================
-- 3. MATERIALS (номенклатура / сырьё)
-- ================================================================
create table if not exists materials (
  id            bigint      generated always as identity primary key,
  name          text        not null,
  category      text        not null default 'other',
  temperature   text,
  shelf_hours   int,
  expiry_date   date,
  allergens     text,
  lot           text,
  haccp_note    text,
  supplier      text,
  unit          text        not null default 'кг',
  status        text        not null default 'active'
                            check (status in ('active','archived')),
  dept_id       bigint      references departments(id) on delete set null,
  org_id        text        not null default 'vlavashe',
  created_by    uuid        references auth.users(id),
  updated_by    uuid        references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Индекс для поиска по названию
create index if not exists materials_name_trgm on materials using gin (name gin_trgm_ops);
create index if not exists materials_status    on materials (status, org_id);

alter table materials enable row level security;
-- Все читают
create policy "mats_auth_select" on materials for select using (auth.role() = 'authenticated');
-- staff НЕ МОЖЕТ изменять (только выбирать)
create policy "mats_admin_insert" on materials for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));
create policy "mats_admin_update" on materials for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));
create policy "mats_sa_delete" on materials for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin'));

create trigger mats_updated_at before update on materials
  for each row execute function set_updated_at();


-- ================================================================
-- 4. TEMPLATES (шаблоны этикеток)
-- ================================================================
create table if not exists templates (
  id            text        primary key,
  name          text        not null,
  is_system     boolean     not null default false,
  width_mm      numeric     not null default 90,
  height_mm     numeric     not null default 60,
  logo          text,         -- base64 или URL
  blocks        jsonb       not null default '[]',
  org_id        text        not null default 'vlavashe',
  created_by    uuid        references auth.users(id),
  updated_by    uuid        references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table templates enable row level security;
create policy "tmpls_auth_select"  on templates for select using (auth.role() = 'authenticated');
create policy "tmpls_admin_write"  on templates for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));
create policy "tmpls_admin_update" on templates for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin'))
     and is_system = false);  -- системные шаблоны не трогаем
create policy "tmpls_sa_delete"    on templates for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin')
     and is_system = false);

create trigger tmpls_updated_at before update on templates
  for each row execute function set_updated_at();


-- ================================================================
-- 5. PRINT QUEUE (очередь / журнал печати)
-- ================================================================
create table if not exists print_queue (
  id              bigint      generated always as identity primary key,
  material_id     bigint      references materials(id) on delete set null,
  material_name   text        not null,
  template_id     text        references templates(id) on delete set null,
  open_date       timestamptz,
  opened_by       text,
  batch           text,
  copies          int         not null default 1 check (copies > 0 and copies <= 200),
  status          text        not null default 'pending'
                              check (status in ('pending','approved','printing','done','rejected')),
  note            text,
  device_info     text,         -- телефон / планшет / ПК
  org_id          text        not null default 'vlavashe',
  created_by      uuid        references auth.users(id),
  approved_by     uuid        references auth.users(id),
  printed_by      uuid        references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists pq_status  on print_queue (status, org_id);
create index if not exists pq_created on print_queue (created_at desc);

alter table print_queue enable row level security;
-- Все читают
create policy "pq_auth_select"   on print_queue for select using (auth.role() = 'authenticated');
-- Все могут добавлять заявки (своя created_by)
create policy "pq_auth_insert"   on print_queue for insert
  with check (auth.uid() = created_by);
-- Только admin/SA меняют статус
create policy "pq_admin_update"  on print_queue for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));
-- SA удаляет / чистит
create policy "pq_sa_delete"     on print_queue for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin'));

create trigger pq_updated_at before update on print_queue
  for each row execute function set_updated_at();


-- ================================================================
-- 6. ACTIVITY LOG (история операций)
-- ================================================================
create table if not exists activity (
  id          bigint      generated always as identity primary key,
  action      text        not null,
  user_id     uuid        references auth.users(id) on delete set null,
  user_name   text,         -- денормализованное имя (не потеряется при удалении)
  detail      text,
  entity_type text,         -- 'material' | 'employee' | 'template' | 'print' | 'system'
  entity_id   text,         -- id затронутой записи
  ip_address  text,
  org_id      text        not null default 'vlavashe',
  created_at  timestamptz not null default now()
);

create index if not exists act_created   on activity (created_at desc);
create index if not exists act_user      on activity (user_id);
create index if not exists act_entity    on activity (entity_type, entity_id);

alter table activity enable row level security;
-- Admin/SA читает всё
create policy "act_admin_select"  on activity for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));
-- Сотрудник видит только своё
create policy "act_own_select"    on activity for select using (user_id = auth.uid());
-- Все пишут (только свой user_id)
create policy "act_auth_insert"   on activity for insert
  with check (auth.uid() = user_id);
-- SA чистит
create policy "act_sa_delete"     on activity for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin'));


-- ================================================================
-- 7. SETTINGS (настройки организации)
-- ================================================================
create table if not exists settings (
  org_id      text        primary key default 'vlavashe',
  data        jsonb       not null default '{}',
  logos       jsonb       not null default '{}',  -- { global: base64 }
  updated_by  uuid        references auth.users(id),
  updated_at  timestamptz not null default now()
);

alter table settings enable row level security;
create policy "sett_auth_select" on settings for select using (auth.role() = 'authenticated');
create policy "sett_admin_all"   on settings for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));

-- Вставить дефолтные настройки
insert into settings (org_id, data) values (
  'vlavashe',
  '{"org":"ВЛАВАШЕ ФУД КОМПАНИ","orgSh":"ВЛАВАШЕ","haccp":true,"haccpStd":"trts022","defaultTmpl":"sys1","defaultOri":"portrait","showQR":true}'::jsonb
) on conflict (org_id) do nothing;


-- ================================================================
-- 8. JOURNALS (журналы ХАССП — расширяемые)
-- ================================================================
create table if not exists journals (
  id            bigint      generated always as identity primary key,
  journal_type  text        not null,  -- 'temperature' | 'cleaning' | 'pest' | 'custom'
  title         text        not null,
  fields_schema jsonb       not null default '[]',  -- [{name, label, type, required}]
  active        boolean     not null default true,
  org_id        text        not null default 'vlavashe',
  dept_id       bigint      references departments(id) on delete set null,
  created_by    uuid        references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists journal_entries (
  id            bigint      generated always as identity primary key,
  journal_id    bigint      not null references journals(id) on delete cascade,
  data          jsonb       not null default '{}',  -- заполненные поля
  signed_by     uuid        references auth.users(id),
  signed_name   text,
  org_id        text        not null default 'vlavashe',
  created_at    timestamptz not null default now()
);

create index if not exists je_journal  on journal_entries (journal_id, created_at desc);

alter table journals enable row level security;
alter table journal_entries enable row level security;

create policy "jour_auth_select"  on journals       for select using (auth.role() = 'authenticated');
create policy "jour_admin_all"    on journals       for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));

create policy "je_auth_select"    on journal_entries for select using (auth.role() = 'authenticated');
-- Все могут добавлять записи (staff тоже)
create policy "je_auth_insert"    on journal_entries for insert
  with check (auth.uid() = signed_by);
-- SA/Admin редактируют/удаляют
create policy "je_admin_update"   on journal_entries for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));
create policy "je_sa_delete"      on journal_entries for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin'));

-- Базовые журналы
insert into journals (journal_type, title, fields_schema) values
  ('temperature', 'Журнал температурного контроля', '[
    {"name":"equipment","label":"Оборудование","type":"text","required":true},
    {"name":"temp_c","label":"Температура °C","type":"number","required":true},
    {"name":"norm","label":"Норма соблюдена","type":"boolean","required":true},
    {"name":"action","label":"Корректирующее действие","type":"text","required":false}
  ]'::jsonb),
  ('cleaning', 'Журнал уборки и дезинфекции', '[
    {"name":"area","label":"Помещение/зона","type":"text","required":true},
    {"name":"type","label":"Вид уборки","type":"select","options":["текущая","генеральная","дезинфекция"],"required":true},
    {"name":"chemical","label":"Средство","type":"text","required":false},
    {"name":"done","label":"Выполнено","type":"boolean","required":true}
  ]'::jsonb),
  ('pest', 'Журнал дератизации и дезинсекции', '[
    {"name":"contractor","label":"Исполнитель","type":"text","required":true},
    {"name":"area","label":"Обработанная зона","type":"text","required":true},
    {"name":"chemical","label":"Препарат","type":"text","required":false},
    {"name":"result","label":"Результат","type":"text","required":true}
  ]'::jsonb)
on conflict do nothing;


-- ================================================================
-- 9. REALTIME — включить для таблиц
-- ================================================================
-- Выполни в Dashboard → Database → Replication → Source
-- ИЛИ через SQL:
alter publication supabase_realtime add table materials;
alter publication supabase_realtime add table templates;
alter publication supabase_realtime add table print_queue;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table activity;
alter publication supabase_realtime add table journal_entries;


-- ================================================================
-- 10. ФУНКЦИЯ — helper для логирования из триггеров
-- ================================================================
create or replace function log_activity(
  p_action      text,
  p_user_id     uuid,
  p_user_name   text,
  p_entity_type text default null,
  p_entity_id   text default null,
  p_detail      text default null,
  p_org_id      text default 'vlavashe'
) returns void language plpgsql security definer as $$
begin
  insert into activity (action, user_id, user_name, entity_type, entity_id, detail, org_id)
  values (p_action, p_user_id, p_user_name, p_entity_type, p_entity_id, p_detail, p_org_id);
exception when others then null;  -- не блокировать основную операцию
end; $$;


-- ================================================================
-- 11. VIEW — сводная по очереди печати (для дашборда)
-- ================================================================
create or replace view v_print_queue_stats as
select
  org_id,
  count(*) filter (where status = 'pending')  as pending_count,
  count(*) filter (where status = 'done')     as done_today,
  count(*) filter (where status = 'rejected') as rejected_count,
  count(*) filter (where created_at >= current_date) as today_total
from print_queue
group by org_id;


-- ================================================================
-- ГОТОВО. Что создано:
-- ✅ profiles      — сотрудники + роли (superadmin/admin/staff)
-- ✅ departments   — цеха и отделы
-- ✅ materials     — вся номенклатура сырья
-- ✅ templates     — шаблоны этикеток
-- ✅ print_queue   — очередь/журнал печати
-- ✅ activity      — история всех операций (чистится SA)
-- ✅ settings      — настройки организации + логотипы
-- ✅ journals      — ХАССП журналы (расширяемые)
-- ✅ journal_entries — записи в журналах
-- ✅ RLS политики  — staff только читает, admin пишет, SA полный доступ
-- ✅ Realtime      — включён для всех важных таблиц
-- ✅ Индексы       — быстрый поиск по тексту (trgm)
-- ================================================================

-- ============================================================
-- FIX: infinite recursion in RLS policies on `profiles`
-- Причина: политики на profiles (и зависящих от неё таблиц)
--          делают SELECT из profiles внутри USING, что вызывает
--          рекурсию RLS. Решение — обернуть проверку роли в
--          SECURITY DEFINER функцию, которая выполняется
--          с правами owner и RLS не триггерит.
-- ============================================================

-- 1. Создаём helper-функции, которые "смотрят" роль без RLS
create or replace function public.current_role() returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role in ('admin','superadmin')
     from public.profiles where id = auth.uid()),
    false)
$$;

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role = 'superadmin'
     from public.profiles where id = auth.uid()),
    false)
$$;

-- 2. Удаляем ВСЕ старые политики на profiles (по именам, без ошибки если нет)
drop policy if exists "profiles_own_select"   on profiles;
drop policy if exists "profiles_own_update"   on profiles;
drop policy if exists "profiles_own_insert"   on profiles;
drop policy if exists "profiles_admin_select" on profiles;
drop policy if exists "profiles_sa_all"       on profiles;
drop policy if exists "profiles_admin_write"  on profiles;
drop policy if exists "profiles_select"       on profiles;
drop policy if exists "profiles_update"       on profiles;
drop policy if exists "profiles_insert"       on profiles;
drop policy if exists "profiles_delete"       on profiles;
drop policy if exists "profiles_all"          on profiles;

-- 3. Создаём чистые политики на profiles БЕЗ рекурсии
create policy "profiles_select" on profiles
  for select using (
    auth.uid() = id
    or public.is_admin()
  );

create policy "profiles_insert" on profiles
  for insert with check (public.is_admin());

create policy "profiles_update" on profiles
  for update using (
    auth.uid() = id or public.is_admin()
  ) with check (
    (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()))
    or public.is_superadmin()
  );

create policy "profiles_delete" on profiles
  for delete using (public.is_superadmin());

-- 4. Чиним все остальные таблицы — пересоздаём их политики
--    на использование public.is_admin() / public.is_superadmin()

-- === departments ===
drop policy if exists "departments_admin_all"   on departments;
drop policy if exists "departments_select_all"  on departments;
drop policy if exists "departments_admin_write" on departments;
drop policy if exists "departments_sa_all"      on departments;
create policy "departments_select" on departments for select using (true);
create policy "departments_write" on departments
  for all using (public.is_admin()) with check (public.is_admin());

-- === materials ===
drop policy if exists "materials_admin_all"   on materials;
drop policy if exists "materials_select_all"  on materials;
drop policy if exists "materials_admin_write" on materials;
drop policy if exists "materials_sa_all"      on materials;
drop policy if exists "materials_write"       on materials;
create policy "materials_select" on materials for select using (true);
create policy "materials_write" on materials
  for all using (public.is_admin()) with check (public.is_admin());

-- === templates ===
drop policy if exists "templates_admin_all"   on templates;
drop policy if exists "templates_select_all"  on templates;
drop policy if exists "templates_admin_write" on templates;
drop policy if exists "templates_sa_all"      on templates;
create policy "templates_select" on templates for select using (true);
create policy "templates_write" on templates
  for all using (public.is_admin()) with check (public.is_admin());

-- === print_queue ===
drop policy if exists "print_queue_select_all" on print_queue;
drop policy if exists "print_queue_insert_all" on print_queue;
drop policy if exists "print_queue_admin_all"  on print_queue;
drop policy if exists "print_queue_sa_all"     on print_queue;
create policy "print_queue_select" on print_queue for select using (true);
create policy "print_queue_insert" on print_queue
  for insert with check (auth.uid() = user_id);
create policy "print_queue_update" on print_queue
  for update using (auth.uid() = user_id or public.is_admin());

-- === activity ===
drop policy if exists "activity_select_all" on activity;
drop policy if exists "activity_sa_all"     on activity;
create policy "activity_select" on activity
  for select using (public.is_admin());
create policy "activity_insert" on activity
  for insert with check (auth.uid() = user_id);
create policy "activity_delete" on activity
  for delete using (public.is_superadmin());

-- === settings ===
drop policy if exists "settings_admin_all"  on settings;
drop policy if exists "settings_sa_all"     on settings;
drop policy if exists "settings_read_all"   on settings;
create policy "settings_select" on settings for select using (true);
create policy "settings_write" on settings
  for all using (public.is_admin()) with check (public.is_admin());

-- === journal_entries ===
drop policy if exists "journal_entries_select" on journal_entries;
drop policy if exists "journal_entries_insert" on journal_entries;
drop policy if exists "journal_entries_admin"  on journal_entries;
drop policy if exists "journal_entries_sa"     on journal_entries;
create policy "journal_entries_select" on journal_entries for select using (true);
create policy "journal_entries_insert" on journal_entries
  for insert with check (auth.uid() = user_id);
create policy "journal_entries_update" on journal_entries
  for update using (auth.uid() = user_id or public.is_admin());
create policy "journal_entries_delete" on journal_entries
  for delete using (public.is_admin());

-- Готово. Рекурсия должна уйти.

