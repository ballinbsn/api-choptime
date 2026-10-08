# api-choptime — API do FutChopp (teste A/B)

Backend do funil FutChopp: recebe o pedido do checkout, **recalcula o preço no servidor**, valida CPF e endereço, grava cada unidade
personalizada (série, time, nome), cria o Pix na Adex (conferindo o valor dentro do código Pix), recebe o webhook da Adex (com assinatura,
sempre reconsultando a Adex) e envia o rastreio. O site (páginas) fica em outro repositório (`lp-choptime`) e chama esta API.

Independente de qualquer outra operação: banco, chaves, webhook, pixel e domínio são só deste teste.

## Railway (o que fazer)
1. Projeto novo → **Deploy from GitHub repo** → `api-choptime`. Node ≥ 24 já está definido no `package.json`.
2. **Volume**: adicione um Volume montado em `/data` e crie a variável `DATA_DIR=/data` (o banco é um arquivo SQLite; sem volume os pedidos somem a cada deploy).
3. **Variáveis** (veja `.env.example`; os valores secretos você mesmo preenche no painel do Railway):

| Variável | Para quê |
|---|---|
| `DATA_DIR=/data` | pasta do banco (volume) |
| `PUBLIC_URL` | endereço público desta API (https://….up.railway.app); vira o webhook da Adex |
| `SITE_URL=https://futchop.shop` | domínio do site |
| `CORS_ORIGIN` | opcional: `https://futchop.shop` (vazio = qualquer site pode chamar) |
| `ADEX_PUBLIC_KEY`, `ADEX_SECRET_KEY` | chaves da Adex **deste teste** |
| `ADEX_WEBHOOK_SECRET` | só se a Adex mostrar um segredo de webhook separado |
| `ADEX_AMOUNT_UNIT=reais` | confirme com o Pix de teste de R$ 1 |
| `UTMIFY_API_TOKEN` | rastreio principal (envia pedido "aguardando" e "pago") |
| `ADMIN_TOKEN` | texto longo e aleatório; libera o painel e o Pix de teste |
| `META_PIXEL_ID`, `META_CAPI_TOKEN` | **opcional / desligado por padrão** |

   **Nunca** crie `ADEX_MOCK` nem `DEBUG_FBQ_STUB` em produção.
4. Na Adex, webhook apontando para `https://<API>/api/webhooks/adex`.
5. Conferir: `https://<API>/health` → `{"ok":true}`.

## Pix de teste de R$ 1 (valida a Adex sem mexer no preço)
`POST https://<API>/api/admin/test-pix` com cabeçalho `Authorization: Bearer <ADMIN_TOKEN>` e corpo `{"amountCents":100}` (entre R$ 1 e R$ 50).
Devolve o código Pix. Pedidos de teste (`FTTEST…`) nunca disparam Meta nem UTMify.

## Pedidos
Painel: `https://<API>/admin/pedidos?token=<ADMIN_TOKEN>` (mostra cada unidade: time, série, nome). JSON: `/api/admin/orders`.

## Rotas
`POST /api/public/create-payment` · `POST /api/public/check-payment-status` · `POST /api/webhooks/adex` · `POST /api/public/meta-capi` ·
`GET /health` · `GET /admin/pedidos` · `GET /api/admin/orders` · `POST /api/admin/test-pix`

## Rastreio (cada ferramenta separada)
- **UTMify** (principal): pixel no navegador = `utmifyPixelId` no `config.js` do **site**; pedidos server-side = `UTMIFY_API_TOKEN` aqui.
- **Meta Pixel/CAPI**: desligado enquanto `META_PIXEL_ID` estiver vazio. Purchase só é enviado depois que a Adex confirma o pagamento.
- TikTok: não usado (o site chama a rota, a API ignora).

## Testes
`npm install && npm test` (nenhuma chamada real de rede).
