# Arquitetura

## Estrutura de pastas

```
src/
  app/         query client, router e providers
  routes/      rotas file-based do TanStack Router
  contracts/   tipos compartilhados entre transporte, estado e interface
  api/         cliente Axios e erros de API
  features/    código por domínio de negócio
  realtime/    conexão Socket.IO e tratamento de eventos
  components/  componentes compartilhados e shadcn/ui
  lib/         utilitários sem regra de negócio
  mocks/       handlers MSW, fixtures e cenários
e2e/           testes Playwright
```

`routeTree.gen.ts` é gerado pelo plugin do router e fica versionado, porque `pnpm build` checa tipos antes de rodar o Vite.

## Rotas

| Rota | Conteúdo |
|---|---|
| `/` | Home, com catálogo e search params |
| `/nft/$nftId` | Detalhe |
| `/cart` | Carrinho |
| `/checkout` | Pagamento, privado |
| `/orders/$orderId` | Estado e recibo, privado |
| `/favorites` | Favoritos, privado |
| `/profile`, `/wallets` | Conta, privados |
| `/login`, `/register` | Redirecionam para `/?auth=login` e `/?auth=register`, preservando `redirect` |

Rota inexistente mostra a tela 404, e erro de renderização mostra a tela de erro com "Tentar novamente".

## Dialog de autenticação por search param

Login e cadastro são um dialog na rota raiz, controlado pelo param `auth`, sem desmontar a página atual. O estado fica na URL, então voltar no histórico fecha o dialog e recarregar mantém aberto.

`redirect` guarda o destino depois do login. `validateSearch` só aceita caminho interno, comparando a origem depois de `new URL` e rejeitando caminho normalizado que comece com `//`, porque o parser trata `\`, tabulação e `/.//` como host externo. Valores inválidos de `auth` e `redirect` são descartados sem exibir erro.

Abrir e fechar o dialog preserva caminho, hash e posição de rolagem. Aberto por Entrar, fechar volta uma entrada no histórico, sem deixar entrada duplicada. Aberto por URL ou sobre uma URL com hash, fechar usa `replace`, para Voltar não reabrir o dialog e a página não rolar até a âncora.

## Boot de rede

`main.tsx` renderiza imediatamente. `setNetworkReady` registra a promise de inicialização da rede, e o interceptor Axios aguarda essa promise por até 10 s antes de cada requisição. Assim, a primeira pintura não espera o MSW, e nenhuma requisição sai antes de ele estar ativo. Se a espera estourar ou a inicialização falhar, a requisição termina em `network_error` transiente, e a query pode tentar de novo.

## Banco simulado

Estado em `localStorage`, na chave `kurio.mock.v1`, validado por `mockDb` em `src/mocks/db/schema.ts` a cada leitura. Dado inválido ou de versão antiga recria o seed. Sem `localStorage` disponível, o estado segue em memória.

O relógio do mock parte de `2026-09-15T12:00:00.000Z` e avança em tempo real, a partir do instante em que o banco é criado. Isso mantém o seed determinístico e deixa sessão, cotação e liquidação de pedido com tempo correndo.

## Contratos REST

Schemas em `src/contracts/`, com `zod/mini`, usados por handler, cliente e formulário. Valores em ETH são strings decimais, e cálculo no mock usa `big.js`.

O param `collection` do catálogo filtra `Nft.category`, com as 9 categorias do filtro. `Nft.collection` é o nome de exibição, como `Kurio Apes`.

Erro padrão:

```ts
{ error: { code: string, message: string, fields?: Record<string, string>, details?: unknown } }
```

| Status | `code` | Uso |
|---|---|---|
| 400, 422 | `validation_error` | Campo inválido, com `fields` |
| 401 | `invalid_credentials` | E-mail ou senha incorretos no login |
| 401 | `session_invalid` | Sem sessão ou expirada |
| 403 | `forbidden` | Recurso de outro usuário |
| 404 | `not_found` | Recurso inexistente |
| 409 | `email_taken`, `wallet_address_taken`, `wallet_slot_taken`, `wallet_not_connected`, `availability_conflict`, `quote_stale`, `idempotency_conflict` | Conflitos. `quote_stale` traz a nova cotação em `details`, e `availability_conflict` traz os itens |
| 422 | `coupon_invalid`, `coupon_expired` | Cupom |
| 500 | `server_error` | Erro inesperado no handler |
| 503 | `service_unavailable` | Falha transitória |

Base `/api`, com `Authorization: Bearer` nas rotas privadas. Em rota de auth opcional, Bearer inválido devolve `401`, sem cair para visitante.

| Método e rota | Auth | Observações |
|---|---|---|
| `POST /auth/register` | Não | `201`. `409 email_taken` |
| `POST /auth/login` | Não | `401 invalid_credentials`, com mensagem genérica |
| `POST /auth/logout` | Sim | `204` |
| `GET /session` | Sim | `401` se expirada, validade de 24h |
| `GET /nfts` | Não | `tab`, `collection`, `network`, `minPrice`, `maxPrice`, `sort`, `q`, `page`. 9 por página, com `facets` |
| `GET /nfts/:id` | Não | `404` |
| `GET /favorites` | Sim | Só do dono |
| `PUT`, `DELETE /favorites/:nftId` | Sim | Idempotentes |
| `GET /cart` | Opcional | Dono ou `X-Cart-Id`. Sem nenhum: vazio, com `id` nulo. `summary` usa a maior taxa entre os itens |
| `POST /cart/items` | Opcional | `201`. Limite `min(available, 10)` |
| `PATCH`, `DELETE /cart/items/:id` | Opcional | `403` se de outro dono |
| `PUT`, `DELETE /cart/coupon` | Opcional | `422 coupon_invalid` ou `coupon_expired` |
| `POST /cart/merge` | Sim | Soma com limite, devolve `adjustments`. Repetir é seguro |
| `POST /quotes` | Sim | Recebe `network` e usa a taxa dela. Vale 5 minutos, e só a última do usuário fica guardada |
| `POST /orders` | Sim | `Idempotency-Key` obrigatório. `201` ao criar, `200` ao repetir |
| `GET /orders/:id` | Sim | `403` se de outro usuário. Liquida pedido vencido antes de responder |
| `GET`, `PATCH /profile` | Sim | `409 email_taken` |
| `PUT`, `DELETE /profile/avatar` | Sim | Limite de 500 KB |
| `POST /profile/password` | Sim | `204`. Senha atual incorreta em `fields.currentPassword` |
| `GET`, `POST /wallets`, `PATCH /wallets/:id` | Sim | Uma por `slot`. Trocar endereço desconecta |
| `POST /wallets/:id/connect`, `/disconnect` | Sim | Conexão vale para a rede enviada |

### Criação de pedido

A chave é por usuário. Mesma chave e mesmo conteúdo devolvem o pedido existente, e conteúdo diferente devolve `409`. Depois, valida disponibilidade, cotação e carteira, nessa ordem. Item sem disponibilidade não gera cotação nova, porque ela não seria confirmável.

O pedido nasce `pending`, reserva as edições e grava `settleAt` 3 s à frente, com o desfecho já decidido. Liquidação roda em timer, no boot e em `GET /orders/:id`, só sobre pedido pendente, então refresh ou duas abas não liquidam duas vezes. Confirmado tira do carrinho só o comprado. Recusado devolve a reserva e mantém o carrinho. Recibo usa o snapshot gravado no pedido.

## Eventos

Envelope: `{ eventId, type, resourceId, version, data }`, com `eventId` único e estável, formado por tipo, recurso, versão e sequência. A sequência não volta no reset, então ids de evento e de pedido nunca se repetem na mesma aba. Evento sai depois de gravar no banco, e toda mudança em NFT passa por `updateNft()`, que incrementa `version`.

| Evento | Destino | `data` |
|---|---|---|
| `nft.updated` | Todas as conexões | `priceEth`, `previousPriceEth`, `editions` |
| `order.updated` | Só conexões do dono | `status`, `transactionRef` |

Binding aprova a conexão sem validar nada, então cliente emite `session.join` com o token depois de conectar. Token inválido ou expirado deixa a conexão anônima, sem receber `order.updated`.

## Sessão

A definir.

## Carrinho

A definir.

## Cache

Query faz até 2 retries em falha de rede, timeout ou 5xx, com backoff. Nunca repete 4xx. Mutation não tem retry automático. Os `staleTime` por recurso ficam em `src/app/query-client.ts`.

## Reconciliação entre REST e Socket.IO

A definir.

## Cenários de mock

Configuração única em `localStorage`, na chave `kurio.mock.config.v1`, lida a cada requisição. `?scenario=`, o painel e `window.__mocks` escrevem nela por `src/mocks/control.ts`. `route()` aplica latência e falhas antes do handler, e efeitos posteriores depois dele, então nenhum handler conhece cenário, exceto para consultar desfecho de pedido e de carteira.

`emit` altera o banco e emite pelo socket, então REST e evento não divergem. `emitRaw` só envia, e é como se produz duplicata e evento antigo. Nada escreve no cache do cliente.

`edition-sold-out` age na edição do primeiro item do carrinho. Se ela for `ABERTA`, grava `available: 0` com `supply: null`, fora do modelo normal, só para simular a falha.

Conexão bloqueada falha com `error` seguido de `close`, como uma falha real. Fechar sem `error` antes do handshake deixaria o cliente preso até o timeout de 20 s do `socket.io-client`.

Painel e `window.__mocks` ficam no build publicado, porque avaliador usa os cenários lá. O painel carrega por `import()`, só com mocks ativos.

## Limitações

Sem `localStorage` disponível ou com quota cheia, o mock segue em memória e avisa no console, e as alterações se perdem no reload.

Socket.IO simulado usa `@mswjs/socket.io-binding` sobre `ws.link` do MSW: só transporte WebSocket, um namespace, sem ack e sem binário. O binding não envia ping, então o mock envia `"2"` a cada 25 s. Eventos não cruzam abas.

Ícone de perfil da bottom nav é derivado do contorno exportado, sem os recortes internos, porque o SVG cheio não foi exportado do Figma.

Rotas `/cart`, `/favorites` e `/profile` ainda só mostram título, sem guard nem dados. `/nft/$nftId`, `/checkout`, `/orders/$orderId` e `/wallets` estão planejadas e hoje mostram a tela 404.

Fechar o dialog aberto por Entrar sobre uma URL com hash deixa uma entrada duplicada no histórico, então Voltar precisa de um toque a mais nesse caso.

## Decisões de UX

Itens fora do escopo usam `aria-disabled` e avisam "Em breve", sem navegar nem aparentar sucesso. Newsletter valida o e-mail e também só informa "Em breve".

Mercado aponta para `/#catalog`, e não para `/`, para Início e Mercado não ficarem ativos ao mesmo tempo.

## Desvios do Figma

A página do arquivo se chama "Marketplace de NFTs GreenMint", mas todos os frames usam a marca Kurio, que é a adotada aqui.

Inconsistências do arquivo: "1/10" duplicado no mobile, `tokenId` variando em Violet Nomad, contadores de filtros que não fecham com o catálogo, e Início ativo com botão Entrar em perfil e carteiras, telas que exigem sessão.

O carrinho mobile do Figma mostra Violet Nomad na edição 1/1 com quantidade 2, impossível pelo limite por edição. O seed usa o carrinho desktop, com Violet Nomad 1/50, que fecha em subtotal `26.83` e total `26.846`.

| Item | Figma | Implementação | Motivo |
|---|---|---|---|
| Line-height de texto que quebra | 18/16, menor que a fonte | 1.32, o `lh auto` do arquivo | Evita sobreposição de linhas |
| Gap entre colunas do grid | Auto Layout 32, posição real 34 | 34 | Bate com a largura de 842 |
| Footer abaixo de `md` | Sem frame | Colunas empilhadas | Não perde links nem conteúdo |
| Modal | Sem escurecimento do fundo | Overlay transparente que bloqueia clique | Fidelidade ao frame |
| Favicon | Não existe | "K" em `#140D0A` sobre `#D28A4C` | Derivado da paleta |

## Ajustes de acessibilidade

| Item | Figma | Implementação | Motivo |
|---|---|---|---|
| Erro de formulário | `#ED1B2E`, cerca de 3,4:1 sobre card | `#F0805F`, 6,64:1 | Contraste mínimo de 4.5:1 |
| Alvos da bottom nav | Ícones de 20 px | Área de 44 px | Toque em telas pequenas |
