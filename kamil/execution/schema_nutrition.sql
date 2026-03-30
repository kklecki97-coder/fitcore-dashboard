-- ============================================================
-- FitCore - Nutrition Plans Migration
-- Adds meal plan tables for coaches to create and assign
-- nutrition plans to clients.
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── nutrition_plans ─────────────────────────────────────────
create table if not exists nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  title text not null,
  description text default '',
  type text check (type in ('strict', 'flexible', 'guidelines')) default 'flexible',
  is_template boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── nutrition_plan_days ─────────────────────────────────────
create table if not exists nutrition_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references nutrition_plans(id) on delete cascade,
  day_label text not null,
  sort_order integer not null default 0,
  notes text default ''
);

-- ── nutrition_meals ─────────────────────────────────────────
create table if not exists nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references nutrition_plan_days(id) on delete cascade,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack','pre-workout','post-workout')) default 'breakfast',
  title text not null,
  description text default '',
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  sort_order integer not null default 0
);

-- ── nutrition_plan_assignments ──────────────────────────────
-- Junction: which clients have which nutrition plans assigned
create table if not exists nutrition_plan_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references nutrition_plans(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  assigned_at timestamptz default now(),
  start_date date,
  end_date date,
  status text check (status in ('active', 'completed', 'paused')) default 'active',
  coach_notes text default ''
);

-- ══════════════════════════════════════════════════════════════
-- RLS Policies - Coach side
-- ══════════════════════════════════════════════════════════════

alter table nutrition_plans enable row level security;
alter table nutrition_plan_days enable row level security;
alter table nutrition_meals enable row level security;
alter table nutrition_plan_assignments enable row level security;

-- Coach owns nutrition plans
create policy "nutrition_plans: coach owns" on nutrition_plans
  for all using (coach_id = auth.uid());

-- Coach owns days (via plan)
create policy "nutrition_plan_days: coach owns" on nutrition_plan_days
  for all using (
    exists (select 1 from nutrition_plans where nutrition_plans.id = nutrition_plan_days.plan_id and nutrition_plans.coach_id = auth.uid())
  );

-- Coach owns meals (via day -> plan)
create policy "nutrition_meals: coach owns" on nutrition_meals
  for all using (
    exists (
      select 1 from nutrition_plan_days
      join nutrition_plans on nutrition_plans.id = nutrition_plan_days.plan_id
      where nutrition_plan_days.id = nutrition_meals.day_id and nutrition_plans.coach_id = auth.uid()
    )
  );

-- Coach reads assignments (check client ownership only — no plan join to avoid circular recursion with client read policies)
create policy "nutrition_plan_assignments: coach reads" on nutrition_plan_assignments
  for select using (
    exists (select 1 from clients where clients.id = nutrition_plan_assignments.client_id and clients.coach_id = auth.uid())
  );

-- Coach inserts assignments (check both client AND plan ownership)
create policy "nutrition_plan_assignments: coach writes" on nutrition_plan_assignments
  for insert with check (
    exists (select 1 from clients where clients.id = nutrition_plan_assignments.client_id and clients.coach_id = auth.uid())
    and exists (select 1 from nutrition_plans where nutrition_plans.id = nutrition_plan_assignments.plan_id and nutrition_plans.coach_id = auth.uid())
  );

-- Coach updates own assignments
create policy "nutrition_plan_assignments: coach updates" on nutrition_plan_assignments
  for update using (
    exists (select 1 from clients where clients.id = nutrition_plan_assignments.client_id and clients.coach_id = auth.uid())
  );

-- Coach deletes own assignments
create policy "nutrition_plan_assignments: coach deletes" on nutrition_plan_assignments
  for delete using (
    exists (select 1 from clients where clients.id = nutrition_plan_assignments.client_id and clients.coach_id = auth.uid())
  );

-- ══════════════════════════════════════════════════════════════
-- RLS Policies - Client side (read-only)
-- ══════════════════════════════════════════════════════════════

-- Client reads assigned nutrition plans
create policy "nutrition_plans: client reads assigned" on nutrition_plans
  for select using (
    exists (
      select 1 from nutrition_plan_assignments
      join clients on clients.id = nutrition_plan_assignments.client_id
      where nutrition_plan_assignments.plan_id = nutrition_plans.id and clients.auth_user_id = auth.uid()
    )
  );

-- Client reads days of assigned plans
create policy "nutrition_plan_days: client reads assigned" on nutrition_plan_days
  for select using (
    exists (
      select 1 from nutrition_plans
      join nutrition_plan_assignments on nutrition_plan_assignments.plan_id = nutrition_plans.id
      join clients on clients.id = nutrition_plan_assignments.client_id
      where nutrition_plans.id = nutrition_plan_days.plan_id and clients.auth_user_id = auth.uid()
    )
  );

-- Client reads meals of assigned plans
create policy "nutrition_meals: client reads assigned" on nutrition_meals
  for select using (
    exists (
      select 1 from nutrition_plan_days
      join nutrition_plans on nutrition_plans.id = nutrition_plan_days.plan_id
      join nutrition_plan_assignments on nutrition_plan_assignments.plan_id = nutrition_plans.id
      join clients on clients.id = nutrition_plan_assignments.client_id
      where nutrition_plan_days.id = nutrition_meals.day_id and clients.auth_user_id = auth.uid()
    )
  );

-- Client reads own assignments
create policy "nutrition_plan_assignments: client reads own" on nutrition_plan_assignments
  for select using (
    exists (select 1 from clients where clients.id = nutrition_plan_assignments.client_id and clients.auth_user_id = auth.uid())
  );

-- ══════════════════════════════════════════════════════════════
-- Indexes for performance (RLS policies join on these columns)
-- ══════════════════════════════════════════════════════════════

create index if not exists idx_nutrition_plan_days_plan_id on nutrition_plan_days(plan_id);
create index if not exists idx_nutrition_meals_day_id on nutrition_meals(day_id);
create index if not exists idx_nutrition_plan_assignments_plan_id on nutrition_plan_assignments(plan_id);
create index if not exists idx_nutrition_plan_assignments_client_id on nutrition_plan_assignments(client_id);

-- ══════════════════════════════════════════════════════════════
-- Auto-update updated_at on nutrition_plans
-- ══════════════════════════════════════════════════════════════

create or replace function update_nutrition_plan_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_nutrition_plans_updated_at
  before update on nutrition_plans
  for each row
  execute function update_nutrition_plan_updated_at();
