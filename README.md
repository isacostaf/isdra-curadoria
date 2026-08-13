# ✦ ISDRA

App local (Node.js + Express) para organizar as ideias de móveis do seu apê por ambiente/categoria, com fichas completas de cada produto.

## Como rodar

```bash
npm install
npm start
```

Depois abra **http://localhost:3210** no navegador (funciona bem no celular também — acesse pelo IP da sua rede local, ex: `http://192.168.0.X:3210`).

Para desenvolvimento com auto-reload:

```bash
npm run dev
```

## Como funciona

- **Projeto de Arquitetura** e **Caderno de Mobiliário**: dois cards na home para anexar (e visualizar) os PDFs correspondentes.
- **Pastas**: crie uma pasta por item/categoria (ex: "Cadeira da mesa de jantar", "Mesa de jantar", "Cadeira cozinha"). Nome e foto são obrigatórios.
- Dentro de cada pasta, uma **galeria de produtos**: adicione o link do produto (único campo obrigatório) e, se quiser, foto, preço, medidas, loja e observações. Só o que você preencher aparece na visão geral do card.
- Clique em qualquer produto para abrir a **ficha completa**, com todos os dados cadastrados e o link para comprar.
- O menu "⋮" em cada card (pasta ou produto) permite editar ou excluir.

## Onde ficam os dados

- `data/db.json` — todas as pastas, itens e referências aos PDFs.
- `uploads/` — arquivos enviados (fotos de pastas/itens e os dois PDFs), organizados em subpastas.

Tudo fica salvo localmente nesta pasta do projeto — não há nenhum serviço externo envolvido. Para fazer backup, basta copiar `data/` e `uploads/`.
# isdra-curadoria
