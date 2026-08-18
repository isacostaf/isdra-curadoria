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
-- is_all_products: marca a pasta especial "Todos os produtos" que todo
-- projeto ganha automaticamente — é o destino padrão de um produto
-- quando nenhuma pasta é escolhida no formulário. Não pode ser excluída.
-- purchased: "já comprado" — a pasta fica esmaecida na grade e sempre
-- ordenada por último (antes só da pasta "Todos os produtos", que
-- continua sendo a última de todas).
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  photo_path text,
  is_all_products boolean not null default false,
  purchased boolean not null default false
);

-- ---------- items (produtos dentro de cada pasta) ----------
-- store_type: 'fisica' | 'online' — único campo obrigatório do produto.
-- price x total_price: dois campos independentes — "Preço" e "Valor
-- total" (ex: preço + frete/parcelas). O carrinho soma pelo total_price
-- de cada item (caindo pro price se o total_price não foi preenchido).
-- in_cart: marcado pelo usuário pra entrar no "Carrinho de compras".
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  folder_id uuid not null references folders(id) on delete cascade,
  store_type text not null default 'online',
  photo_path text,           -- opcional
  price numeric,
  total_price numeric,
  measurements text not null default '',
  link text,                 -- opcional
  store text not null default '',
  notes text not null default '',
  in_cart boolean not null default false
);

-- ---------- migração (rode se a tabela items já existia sem store_type) ----------
alter table items add column if not exists store_type text not null default 'online';
alter table items alter column link drop not null;
alter table items drop column if exists name;

-- ---------- migração (pasta especial "Todos os produtos") ----------
alter table folders add column if not exists is_all_products boolean not null default false;
alter table folders alter column photo_path drop not null;
-- garante no máximo uma pasta "Todos os produtos" por projeto
create unique index if not exists folders_one_all_products_per_project
  on folders(project_id) where is_all_products;

-- ---------- migração (pasta marcada como "já comprado") ----------
alter table folders add column if not exists purchased boolean not null default false;

-- ---------- migração (carrinho de compras) ----------
alter table items add column if not exists in_cart boolean not null default false;
create index if not exists items_in_cart_idx on items(project_id) where in_cart;

-- ---------- migração ("Valor total" separado do "Preço") ----------
alter table items add column if not exists total_price numeric;

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
