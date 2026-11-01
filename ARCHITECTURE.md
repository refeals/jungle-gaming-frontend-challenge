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
| `/profile`, `/wallets` | Conta, privados. `/wallets?returnTo=` mostra o link de volta ao pagamento e sobrevive ao login, porque é separado de `redirect` |
| `/login`, `/register` | Redirecionam para `/?auth=login` e `/?auth=register`, preservando `redirect` |

Rota inexistente mostra a tela 404, e erro de renderização mostra a tela de erro com "Tentar novamente".

## Estado do catálogo na URL

A URL é a fonte da verdade do catálogo: `tab`, `collection`, `network`, `minPrice`, `maxPrice`, `sort`, `q` e `page`. A query key deriva dela, então refresh, histórico e links compartilhados restauram a mesma combinação, sem estado paralelo.

- **Serialização própria:** `src/app/search-params.ts` substitui o parser padrão do router, que converte `0.02` em número e grava `12.30` entre aspas. Todo param chega como string, e o valor em ETH fica na URL como foi escrito.
- **Validação tolerante:** valor inválido cai no default, sem quebrar a página. Defaults saem da URL. Página além do total vai para a última, com `replace`.
- **Histórico:** filtros, abas, ordenação e página usam `push`. Busca usa debounce de 300 ms com `replace`. Edição do detalhe usa `replace`.
- **Drawer mobile:** guarda rascunho e aplica tudo em um único `push`. Facets do drawer são lidos com o rascunho, então contagens e faixa de preço acompanham a seleção. O preço entra nessa leitura com debounce de 300 ms, para arrastar o slider não gerar uma requisição por passo.
- **Faixa de preço:** o slider trabalha com inteiros em passos de 0,01 ETH, convertidos por `big.js`. É a única exceção à regra de não passar ETH por `Number`, e URL, API e texto seguem em string.
- **Carregamento:** loader dispara `prefetchQuery` sem `await`, para o hero e o layout não esperarem os mocks. Skeleton, erro e 404 de NFT ficam no componente.
- **Falha em segundo plano:** refetch que falha com dado já carregado mantém a tela como está, sem aviso. Tela de erro só aparece quando não há dado.

## Dialog de autenticação por search param

Login e cadastro são um dialog na rota raiz, controlado pelo param `auth`, sem desmontar a página atual. O estado fica na URL, então voltar no histórico fecha o dialog e recarregar mantém aberto.

`redirect` guarda o destino depois do login. `validateSearch` só aceita caminho interno, comparando a origem depois de `new URL` e rejeitando caminho normalizado que comece com `//`, porque o parser trata `\`, tabulação e `/.//` como host externo. Valores inválidos de `auth` e `redirect` são descartados sem exibir erro.

Abrir e fechar o dialog preserva caminho, hash e posição de rolagem. Aberto por Entrar, fechar volta uma entrada no histórico, sem deixar entrada duplicada. Aberto por URL ou sobre uma URL com hash, fechar usa `replace`, para Voltar não reabrir o dialog e a página não rolar até a âncora.

## Boot de rede

`main.tsx` renderiza imediatamente. `setNetworkReady` registra a promise de inicialização da rede, e o interceptor Axios aguarda essa promise por até 10 s antes de cada requisição. Assim, a primeira pintura não espera o MSW, e nenhuma requisição sai antes de ele estar ativo. Se a espera estourar ou a inicialização falhar, a requisição termina em `network_error` transiente, e a query pode tentar de novo. O socket segue a mesma espera: se ela estourar, a tela mostra "Reconectando...", e a conexão é criada quando a rede ficar pronta, com releitura das queries.

## Banco simulado

Estado em `localStorage`, na chave `kurio.mock.v3`, validado por `mockDb` em `src/mocks/db/schema.ts` a cada leitura. Dado inválido ou de versão antiga recria o seed. Sem `localStorage` disponível, o estado segue em memória.

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
| `GET /nfts/featured` | Não | NFT em destaque, Sage Nomad #009. `404` com `empty-catalog` |
| `GET /nfts/:id/reviews` | Não | `{ items }`, com `id`, `author`, `rating`, `comment`, `createdAt`. Lista determinística, sem envio. `404` |
| `GET /nfts/:id` | Não | `404` |
| `GET /favorites` | Sim | Só do dono |
| `PUT`, `DELETE /favorites/:nftId` | Sim | Idempotentes |
| `GET /cart` | Opcional | Dono ou `X-Cart-Id`. Sem nenhum: vazio, com `id` nulo. `summary` usa a maior taxa entre os itens |
| `POST /cart/items` | Opcional | `201`. Limite `min(available, 10)` |
| `PATCH`, `DELETE /cart/items/:id` | Opcional | `403` se de outro dono |
| `PUT`, `DELETE /cart/coupon` | Opcional | `422 coupon_invalid` ou `coupon_expired` |
| `POST /cart/merge` | Sim | Soma com limite, devolve `adjustments`. Repetir é seguro |
| `POST /quotes` | Sim | Recebe `network` e usa a taxa dela. Vale 5 minutos, e só a última do usuário fica guardada. `409 order_pending` com pedido pendente, `409 availability_conflict` com item indisponível |
| `POST /orders` | Sim | `Idempotency-Key` obrigatório. `201` ao criar, `200` ao repetir. `409` com `quote_stale`, `availability_conflict`, `idempotency_conflict`, `order_pending` ou `wallet_not_connected` |
| `GET /orders/:id` | Sim | `403` se de outro usuário. Liquida pedido vencido antes de responder |
| `GET`, `PATCH /profile` | Sim | `409 email_taken` |
| `PUT`, `DELETE /profile/avatar` | Sim | Limite de 500 KB |
| `POST /profile/password` | Sim | `204`. Senha atual incorreta em `fields.currentPassword` |
| `GET`, `POST /wallets`, `PATCH /wallets/:id` | Sim | Uma por `slot`. Trocar endereço desconecta |
| `POST /wallets/:id/connect`, `/disconnect` | Sim | Conexão vale para a rede e o tipo enviados. O tipo conectado vai para o snapshot do pedido |

### Criação de pedido

A chave é por usuário. Mesma chave e mesmo conteúdo devolvem o pedido existente, e conteúdo diferente devolve `409`. Com chave nova, um pedido pendente do usuário devolve `409 order_pending`, com `details.orderId`. Depois, valida disponibilidade, cotação e carteira, nessa ordem. Item sem disponibilidade não gera cotação nova, porque ela não seria confirmável.

O pedido nasce `pending`, reserva as edições e grava `settleAt` 3 s à frente, com o desfecho já decidido. Liquidação roda em timer, no boot e em `GET /orders/:id`, só sobre pedido pendente, então refresh ou duas abas não liquidam duas vezes. Confirmado tira do carrinho só o comprado. Recusado devolve a reserva e mantém o carrinho. Recibo usa o snapshot gravado no pedido.

## Eventos

Envelope: `{ eventId, type, resourceId, version, data }`, com `eventId` único e estável, formado por tipo, recurso, versão e sequência. A sequência não volta no reset, então ids de evento e de pedido nunca se repetem na mesma aba. Evento sai depois de gravar no banco, e toda mudança em NFT passa por `updateNft()`, que incrementa `version`.

| Evento | Destino | `data` |
|---|---|---|
| `nft.updated` | Todas as conexões | `priceEth`, `previousPriceEth`, `editions` |
| `order.updated` | Só conexões do dono | `status`, `transactionRef` |

Binding aprova a conexão sem validar nada, então cliente emite `session.join` com o token depois de conectar. Token inválido ou expirado deixa a conexão anônima, sem receber `order.updated`.

## Sessão

Token opaco em `localStorage`, enviado como `Authorization: Bearer` pelo interceptor de `src/api/http.ts`. Vale 24h, sem refresh token. O mock roda no navegador e não consegue definir cookie `httpOnly`. Em produção, a recomendação é esse cookie, fora do alcance de JavaScript.

No boot, com token, `GET /session` valida a sessão e o header mostra skeleton até responder. Sem token, nenhuma requisição é feita. Token vencido no boot é apagado, sem aviso, e o usuário segue como visitante.

| Situação | Resultado |
|---|---|
| Rota privada sem sessão | `/?auth=login&redirect=<rota>` |
| `401` em rota privada | Dialog sobre a página, com aviso e `redirect`. Formulário não desmonta |
| Fechar o dialog ou sair da página depois de expirar | `resetPrivateState()` |
| `401` em rota pública | Aviso e estado de visitante, com `resetPrivateState()` |
| Login depois de expirar, mesmo usuário | Queries privadas são refeitas |
| Login depois de expirar, outro usuário | `resetPrivateState()` e `key` por `userId` remonta a página, sem expor rascunho |
| `401` de token que já foi trocado | Ignorado, para resposta antiga não derrubar a sessão nova |
| Falha transitória em `GET /session` no boot | Token fica. Header mostra "Recarregar" e o dialog não abre |
| Token muda em outra aba | Recarrega a aba, para ela não usar o token de outro usuário com o cache anterior |

`resetPrivateState()`, em `src/features/auth/session-reset.ts`, é o único caminho de limpeza, em ordem fixa: desconecta o socket, cancela e remove queries privadas, limpa o cache de mutations, apaga token e `pendingOrderId`, grava sessão nula e reconecta como anônimo. Catálogo fica no cache.

Query keys privadas seguem `["user", userId, recurso]`. O socket emite `session.join` ao conectar, se houver token. Depois do logout, a conexão nova não recebe `order.updated`.

`redirect` só aceita caminho interno, validado em `validateRootSearch`.

## Carrinho

Carrinho sempre vive na API, para visitante e usuário, com os mesmos hooks e endpoints em `src/features/cart/queries.ts`. Visitante é identificado por `kurio.guestCartId` em `localStorage`, enviado em `X-Cart-Id` só quando não há token. O id é o `cart.id` da primeira resposta de escrita.

**Chave por dono:** `["cart", "user:<id>"]`, `["cart", "guest:<id>"]` ou `["cart", "guest:none"]`. O dono vem de `useCartOwner`, que observa sessão e `guestCartId`. Sessão ainda sem resposta não tem dono, e a query fica desligada. Logout e troca de usuário removem tudo sob `["cart"]`, e resposta tardia só grava se aquela chave ainda existir.

**Merge no login:** o token só é gravado depois de `POST /cart/merge`, feito com `Authorization` explícito. Enquanto isso, leituras seguem como visitante, sem levar carrinho privado para chave de visitante. Depois, no mesmo instante, grava token e carrinho, limpa `guestCartId` e publica a sessão. O dialog fecha ao ver a sessão, então o `redirect` sempre encontra o carrinho já somado. Falha não desfaz o login: mantém `guestCartId`, avisa e tenta de novo no próximo boot autenticado. Logout, troca de usuário e sessão expirada descartam o id restante, em qualquer rota, para itens de um merge falho nunca chegarem a outra conta. Enquanto login ou merge estão pendentes, o dialog não fecha. `adjustments` viram um aviso por edição, com `name`, `editionLabel` e `isSoldOut` vindos da API, porque item esgotado pode não estar no carrinho resultante.

**Sem otimismo:** limite e totais vêm da API, então cada linha fica `aria-disabled` durante a mutation, e o clique bloqueado avisa o motivo. Cada resposta traz o carrinho inteiro e grava no cache. Respostas podem chegar fora de ordem, então a última mutation a terminar refaz a leitura.

**Remoção:** sem confirmação, com "Desfazer" no aviso por 8 s. Desfazer readiciona por `POST`, então o item volta ao fim da lista e pode falhar com `409` se a disponibilidade tiver caído. Se o dono mudou, avisa que não é mais possível.

**Resumo:** subtotal, desconto, taxa, total e subtotal de linha vêm da API, e o cliente só formata. Com itens de redes diferentes, `summary.feeEth` usa a maior taxa, por isso o texto "Taxa estimada". A cotação de `POST /quotes` usa a rede escolhida e é a referência para finalizar. Desconto zero aparece como `(-) 00.00`, como no frame.

**Cupom:** persistido no carrinho do mock, então sobrevive a refresh e ao merge, se o usuário não tiver outro. `422` vira erro no campo.

**Alteração em tempo real:** `useNftUpdates` invalida o carrinho, a nova leitura chega e `useCartChanges` a compara com o último carrinho visto em `/cart`, guardado em `["cart", "seen", dono]`. Comparar leituras, em vez de contar eventos, faz o aviso sair uma vez, mesmo com evento duplicado, e cobre alteração recebida fora da página, que aparece ao voltar. Esse registro fica só em memória, sem aviso depois de refresh, e sai com os demais dados privados. Por isso não há listener de socket próprio no carrinho.

**Bloqueio de finalizar:** item esgotado ou com quantidade acima do disponível bloqueia "Conectar e finalizar", com o motivo visível. Item esgotado fica na lista até ser removido. Quantidade acima do disponível oferece "Ajustar para N".

**Reserva:** pedido pendente reduz a disponibilidade do próprio carrinho. O merge do login usa o mesmo limite, somando as unidades reservadas. Cada item traz `reservedQuantity`, e `hasShortage` considera `quantity - reservedQuantity > maxQuantity`. Assim, a própria compra não aparece como falta nem gera aviso de "esgotou", e a linha informa a quantidade reservada. O limite de edição também soma a reserva.

**Cupom expirado:** cupom que venceu sai do cálculo e volta em `expiredCouponCode`, para `/cart` e pagamento explicarem o motivo. Remoção manual limpa o campo, então não se confunde com expiração.

## Pagamento e pedido

**Formulário:** um `useForm` único serve às duas apresentações, com `mode: "onChange"`. Validar no blur inseria o erro entre `mousedown` e `mouseup`, e o layout deslocado fazia o clique em botão abaixo do campo se perder. Em troca, formato inválido aparece já durante a digitação, e campo vazio só atravessado com Tab mostra erro ao enviar. Desktop mostra tudo em uma página, com a revisão em dialog. Mobile usa `?step=details`, `wallet` e `review`, e cada "Continuar" valida só os campos da etapa. Etapa posterior com etapa anterior pendente volta para a primeira pendente. Rascunho fica em `sessionStorage`, por usuário: sobrevive a refresh e a sessão expirada, e é limpo no logout e na confirmação. Recusa mantém o rascunho. Login de outro usuário apaga rascunho e tentativa do anterior, mesmo sem logout, como quando a sessão expira e a página é recarregada.

**Entrada:** `/checkout` só decide depois de uma leitura nova do carrinho. Carrinho vazio ou item em falta volta para `/cart`, inclusive por URL direta e por login com `redirect`. Se essa leitura falhar, mostra erro com "Tentar novamente", em vez de abrir com cache antigo.

**Carteira:** endereço é só leitura, vindo da carteira cadastrada. Nada conecta ao abrir a página. Escolher carteira ou tipo conecta, e mudar a rede pede reconexão. Estados: desconectada, conectando, conectada, recusada e falha, sempre em texto.

**Cotação:** `useQuery` com `POST /quotes`, com chave por usuário, rede e assinatura do carrinho. Mudança real no carrinho ou na rede gera outra cotação. Não há refetch por foco, por montagem nem por `enabled`, com `staleTime: Infinity`, porque cada `POST` cria um `quoteId`. `nft.updated` de item presente, reconexão e vencimento invalidam a query, e o vencimento usa `expiresAt - issuedAt`, porque o relógio do mock não é o do navegador. Enquanto a cotação não bate com o carrinho, "Confirmar compra" fica `aria-disabled`, com o motivo visível. Valores da tela e da revisão vêm só da cotação. O cupom aplicado vem do carrinho, porque é ele que se edita.

**Nova confirmação:** a revisão guarda a cotação que o usuário viu. Se os valores mudarem, mostra anterior e novo, e exige "Confirmar novos valores" antes de "Confirmar compra". O mesmo vale para `409 quote_stale` no envio. Sem mudança de valor, avisa que a cotação foi renovada.

**Idempotência:** a tentativa fica em `localStorage`, por usuário, com `key`, `quoteId`, `isSent`, `input` e `orderId`, e é limpa no logout. A chave só muda com nova cotação ou recusa. Mutation usa `retry: 0` e `scope { id: "cart" }`, em fila com as do carrinho. O clique lê `isMutating` direto do `queryClient`, porque `useIsMutating` atualiza depois.

| Resposta do envio | Comportamento |
|---|---|
| Sucesso | Grava `pendingOrderId` e vai para `/orders/:id` |
| Timeout, rede ou 5xx | Tela "Não confirmamos seu pedido". "Tentar novamente" reenvia a mesma chave e o mesmo corpo, inclusive depois de refresh. Só sai dela com resposta conclusiva: `401` ou outro erro no reenvio mantêm a tela, porque o pedido pode existir |
| `409 quote_stale` | Mostra o que mudou e exige nova confirmação, com nova tentativa |
| `409 availability_conflict` | Volta para `/cart` com aviso |
| `409 order_pending` | Vai para o pedido pendente |
| `409 idempotency_conflict` | Nova tentativa, com pedido de revisão |
| `401` | Dialog de login sobre a página. Formulário e tentativa ficam |

Guardar o corpo enviado é o que recupera o pedido depois de timeout e refresh: sem ele, a mesma chave com corpo reconstruído poderia dar conflito. O cliente nunca altera o carrinho nesses caminhos.

**Estados do pedido:** `/orders/:id` mostra pendente, confirmado ou recusado, sempre a partir de `GET`. Três caminhos levam ao novo estado, e todos terminam em REST:

1. `order.updated` com `version` maior, e pedido não terminal, invalida a query.
2. `refetchInterval` de 5 s enquanto pendente, contra evento perdido.
3. Reconexão ou refresh faz nova leitura.

Antes de invalidar, o evento cancela a leitura em andamento. Sem isso, a primeira leitura, ainda sem dado no cache, seria reaproveitada pelo `invalidateQueries`, e uma resposta `pending` já a caminho esconderia o evento até o polling.

O evento não escreve no cache: assim, nenhuma tela mostra sucesso sem a simulação confirmar, nem com evento forjado. Terminal usa `staleTime: Infinity`, sem polling. Duplicata e evento antigo não têm efeito.

**Efeitos:** ao virar terminal, uma vez por pedido, limpam `pendingOrderId` e tentativa, e invalidam o carrinho. Confirmado também limpa o rascunho. A guarda é a própria presença de `pendingOrderId` ou da tentativa, então refresh e reabrir um recibo antigo não repetem nada.

**Banner:** com `pendingOrderId` e fora da rota do pedido, "Você tem um pedido em processamento", com link. O banner consulta o pedido, sai se ele terminar e avisa o resultado. `403` ou `404` removem o id. Carrega sob demanda, fora do chunk inicial. O id é salvo com o dono: se outro usuário entrar depois de sessão expirada e reload, o id é descartado, e um `redirect` para esse pedido é trocado pela home.

**Recibo:** itens e valores vêm só de `order.snapshot`, então mudança posterior no catálogo não o altera. Referência e data vêm do próprio pedido, sem relação com o catálogo. "Ver no Etherscan" abre o dialog "Link simulado", porque um link real levaria a um hash inexistente. O nome do explorador segue a rede do pedido.

## Cache

Query faz até 2 retries em falha de rede, timeout ou 5xx, com backoff. Nunca repete 4xx. Mutation não tem retry automático e usa `networkMode: "always"`: sem rede, ela falha e avisa, em vez de ficar pausada. Logout offline limpa a sessão local na hora. Se o chunk da home nunca foi carregado, o router tenta recarregar e o navegador mostra a página de sem conexão, já sem sessão. Os `staleTime` por recurso ficam em `src/app/query-client.ts`.

Favoritos são a atualização otimista exigida pelo desafio, em `src/features/favorites/queries.ts`. `onMutate` cancela a query e aplica a mudança, `onError` desfaz só o NFT que falhou, e `onSettled` refaz a leitura quando a última mutation de favorito termina. Qualquer leitura feita nesse meio tempo, por foco, montagem ou reconexão, reaplica as mutations pendentes antes de gravar no cache. Desfazer por NFT, em vez de restaurar a lista inteira, evita apagar a mudança de outro NFT em andamento. O botão recusa clique enquanto a mutation daquele NFT não termina. A resposta da API é ignorada, porque a leitura seguinte é a fonte da verdade.

Perfil tem um botão "Salvar" e dois envios independentes: dados só se mudaram, senha só se preenchida. Falha em um não bloqueia o outro, e cada erro aparece no seu campo. O formulário de senha fica fora do cache de mutations, com `gcTime: 0` e `reset()` depois do envio. Avatar é salvo ao escolher o arquivo: valida tipo e até 500 KB, recorta em quadrado de 256 px em canvas e envia como data URL.

Carteiras têm uma por slot, sem exclusão. "Igual à carteira principal" só aparece ao adicionar a secundária e copia para o formulário os dados da conta: nome de exibição, nome do perfil, e-mail, ENS e código de indicação. Endereço, rede, tipo e apelido são da carteira e ficam em branco, porque duas carteiras com o mesmo endereço não teriam utilidade no pagamento. Nada é salvo nem vinculado. A API recusa endereço já usado na outra carteira do mesmo usuário, além do já usado por outro usuário.

## Reconciliação entre REST e Socket.IO

`SocketProvider` mantém uma conexão única. Espera `waitForNetworkReady()` e importa `socket.io-client` por `import()`, porque `engine.io-client` captura `WebSocket` ao ser avaliado e porque o pacote fica fora do chunk inicial. A conexão emite `session.join` ao conectar, se houver token.

`nft.updated` passa por estas etapas, em `src/features/catalog/use-nft-updates.ts`:

1. Valida com `nftUpdatedEvent`. Inválido é ignorado.
2. Descarta `eventId` já visto, entre os 200 mais recentes.
3. Guarda o evento em `src/realtime/applied-nft-events.ts`.
4. Atualiza detalhe, destaque e listas só onde `version` é maior que a do cache.
5. Invalida carrinho e as cotações que contêm o NFT.

**Versão e REST:** resposta REST iniciada antes de um evento pode chegar depois dele. Por isso, lista, detalhe e destaque passam por `reconcileNft` antes de gravar, e a resposta com versão menor que a de um evento guardado recebe os campos do evento.

**REST vence depois de queda:** `version` recomeça no reset do mock, então a maior versão não pode vencer sempre. O registro de eventos vale só para a conexão atual e é limpo em `disconnect` e `connect_error`. Ao conectar depois de uma queda ou de uma primeira tentativa que falhou, o provider invalida NFTs, carrinho, cotação e pedidos. Evento perdido não é reenviado, e a leitura REST recupera o estado.

**Item em lista:** `nft.updated` muda o card no lugar, sem reordenar nem reavaliar filtros, facets e faixa de preço até o próximo refetch. Um card pode ficar temporariamente fora do filtro aplicado, escolha feita para os cards não saltarem a cada evento.

**Invalidação preservada:** atualizar o cache por evento não renova `dataUpdatedAt` nem limpa `isInvalidated`, e lista sem o NFT do evento não é regravada. Assim, lista inativa invalidada na reconexão ainda refaz o GET ao voltar a ser usada.

**Feedback:** `/nft/:id` anuncia "Preço atualizado para X ETH" e avisa quando a edição selecionada esgota, em toast, sem deslocar o conteúdo. A lista não anuncia cada item. "Reconectando..." aparece enquanto não há conexão, sem bloquear a navegação.

## Cenários de mock

Configuração única em `localStorage`, na chave `kurio.mock.config.v1`, lida a cada requisição. `?scenario=`, o painel e `window.__mocks` escrevem nela por `src/mocks/control.ts`. `route()` aplica latência e falhas antes do handler, e efeitos posteriores depois dele, então nenhum handler conhece cenário, exceto para consultar desfecho de pedido e de carteira.

`emit` altera o banco e emite pelo socket, então REST e evento não divergem. `emitRaw` só envia, e é como se produz duplicata e evento antigo. Nada escreve no cache do cliente.

`edition-sold-out` age na edição do primeiro item do carrinho. Se ela for `ABERTA`, grava `available: 0` com `supply: null`, fora do modelo normal, só para simular a falha.

Conexão bloqueada falha com `error` seguido de `close`, como uma falha real. Fechar sem `error` antes do handshake deixaria o cliente preso até o timeout de 20 s do `socket.io-client`.

Painel e `window.__mocks` ficam no build publicado, porque avaliador usa os cenários lá. O painel carrega por `import()`, só com mocks ativos.

## Testes

Projetos `desktop` (Desktop Chrome, 1440x900) e `mobile` (Pixel 7 em Chromium, com `isMobile`, 390x844 e escala 1), sobre o build de produção com mocks. O perfil mobile usa toque e `hover: none` reais, que mudam o que aparece no card.

Regressão visual em `e2e/visual.spec.ts`: início, detalhe, carrinho e pagamento, nos dois projetos, com seed conhecido, relógio fixo em `2026-09-15T12:00:00Z` e sem painel nem aviso. Antes da captura, espera conexão do socket, fim dos skeletons, fontes e decodificação de todas as imagens. O comparador pesa pouco diferenças em tons muito escuros: trocar o fundo `#140d0a` por `#2a0d0a` passa, enquanto trocar `--primary` falha com 41 mil pixels. Baselines versionadas são de Linux, porque a renderização de fonte muda entre sistemas. Em outro sistema, sem baseline própria, os testes visuais são pulados. `pnpm test:e2e:update` gera as desse sistema.

Acessibilidade em `e2e/11-a11y-keyboard.spec.ts`: compra só por teclado, foco em diálogos e drawer, foco visível, erros associados a campos, regiões anunciadas e `@axe-core/playwright` em cada tela, sem violações `serious` e `critical`.

## Limitações

Sem `localStorage` disponível ou com quota cheia, o mock segue em memória e avisa no console, e as alterações se perdem no reload.

Socket.IO simulado usa `@mswjs/socket.io-binding` sobre `ws.link` do MSW: só transporte WebSocket, um namespace, sem ack e sem binário. O binding não envia ping, então o mock envia `"2"` a cada 25 s. Eventos não cruzam abas.

Ícone de perfil da bottom nav é derivado do contorno exportado, sem os recortes internos, porque o SVG cheio não foi exportado do Figma.

Logout apaga `pendingOrderId`. Quem entra de novo com pedido ainda pendente não vê o banner, porque não há endpoint que liste pedidos. `/checkout` leva ao pedido por `order_pending`, e `/cart` mostra a reserva.

O aviso "Valores mudaram. Atualize a cotação" também aparece por instantes na renovação por reconexão ou vencimento, mesmo quando os valores não mudam.

Evento emitido entre a primeira leitura REST e a primeira conexão bem-sucedida do socket não é recuperado, porque a releitura só roda depois de uma queda ou de uma tentativa que falhou. A janela é curta e só afeta quem emite logo ao abrir a página.

Back/forward cache não funciona com mocks ativos, por causa do service worker do MSW.

`tldts` é substituído por `src/mocks/tldts-stub.ts` no build, por alias em `vite.config.ts`. Ele só é usado por `tough-cookie`, para o armazenamento de cookies do MSW, e o app não usa cookies. O corte tira cerca de 270 KB do chunk de MSW, e `getDomain` passa a devolver os dois últimos rótulos do hostname, sem lista de sufixos públicos.

Em `/nft/*` no mobile, a tab bar fica oculta em todos os estados, inclusive no 404 e na tela de erro, que oferecem link para o catálogo.

Fechar o dialog aberto por Entrar sobre uma URL com hash deixa uma entrada duplicada no histórico, então Voltar precisa de um toque a mais nesse caso.

Logo depois de login com `redirect`, o aviso "Você entrou na sua conta." pode cobrir por alguns segundos a ação principal do pagamento, em telas onde ela fica no canto do aviso. Clique sobre o aviso não chega ao botão, e o ponteiro parado sobre ele pausa o tempo de exibição.

Falha ao gravar no `localStorage` perde a chave de idempotência, e uma nova tentativa pode gerar outra compra. Exige quota cheia ou armazenamento bloqueado.

Pedido criado por um usuário e respondido depois do logout não é registrado. Ele só é reencontrado por `order_pending`.

Falha na chamada de logout é ignorada: a tela sai da conta, mas a sessão segue válida no servidor por até 24 h.

Todo `nft.updated` invalida o carrinho, mesmo com NFT que não está nele. O custo é uma leitura a mais. Pelo mesmo motivo de simplicidade, `quote_stale` grava a cotação nova em todas as entradas de cotação em cache, e a chave `session` não leva `userId`, porque o reset a define como `null`.

Testado em Chromium e, com uma compra completa do login ao recibo, em Firefox 158, sem falhas. O desafio pede só Chromium.

## Lighthouse

Configuração em `lighthouserc.cjs` e `lighthouserc.desktop.cjs`. Notas, versões e condições em `lighthouse/SUMMARY.md`, com os relatórios em `lighthouse/results/`. A medição mira a URL pública, em primeira visita, com perfil novo, mocks ativos e painel visível.

**O que limita o mobile:** a página é um SPA com HTML vazio, então FCP e LCP dependem do JavaScript. O LCP é a imagem do primeiro card, que só existe depois de carregar o app, iniciar o MSW e receber `GET /nfts`. O chunk de MSW soma cerca de 58 KB comprimidos, baixados em toda primeira visita. É efeito direto da exigência de mocks no build de demonstração: em produção real, a resposta viria da rede, sem esse chunk.

**Por que `networkReady`, e não `await worker.start()`:** o app pinta o shell e o hero sem esperar o worker, e só as requisições aguardam. Esperar o worker antes do render atrasaria a primeira pintura junto.

**Resultado:** home mobile atinge a meta com mediana 90, sem folga, com execuções de 88 a 90. Entre deploys, a mediana oscilou de 87 a 90 ao longo do projeto, com o mesmo código de boot. A causa dessa oscilação não foi isolada. Detalhe mobile fica em 91, e os dois desktops em 100.

| Medição na URL pública | Home mobile | LCP | Detalhe mobile | LCP |
|---|---:|---:|---:|---:|
| Antes do ajuste | 88 | 3,29 s | 91 | 2,90 s |
| Depois do ajuste | 90 | 3,12 s | 91 | 2,91 s |

**Ajustes medidos:** comparação relativa em servidor local com HTTP/2 e brotli, medianas de 3 execuções, perfil mobile. O ganho na URL pública foi menor que o local, e o detalhe não mudou nela.

| Ajuste | Home | Detalhe | Decisão |
|---|---|---|---|
| `NewsletterForm` só a 600 px da tela | Performance de 91 para 93, LCP de 2,97 s para 2,74 s | Performance de 93 para 94, LCP de 2,75 s para 2,59 s | Aplicado. Tira formulário, `react-hook-form` e resolver do caminho até o LCP |
| `Toaster` só no primeiro aviso | Performance igual, LCP cerca de 80 ms menor | Sem diferença | Descartado. Ganho dentro do ruído, e a região `aria-live` precisa existir antes do primeiro aviso, para ele ser anunciado |
| `FiltersDrawer` só ao abrir | Não medido | Não medido | Descartado. O chunk é quase todo compartilhado com o `Select` da ordenação |

`Cache-Control` imutável em `/assets` e de 1 dia em `/images` ajuda na segunda visita, sem efeito no cenário auditado.

## Decisões de UX

Itens fora do escopo usam `aria-disabled` e avisam "Em breve", sem navegar nem aparentar sucesso. Newsletter valida o e-mail e também só informa "Em breve".

Mercado aponta para `/#catalog`, e não para `/`, para Início e Mercado não ficarem ativos ao mesmo tempo.

## Desvios do Figma

A página do arquivo se chama "Marketplace de NFTs GreenMint", mas todos os frames usam a marca Kurio, que é a adotada aqui.

Inconsistências do arquivo: "1/10" duplicado no mobile, `tokenId` variando em Violet Nomad, contadores de filtros que não fecham com o catálogo, Início ativo com botão Entrar em perfil e carteiras, telas que exigem sessão, "Arte digital" marcada com a grade mostrando todas as coleções, e alça do slider de preço no meio com o texto indicando a faixa inteira.

O carrinho desktop do Figma mostra Ivory Baron #088 com token `#0552`. O seed deriva o token do número do NFT, `#0088`, igual em toda a aplicação.

O carrinho mobile do Figma mostra Violet Nomad na edição 1/1 com quantidade 2, impossível pelo limite por edição. O seed usa o carrinho desktop, com Violet Nomad 1/50, que fecha em subtotal `26.83` e total `26.846`.

| Item | Figma | Implementação | Motivo |
|---|---|---|---|
| Line-height de texto que quebra | 18/16, menor que a fonte | 1.32, o `lh auto` do arquivo | Evita sobreposição de linhas |
| Gap entre colunas do grid | Auto Layout 32, posição real 34 | 34 | Bate com a largura de 842 |
| Footer abaixo de `md` | Sem frame | Colunas empilhadas | Não perde links nem conteúdo |
| Modal | Sem escurecimento do fundo | Overlay transparente que bloqueia clique | Fidelidade ao frame |
| Favicon | Não existe | "K" em `#140D0A` sobre `#D28A4C` | Derivado da paleta |
| Galeria do detalhe | 4 miniaturas da mesma arte | Arte do NFT seguida das outras 3 | Troca de imagem fica visível |
| Slides 2 e 3 do hero | Só 3 pontos, com 1 slide | Texto e arte dos banners promocionais, troca manual | Pontos com efeito real, sem texto inventado |
| Edição inicial do detalhe | 1/50 selecionada | Primeira disponível, 1/1 no Emerald Ape | Regra de negócio |
| Rótulos do detalhe | "Contrato" mostra royalties, e "Direitos autorais" mostra o endereço | Rótulos corrigidos | Erro do arquivo |
| Criador no detalhe | "Nova Sato" | "O criador recebe 5%" | Contrato não tem criador |
| Detalhe mobile | Sem abas, compartilhar nem carrossel | Abaixo dos atributos, antes do footer | Mantém o conteúdo do desktop |
| Barra de compra mobile | Respiro inferior de 34 | 26, com 8 a mais antes do botão | Espaço para o aviso de limite, sem mudar os 164 de altura |
| Ordenação no mobile | Sem controle | Dentro do drawer de filtros | Exigida pelo desafio |
| Seções da home no mobile | Frame corta na grade | Destaque, paginação, banners, diário, footer | Sem perder conteúdo |
| Descrição do Emerald Ape no mobile | Texto mais curto, citando 1/50 | Mesmo texto do desktop | Uma descrição por NFT, vinda da API |
| Pontos da galeria no mobile | Atrás do painel, sem visibilidade no PNG | Sobre a imagem | Trocar imagem sem miniaturas |
| Quarto card da home mobile | Arte Golden | Cosmic Bloom | Mesma ordem do catálogo desktop |
| Badge do carrinho | 6 com 17 itens | Soma das quantidades, com "99+" acima disso | Contador precisa bater com o carrinho |
| Edição na linha do carrinho desktop | Só ID do token | Token e edição | Item é NFT + edição, e duas edições ficariam iguais |
| Lixeira no carrinho mobile | Sobre o `+` de um item | Em todos os itens, abaixo do stepper | Sobreposição impediria o clique |
| Carrinho mobile abaixo das linhas | Sem recomendados nem footer | Painel `sticky` até o fim das linhas, depois recomendados e footer. Abaixo de 700 px de altura, no fluxo | Sem perder conteúdo nem cobrir linhas em tela baixa |
| Recomendados no carrinho | Inclui NFTs do carrinho | Aba `trending`, sem os NFTs do carrinho | Não recomendar o que já está lá |
| Pontos do hero | Todos iguais, 8 de intervalo | Inativos esmaecidos, com área de toque de 24 | Estado visível e toque em telas pequenas |
| Ações do card no desktop | Sem estado de hover | Favoritar e carrinho, em hover e foco | Ações precisam existir no card, e não há frame do estado |
| Nav em perfil e carteiras | Início ativo e botão Entrar | Nenhum item ativo e menu da conta | Telas exigem sessão |
| Perfil e carteiras no mobile | Sem frame | Coluna única, com abas horizontais no topo | Exigido pelo desafio |
| "Igual à carteira principal" | Radio, sempre visível | Checkbox, só ao adicionar | É de marcar e desmarcar, e copiar sobre carteira salva só serviria para sobrescrevê-la |
| "Adicionar" da carteira principal | Sempre visível | Só sem carteira, e foca o primeiro campo | Uma carteira por slot, sem exclusão |
| Botão X do dialog no mobile | Sem botão | Com botão | Sem ele não há como sair |
| Badge de carteiras no pagamento desktop | Opção de radio | "WalletConnect", como no mobile | O badge não é escolha válida |
| Nome ENS no pagamento | Só o select `.eth` | Select e campo de texto, como em carteiras | Sem o campo, não há onde digitar o nome |
| Linha do resumo do pagamento e do recibo | Só ID do token | Token e edição | Item é NFT + edição |
| Conexão da carteira no desktop | Sem estado nem menu | Texto de estado, ação e menu `⋮` | Simular conexão, recusa e desconexão é requisito |
| "Usar outra carteira?" | Radio | Checkbox com aparência de radio, com a carteira selecionada ao lado | É de marcar e desmarcar |
| Rede no pagamento mobile | Só texto no card | Select na etapa de carteira | Seleção de rede é requisito |
| Etapas de dados e revisão no mobile | Sem frame | Mesmos campos e valores do desktop, em coluna | Exigidas pelo desafio |
| Revisão do pedido no desktop | Sem frame | Dialog aberto por "Confirmar compra", sobre o formulário | Permite revisar sem sair da página |
| Lupa do header | Glifo de 20 px | Cerca de 16,7 px, com o mesmo desenho da busca mobile | Reaproveita o ícone. Sem efeito em uso, mantido para não trocar as baselines na entrega |
| Ícone de Coinbase no pagamento mobile | Carteira arredondada | Outro desenho de carteira | Diferença de asset, sem efeito em uso |
| "Ver no Etherscan" | Link | Dialog "Link simulado" | A transação é simulada, e um link real levaria a um hash inexistente |
| Contadores de filtros | Valores fixos, que não fecham com o catálogo | `facets` calculados pela API, com os demais filtros aplicados | Contagem precisa bater com o resultado |
| Confirmação | Modal sobre fundo vazio | Painel na rota, com header e footer | Rota própria faz refresh funcionar sem lógica especial |
| Confirmação no mobile | Sem frame | Painel em largura total | Exigido pelo desafio |
| Desconto no recibo | Sem linha | Linha só quando há desconto | Total precisa fechar com os valores |
| Selo "Raro" no card desktop | Só no card mobile | Nos dois viewports | Mesmo dado, sem variar por tela |
| Preço anterior no card | Sem risco | Riscado | Indica que o valor não vale mais, sem depender de cor |

## Ajustes de acessibilidade

| Item | Figma | Implementação | Motivo |
|---|---|---|---|
| Erro de formulário | `#ED1B2E`, cerca de 3,4:1 sobre card | `#F0805F`, 6,64:1 | Contraste mínimo de 4.5:1 |
| Alvos da bottom nav | Ícones de 20 px | Área de 44 px | Toque em telas pequenas |
| Botões de quantidade no mobile | 20 de largura | 24 | Alvo mínimo de toque |
| Pontos do hero e do carrossel | 7 a 12 px | Área de 24 px | Alvo mínimo de toque |
| Barras fixas em altura curta | Sem frame | Abaixo de 480 px de altura, `MobileNav` e barra de compra ficam no fim da página | Com zoom de 400% em 1280x720, restam 180 px de altura, e as barras cobririam de 70% a 91% da tela |
