-- ============================================================
-- FIX v2: infinite recursion in RLS + правильные имена колонок
-- ============================================================

-- 1. Helper-функции (SECURITY DEFINER обходит RLS)
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

-- 2. Дропаем ВСЕ старые политики (по именам из supabase_schema.sql)
-- profiles
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

-- departments
drop policy if exists "departments_admin_all"   on departments;
drop policy if exists "departments_select_all"  on departments;
drop policy if exists "departments_admin_write" on departments;
drop policy if exists "departments_sa_all"      on departments;

-- materials
drop policy if exists "materials_admin_all"   on materials;
drop policy if exists "materials_select_all"  on materials;
drop policy if exists "materials_admin_write" on materials;
drop policy if exists "materials_sa_all"      on materials;
drop policy if exists "materials_write"       on materials;

-- templates
drop policy if exists "templates_admin_all"   on templates;
drop policy if exists "templates_select_all"  on templates;
drop policy if exists "templates_admin_write" on templates;
drop policy if exists "templates_sa_all"      on templates;

-- print_queue
drop policy if exists "print_queue_select_all" on print_queue;
drop policy if exists "print_queue_insert_all" on print_queue;
drop policy if exists "print_queue_admin_all"  on print_queue;
drop policy if exists "print_queue_sa_all"     on print_queue;

-- activity
drop policy if exists "activity_select_all" on activity;
drop policy if exists "activity_sa_all"     on activity;

-- settings
drop policy if exists "settings_admin_all"  on settings;
drop policy if exists "settings_sa_all"     on settings;
drop policy if exists "settings_read_all"   on settings;

-- journals
drop policy if exists "journals_admin_all"   on journals;
drop policy if exists "journals_select_all"  on journals;
drop policy if exists "journals_admin_write" on journals;
drop policy if exists "journals_sa_all"      on journals;

-- journal_entries
drop policy if exists "journal_entries_select" on journal_entries;
drop policy if exists "journal_entries_insert" on journal_entries;
drop policy if exists "journal_entries_admin"  on journal_entries;
drop policy if exists "journal_entries_sa"     on journal_entries;

-- 3. Новые чистые политики
-- === profiles ===
create policy "profiles_select" on profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_insert" on profiles
  for insert with check (public.is_admin());

create policy "profiles_update" on profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (public.is_superadmin() or auth.uid() = id);

create policy "profiles_delete" on profiles
  for delete using (public.is_superadmin());

-- === departments ===
create policy "departments_select" on departments for select using (true);
create policy "departments_write"  on departments
  for all using (public.is_admin()) with check (public.is_admin());

-- === materials ===
create policy "materials_select" on materials for select using (true);
create policy "materials_write"  on materials
  for all using (public.is_admin()) with check (public.is_admin());

-- === templates ===
create policy "templates_select" on templates for select using (true);
create policy "templates_write"  on templates
  for all using (public.is_admin()) with check (public.is_admin());

-- === print_queue (использует created_by, не user_id) ===
create policy "print_queue_select" on print_queue for select using (true);
create policy "print_queue_insert" on print_queue
  for insert with check (auth.uid() = created_by);
create policy "print_queue_update" on print_queue
  for update using (auth.uid() = created_by or public.is_admin());

-- === activity (использует user_id) ===
create policy "activity_select" on activity
  for select using (public.is_admin());
create policy "activity_insert" on activity
  for insert with check (auth.uid() = user_id);
create policy "activity_delete" on activity
  for delete using (public.is_superadmin());

-- === settings ===
create policy "settings_select" on settings for select using (true);
create policy "settings_write"  on settings
  for all using (public.is_admin()) with check (public.is_admin());

-- === journals ===
create policy "journals_select" on journals for select using (true);
create policy "journals_write"  on journals
  for all using (public.is_admin()) with check (public.is_admin());

-- === journal_entries (использует signed_by, не user_id) ===
create policy "journal_entries_select" on journal_entries for select using (true);
create policy "journal_entries_insert" on journal_entries
  for insert with check (auth.uid() = signed_by);
create policy "journal_entries_update" on journal_entries
  for update using (auth.uid() = signed_by or public.is_admin());
create policy "journal_entries_delete" on journal_entries
  for delete using (public.is_admin());

-- Готово.
