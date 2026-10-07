-- Dynamic content tables for Journey + Projects
-- Date: 2026-10-07

create table if not exists public.career_journey (
  id text primary key,
  company text not null default '',
  role_vi text not null default '',
  role_en text not null default '',
  start_date text not null default '',
  end_date text not null default '',
  is_current boolean not null default false,
  equipment_tags jsonb not null default '[]'::jsonb,
  responsibilities_vi jsonb not null default '[]'::jsonb,
  responsibilities_en jsonb not null default '[]'::jsonb,
  problem_root_cause_action_vi jsonb not null default '[]'::jsonb,
  problem_root_cause_action_en jsonb not null default '[]'::jsonb,
  training_activities_vi jsonb not null default '[]'::jsonb,
  training_activities_en jsonb not null default '[]'::jsonb,
  achievements_vi jsonb not null default '[]'::jsonb,
  achievements_en jsonb not null default '[]'::jsonb,
  improvements_vi jsonb not null default '[]'::jsonb,
  improvements_en jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_career_journey_sort_order
  on public.career_journey(sort_order);

create table if not exists public.projects (
  id text primary key,
  slug text not null unique,
  title_vi text not null default '',
  title_en text not null default '',
  category text not null check (category in ('3d-jig', 'app-software', 'smt-improvement', 'ai-iot')),
  status text not null check (status in ('ongoing', 'completed')),
  summary_vi text not null default '',
  summary_en text not null default '',
  objective_vi text not null default '',
  objective_en text not null default '',
  description_vi text not null default '',
  description_en text not null default '',
  equipment_tags jsonb not null default '[]'::jsonb,
  gallery jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  lessons_learned_vi jsonb not null default '[]'::jsonb,
  lessons_learned_en jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_sort_order
  on public.projects(sort_order);

create index if not exists idx_projects_category
  on public.projects(category);
