-- ============================================================
-- ISDRA — schema do Supabase
-- Rode isto inteiro no SQL Editor do seu projeto Supabase
-- (Project > SQL Editor > New query > cole tudo > Run).
-- ============================================================

create extension if not exists pgcrypto;

-- Se você já rodou uma versão anterior deste schema, rode antes:
--   drop table if exists items, folders, projects cascade;

-- ---------- projects ----------
-- "code" É a chave do projeto (ex: "projeto-ana-luisa") — é o que a
-- pessoa digita pra entrar, junto com a senha. Sempre guardado já
-- normalizado (minúsculo, sem espaços) pelo backend.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  password_salt text not null,
  password_hash text not null,
  architecture_pdf jsonb,   -- { path, originalName }
  notebook_pdf jsonb        -- { path, originalName }
);

-- ---------- folders ----------
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  photo_path text not null
);

-- ---------- items (produtos dentro de cada pasta) ----------
-- store_type: 'fisica' | 'online' — único campo obrigatório do produto.
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  folder_id uuid not null references folders(id) on delete cascade,
  store_type text not null default 'online',
  photo_path text,           -- opcional
  price numeric,
  measurements text not null default '',
  link text,                 -- opcional
  store text not null default '',
  notes text not null default ''
);

-- ---------- migração (rode se a tabela items já existia sem store_type) ----------
alter table items add column if not exists store_type text not null default 'online';
alter table items alter column link drop not null;
alter table items drop column if exists name;

create index if not exists folders_project_id_idx on folders(project_id);
create index if not exists items_project_id_idx on items(project_id);
create index if not exists items_folder_id_idx on items(folder_id);

-- ---------- segurança ----------
-- RLS habilitado sem nenhuma policy: só a service_role key (usada só no
-- servidor, nunca no navegador) consegue ler/escrever essas tabelas.
-- A anon key não tem acesso nenhum a elas.
alter table projects enable row level security;
alter table folders enable row level security;
alter table items enable row level security;

-- ---------- storage ----------
-- Bucket público (as fotos e PDFs ficam acessíveis por URL direta, do
-- mesmo jeito que já funcionava localmente — o código+senha protege
-- quem consegue *navegar* até os arquivos pela galeria, mas os nomes
-- dos arquivos são UUIDs aleatórios e não-listáveis).
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;
