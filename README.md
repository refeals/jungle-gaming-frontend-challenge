# Kurio: Marketplace de NFTs

Desafio de frontend em React e TypeScript. APIs, autenticação, carteiras e pagamentos são simulados com MSW.

Para avaliar o projeto, comece pelo [guia de avaliação](REVIEWER_GUIDE.md): o que foi feito, decisões, como foi feito, incluindo o uso de IA, e casos de teste passo a passo.

## Setup

Requer Node 24 e pnpm 10.

```bash
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

A aplicação sobe em http://localhost:3000.

## Variáveis de ambiente

| Variável | Valor | Efeito |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` | Com `true`, inicia MSW em paralelo ao primeiro render, e as requisições aguardam o worker por até 10 s |
| `VITE_SOCKET_URL` | `wss://realtime.kurio.test` | Endereço do Socket.IO. Com mocks ativos, a conexão é interceptada na página, sem rede real |

Os valores ficam em `.env.development` e `.env.production`, e `.env.example` documenta as opções.

## Comandos

| Comando | Função |
|---|---|
| `pnpm dev` | Desenvolvimento, na porta 3000 |
| `pnpm build` | Checagem de tipos e build de produção |
| `pnpm preview` | Serve o build de produção |
| `pnpm typecheck` | Checagem de tipos de todos os projetos TypeScript |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm test:e2e` | Playwright, sobre o build de produção |
| `pnpm test:e2e:ui` | Playwright em modo interativo |
| `pnpm test:e2e:update` | Atualiza baselines de regressão visual. As versionadas são de Linux: em outro sistema, os testes visuais são pulados até gerar as baselines dele |
| `pnpm lighthouse` | Auditoria Lighthouse: home e detalhe, mobile e desktop, 3 execuções cada. Veja [Auditoria Lighthouse](#auditoria-lighthouse) |
| `node scripts/optimize-images.mjs` | Regenera as imagens de `public/images/nfts/` a partir de `scripts/nft-sources/` |

## Credenciais fictícias

| E-mail | Senha | Dados |
|---|---|---|
| `collector@kurio.test` | `Kurio@123` | Duas carteiras, favoritos e três itens no carrinho |
| `second@kurio.test` | `Kurio@123` | Uma carteira, um favorito e um item no carrinho |

Cupons: `KURIO10` dá 10% de desconto, e `EXPIRED10` está expirado.

Carrinho de visitante fica em `kurio.guestCartId`, e os itens somam aos da conta ao entrar. Para ver uma alteração em tempo real, abra `/cart` e emita pelo painel, ou pelo console: `__mocks.emit("nft.updated", "emerald-ape-042", { priceEth: "1.29" })`. Para esgotar uma edição: `__mocks.emit("nft.updated", "ivory-baron-088", { editionId: "ivory-baron-088-1-10", available: 0 })`.

## Cenários

Há três formas de controlar os mocks, com a mesma configuração: `?scenario=<nome>` na URL, o painel na borda esquerda da tela e `window.__mocks` no console. O param é salvo e sai da URL, para não interferir no catálogo.

| Cenário | Efeito |
|---|---|
| [`default`](https://kurio.rafaelsiqueira.dev/?scenario=default) | Sucesso, sem latência artificial |
| [`empty-catalog`](https://kurio.rafaelsiqueira.dev/?scenario=empty-catalog) | `GET /nfts` sem itens |
| [`slow`](https://kurio.rafaelsiqueira.dev/?scenario=slow) | 2 s em todas as chamadas |
| [`variable-latency`](https://kurio.rafaelsiqueira.dev/?scenario=variable-latency) | Sequência fixa: 200, 800, 100, 1500 e 400 ms |
| [`out-of-order`](https://kurio.rafaelsiqueira.dev/?scenario=out-of-order) | Primeira busca responde em 1500 ms, e a segunda em 100 ms |
| [`offline`](https://kurio.rafaelsiqueira.dev/?scenario=offline) | Falha de conexão em todo REST. Socket cai pelo painel |
| [`server-error`](https://kurio.rafaelsiqueira.dev/?scenario=server-error) | `503` em leituras |
| [`session-expired`](https://kurio.rafaelsiqueira.dev/?scenario=session-expired) | Próxima chamada privada recebe `401` e encerra a sessão. Catálogo e login não contam |
| [`forbidden`](https://kurio.rafaelsiqueira.dev/?scenario=forbidden) | `403` em recursos privados |
| [`register-conflict`](https://kurio.rafaelsiqueira.dev/?scenario=register-conflict) | Cadastro sempre recebe `409` |
| [`form-validation-error`](https://kurio.rafaelsiqueira.dev/?scenario=form-validation-error) | Perfil e carteira recebem `422` com `fields` |
| [`favorite-fails`](https://kurio.rafaelsiqueira.dev/?scenario=favorite-fails) | Favoritar e desfavoritar recebem `503` |
| [`price-changed`](https://kurio.rafaelsiqueira.dev/?scenario=price-changed) | Preço do primeiro item do carrinho sobe logo depois da próxima cotação, e o pedido recebe `409 quote_stale` |
| [`edition-sold-out`](https://kurio.rafaelsiqueira.dev/?scenario=edition-sold-out) | Edição do primeiro item esgota logo depois da próxima cotação, e o pedido recebe `409 availability_conflict` |
| [`order-timeout`](https://kurio.rafaelsiqueira.dev/?scenario=order-timeout) | Pedido é criado, e a resposta só sai em 11 s, depois do timeout de 10 s. Reenviar com a mesma chave recupera o pedido |
| [`payment-declined`](https://kurio.rafaelsiqueira.dev/?scenario=payment-declined) | Pedido termina recusado, com carrinho intacto |
| [`payment-pending-long`](https://kurio.rafaelsiqueira.dev/?scenario=payment-pending-long) | Pedido fica pendente até comando no painel |
| [`wallet-rejected`](https://kurio.rafaelsiqueira.dev/?scenario=wallet-rejected) | Conexão da carteira é recusada |
| [`quote-error`](https://kurio.rafaelsiqueira.dev/?scenario=quote-error) | `POST /quotes` recebe 503 |
| [`order-error`](https://kurio.rafaelsiqueira.dev/?scenario=order-error) | `POST /orders` recebe 503, sem criar pedido |

`price-changed`, `edition-sold-out`, `order-timeout` e `session-expired` valem uma vez. Selecione de novo para repetir. Cupom inválido e expirado não precisam de cenário: basta usar `NOPE` ou `EXPIRED10`.

`?panel=off` oculta o painel nesta aba, e `?panel=on` traz de volta.

```js
__mocks.scenario("slow")
__mocks.latency(500)
__mocks.emit("nft.updated", "emerald-ape-042", { priceEth: "2.50" })
__mocks.emitRaw(envelope)
__mocks.dropConnection()
__mocks.restoreConnection()
__mocks.settlePending("declined")
__mocks.setClock("2026-09-20T12:00:00.000Z")
__mocks.state()
__mocks.reset()
```

### Reset

"Restaurar seed", no painel, ou `__mocks.reset()`, restauram dados, cenário e latência, e derrubam as conexões do socket, que reconectam sozinhas. Sessões são apagadas, então é preciso entrar de novo.

### Falhas para reproduzir

| Falha | Como |
|---|---|
| Catálogo vazio | Cenário `empty-catalog`, ou uma busca sem resultado. "Limpar filtros" recupera |
| Carregamento lento | Cenário `slow`: skeletons no catálogo e no detalhe, sem deslocar o layout |
| Respostas fora de ordem | Cenário `out-of-order`: busque "a" e depois "ap", e a grade termina em "ap" |
| Falha de leitura | Cenário `server-error`, depois Reset no painel e "Tentar novamente" |
| NFT inexistente | Abra `/nft/inexistente` |
| Edição esgotada e limite | `/nft/lunar-mirage-600` tem edições esgotadas. Em `/nft/emerald-ape-042`, a edição 1/10 para em 4 |
| Queda e retomada do tempo real | Painel: Derrubar, depois Restaurar. Cliente reconecta em até 5 s |
| Evento duplicado ou antigo | `__mocks.emitRaw()` com um envelope já enviado |
| Alteração de preço | Painel: Emitir, ou cenário `price-changed` |
| Reenvio após timeout | Cenário `order-timeout` |
| Falha ao enviar o pedido | Cenário `order-error`, confirme, volte para `default` e "Tentar novamente" |
| Falha na cotação | Cenário `quote-error`, abra o pagamento, volte para `default` e "Tentar novamente" |
| Pedido pendente com refresh | Cenário `payment-pending-long`, recarregue, depois Confirmar ou Recusar no painel |
| Pedido pendente fora da rota | Cenário `payment-pending-long`, vá para a home: o banner leva ao pedido |
| Recusa de pagamento | Cenário `payment-declined`: sem recibo, carrinho intacto |
| Recusa de carteira | Cenário `wallet-rejected`, depois "Tentar novamente" com o cenário `default` |
| Cotação desatualizada | Com a revisão aberta, Emitir preço no painel: bloqueia e pede nova confirmação |
| Sessão expirada no pagamento | Cenário `session-expired`, depois qualquer ação: login sobre a página, com o formulário preservado |

## Auditoria Lighthouse

Requer Google Chrome instalado, ou `CHROME_PATH` apontando para ele. Usa `rm`, então roda em Linux e macOS.

```bash
pnpm lighthouse
LIGHTHOUSE_BASE_URL=https://kurio.rafaelsiqueira.dev pnpm lighthouse
```

Sem variável, faz o build e audita o `vite preview` na porta 4173. Esse servidor não comprime nem usa HTTP/2, e responde `/robots.txt` com o `index.html`. Por isso, performance e SEO ficam abaixo da URL publicada, e o modo local serve só para reproduzir o processo. Com `LIGHTHOUSE_BASE_URL`, audita a URL informada, sem build. Os resultados versionados são da URL pública.

O comando apaga `lighthouse/results/` antes de começar. Se a auditoria falhar, `git checkout -- lighthouse` restaura os relatórios. Execução que falha é repetida até 3 vezes, e o resumo só é gerado com 3 execuções válidas por página e perfil.

Saída: `lighthouse/SUMMARY.md`, com medianas, versões, ambiente e condições, e `lighthouse/results/{mobile,desktop}/`, com HTML e JSON de cada execução. A análise fica em `ARCHITECTURE.md`.

## Deploy

- Aplicação: https://kurio.rafaelsiqueira.dev
- Repositório: https://github.com/refeals/jungle-gaming-frontend-challenge

Publicado na Vercel, com preset Vite. `vercel.json` manda toda rota para `index.html`, exceto worker, imagens e assets. `/assets` tem cache imutável de 1 ano, porque os nomes têm hash, e `/images` tem cache de 1 dia. Os mocks ficam ativos no build de produção, por `.env.production`.
