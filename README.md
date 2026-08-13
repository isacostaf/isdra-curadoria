# ✦ ISDRA

App para organizar as ideias de móveis do seu apê por ambiente/categoria, com fichas completas de cada produto. Multi-projeto: cada projeto tem seu próprio código + senha, pra várias pessoas colaborarem na mesma galeria.

Dados e arquivos ficam no **Supabase** (Postgres + Storage); o deploy é feito no **Vercel**.

## 1. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (se ainda não tiver um).
2. Abra **SQL Editor** → **New query**, cole o conteúdo de [supabase/schema.sql](supabase/schema.sql) e rode. Isso cria as tabelas `projects`, `folders`, `items` e o bucket de Storage `uploads`.
3. Em **Project Settings → API**, copie:
   - **Project URL**
   - a chave **service_role** (não a `anon`/`public` — a `service_role` é secreta, nunca a exponha no navegador)

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env`:
- `SUPABASE_URL` — a Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — a chave service_role
- `JWT_SECRET` — qualquer string aleatória longa. Gere uma com:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

O `.env` nunca é commitado (já está no `.gitignore`).

## 3. Rodar localmente

```bash
npm install
npm start
```

Abra **http://localhost:3210**.

## 4. Migrar dados antigos (se você já usava a versão local)

Se você tem uma pasta `data/db.json` e `uploads/` de uma versão anterior do app (armazenamento local em arquivo), migre tudo para o Supabase com:

```bash
npm run migrate:supabase
```

O script sobe os PDFs e fotos para o Storage e recria os projetos/pastas/itens nas tabelas, preservando os códigos e senhas já existentes. Depois de confirmar no painel do Supabase que os dados chegaram certinho, pode apagar `data/` e `uploads/` locais.

## 5. Deploy no Vercel

1. Suba o repositório para o GitHub (se ainda não estiver lá).
2. Em [vercel.com](https://vercel.com), **Add New → Project**, importe o repositório.
3. Em **Environment Variables**, adicione as três mesmas do `.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`) — cole os mesmos valores usados localmente.
4. Deploy. O Vercel detecta `vercel.json` e roda o app inteiro (`api/index.js`) como Serverless Function, servindo os arquivos de `public/` junto.

Não precisa de build step — é um Express simples.

## Como funciona

- **Tela de entrada**: todo mundo que abre o site precisa digitar o código + senha de um projeto para ver as pastas dele. Cada projeto é isolado dos outros.
- **Criar projeto**: escolha um código (ex: `projeto-ana-luisa`) e uma senha — quem tiver os dois consegue entrar. O código é a própria identidade do projeto, não existe um "nome" separado.
- **Projeto de Arquitetura** e **Caderno de Mobiliário**: dois cards na home para anexar (e visualizar) os PDFs correspondentes.
- **Pastas**: crie uma pasta por item/categoria (ex: "Cadeira da mesa de jantar", "Mesa de jantar"). Nome e foto são obrigatórios.
- Dentro de cada pasta, uma **galeria de produtos**: link é o único campo obrigatório; foto, preço, medidas, loja e observações são opcionais e só aparecem na visão geral se preenchidos.
- Clique num produto para abrir a **ficha completa**, com todos os dados e o link para comprar.
- O menu "⋮" em cada card permite editar ou excluir.

## Onde ficam os dados

- **Tabelas do Supabase** (`projects`, `folders`, `items`) — texto e metadados.
- **Supabase Storage** (bucket `uploads`) — fotos de pastas/itens e os PDFs.
- Sessão de login = um token JWT guardado no `sessionStorage` do navegador (por aba — fechar e abrir de novo pede login outra vez).

Nada fica só na sua máquina: uma vez migrado/deployado, qualquer pessoa com o código + senha certos acessa de qualquer lugar.
