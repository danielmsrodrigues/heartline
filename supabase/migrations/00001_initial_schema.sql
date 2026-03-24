-- Heartline MVP — Schema inicial
-- Executar no Supabase SQL Editor ou via CLI

-- Perfil do utilizador
create table profiles (
  id uuid references auth.users primary key,
  name text,
  birth_date date,
  sex text check (sex in ('M', 'F', 'other')),
  smoker boolean default false,
  exercise_minutes_per_week integer,
  sedentary_work boolean default false,
  sleep_hours_avg numeric(3,1),
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Histórico familiar
create table family_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  relationship text,
  event_type text,
  event_age integer,
  notes text,
  created_at timestamptz default now()
);

-- Exames (agrupamento)
create table exams (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  lab_name text,
  exam_date date not null,
  original_file_path text,
  extraction_method text check (extraction_method in ('manual', 'ai_extracted')),
  created_at timestamptz default now()
);

-- Valores individuais dos biomarcadores
create table biomarkers (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  name_normalized text,
  value numeric not null,
  unit text not null,
  ref_min numeric,
  ref_max numeric,
  ai_confidence text check (ai_confidence in ('high', 'medium', 'low')),
  user_confirmed boolean default false,
  created_at timestamptz default now()
);

-- Conteúdo gerado por IA (cache)
create table generated_content (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  content_type text check (content_type in ('narrative', 'questions')),
  content jsonb not null,
  based_on_exam_ids uuid[],
  generated_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table family_history enable row level security;
alter table exams enable row level security;
alter table biomarkers enable row level security;
alter table generated_content enable row level security;

-- Policies: cada utilizador só acede aos seus dados
create policy "Users see own profile" on profiles for all using (id = auth.uid());
create policy "Users see own family" on family_history for all using (profile_id = auth.uid());
create policy "Users see own exams" on exams for all using (profile_id = auth.uid());
create policy "Users see own biomarkers" on biomarkers for all using (profile_id = auth.uid());
create policy "Users see own content" on generated_content for all using (profile_id = auth.uid());

-- Trigger para criar perfil automaticamente no registo
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
