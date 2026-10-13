-- Heartline — consentimento RGPD, ficheiros originais, apagamento de conta e índices

-- Registo do consentimento explícito para tratamento de dados de saúde
alter table public.profiles
  add column if not exists health_consent_at timestamptz;

-- Apagar o utilizador em auth.users leva o perfil (e, em cascata, tudo o resto)
do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and confrelid = 'auth.users'::regclass
    and contype = 'f';
  if fk_name is not null then
    execute format('alter table public.profiles drop constraint %I', fk_name);
  end if;
end $$;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users (id) on delete cascade;

-- Índices para as queries por utilizador / por exame
create index if not exists family_history_profile_id_idx on public.family_history (profile_id);
create index if not exists exams_profile_id_exam_date_idx on public.exams (profile_id, exam_date desc);
create index if not exists biomarkers_profile_id_idx on public.biomarkers (profile_id);
create index if not exists biomarkers_exam_id_idx on public.biomarkers (exam_id);
create index if not exists generated_content_latest_idx
  on public.generated_content (profile_id, content_type, generated_at desc);

-- Trigger de registo com search_path fixo (função security definer)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Bucket privado para as fotos/PDFs originais: <user id>/<exam id>.<ext>
insert into storage.buckets (id, name, public)
values ('exams', 'exams', false)
on conflict (id) do update set public = false;

drop policy if exists "Users manage own exam files" on storage.objects;
create policy "Users manage own exam files"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'exams' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'exams' and (storage.foldername(name))[1] = auth.uid()::text);
