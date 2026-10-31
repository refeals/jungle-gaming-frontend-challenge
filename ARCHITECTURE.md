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

## Estado do catálogo na URL

A URL é a fonte da verdade do catálogo: `tab`, `collection`, `network`, `minPrice`, `maxPrice`, `sort`, `q` e `page`. A query key deriva dela, então refresh, histórico e links compartilhados restauram a mesma combinação, sem estado paralelo.

- **Serialização própria:** `src/app/search-params.ts` substitui o parser padrão do router, que converte `0.02` em número e grava `12.30` entre aspas. Todo param chega como string, e o valor em ETH fica na URL como foi escrito.
- **Validação tolerante:** valor inválido cai no default, sem quebrar a página. Defaults saem da URL. Página além do total vai para a última, com `replace`.
- **Histórico:** filtros, abas, ordenação e página usam `push`. Busca usa debounce de 300 ms com `replace`. Edição do detalhe usa `replace`.
- **Drawer mobile:** guarda rascunho e aplica tudo em um único `push`. Facets do drawer são lidos com o rascunho, então contagens e faixa de preço acompanham a seleção.
- **Faixa de preço:** o slider trabalha com inteiros em passos de 0,01 ETH, convertidos por `big.js`. É a única exceção à regra de não passar ETH por `Number`, e URL, API e texto seguem em string.
- **Carregamento:** loader dispara `prefetchQuery` sem `await`, para o hero e o layout não esperarem os mocks. Skeleton, erro e 404 de NFT ficam no componente.
- **Falha em segundo plano:** refetch que falha com dado já carregado mantém a tela como está, sem aviso. Tela de erro só aparece quando não há dado.

## Dialog de autenticação por search param

Login e cadastro são um dialog na rota raiz, controlado pelo param `auth`, sem desmontar a página atual. O estado fica na URL, então voltar no histórico fecha o dialog e recarregar mantém aberto.

`redirect` guarda o destino depois do login. `validateSearch` só aceita caminho interno, comparando a origem depois de `new URL` e rejeitando caminho normalizado que comece com `//`, porque o parser trata `\`, tabulação e `/.//` como host externo. Valores inválidos de `auth` e `redirect` são descartados sem exibir erro.

Abrir e fechar o dialog preserva caminho, hash e posição de rolagem. Aberto por Entrar, fechar volta uma entrada no histórico, sem deixar entrada duplicada. Aberto por URL ou sobre uma URL com hash, fechar usa `replace`, para Voltar não reabrir o dialog e a página não rolar até a âncora.

## Boot de rede

`main.tsx` renderiza imediatamente. `setNetworkReady` registra a promise de inicialização da rede, e o interceptor Axios aguarda essa promise por até 10 s antes de cada requisição. Assim, a primeira pintura não espera o MSW, e nenhuma requisição sai antes de ele estar ativo. Se a espera estourar ou a inicialização falhar, a requisição termina em `network_error` transiente, e a query pode tentar de novo.

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

**Merge no login:** o token só é gravado depois de `POST /cart/merge`, feito com `Authorization` explícito. Enquanto isso, leituras seguem como visitante, sem levar carrinho privado para chave de visitante. Depois, no mesmo instante, grava token e carrinho, limpa `guestCartId` e publica a sessão. O dialog fecha ao ver a sessão, então o `redirect` sempre encontra o carrinho já somado. Falha não desfaz o login: mantém `guestCartId`, avisa e tenta de novo no próximo boot autenticado. Logout e troca de usuário descartam o id restante. Sessão expirada não descarta, porque o visitante continua dono daqueles itens. `adjustments` viram aviso, com `name` vindo da API, porque item esgotado não entra no carrinho resultante.

**Sem otimismo:** limite e totais vêm da API, então cada linha fica `aria-disabled` durante a mutation, e o clique bloqueado avisa o motivo. Cada resposta traz o carrinho inteiro e grava no cache. Respostas podem chegar fora de ordem, então a última mutation a terminar refaz a leitura.

**Remoção:** sem confirmação, com "Desfazer" no aviso por 8 s. Desfazer readiciona por `POST`, então o item volta ao fim da lista e pode falhar com `409` se a disponibilidade tiver caído. Se o dono mudou, avisa que não é mais possível.

**Resumo:** subtotal, desconto, taxa, total e subtotal de linha vêm da API, e o cliente só formata. Com itens de redes diferentes, `summary.feeEth` usa a maior taxa, por isso o texto "Taxa estimada". A cotação de `POST /quotes`, no plano 06, usa a rede escolhida e é a referência para finalizar. Desconto zero aparece como `(-) 00.00`, como no frame.

**Cupom:** persistido no carrinho do mock, então sobrevive a refresh e ao merge, se o usuário não tiver outro. `422` vira erro no campo.

**Alteração em tempo real:** `useNftUpdates` invalida o carrinho, a nova leitura chega e `useCartChanges` a compara com o último carrinho visto em `/cart`, guardado em `["cart", "seen", dono]`. Comparar leituras, em vez de contar eventos, faz o aviso sair uma vez, mesmo com evento duplicado, e cobre alteração recebida fora da página, que aparece ao voltar. Esse registro fica só em memória, sem aviso depois de refresh, e sai com os demais dados privados. Por isso não há listener de socket próprio no carrinho, diferente do `use-cart-live-updates` previsto no plano.

**Bloqueio de finalizar:** item esgotado ou com quantidade acima do disponível bloqueia "Conectar e finalizar", com o motivo visível. Item esgotado fica na lista até ser removido. Quantidade acima do disponível oferece "Ajustar para N".

**Reserva:** pedido pendente reduz a disponibilidade do próprio carrinho. O plano 06 precisa tratar isso para não aparecer como conflito real.

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
5. Invalida carrinho e cotação.

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

## Limitações

Sem `localStorage` disponível ou com quota cheia, o mock segue em memória e avisa no console, e as alterações se perdem no reload.

Socket.IO simulado usa `@mswjs/socket.io-binding` sobre `ws.link` do MSW: só transporte WebSocket, um namespace, sem ack e sem binário. O binding não envia ping, então o mock envia `"2"` a cada 25 s. Eventos não cruzam abas.

Ícone de perfil da bottom nav é derivado do contorno exportado, sem os recortes internos, porque o SVG cheio não foi exportado do Figma.

`/checkout` é um placeholder privado com "Em breve" até o plano 06. `/orders/$orderId` está planejada e hoje mostra a tela 404.

Evento emitido entre a primeira leitura REST e a primeira conexão bem-sucedida do socket não é recuperado, porque a releitura só roda depois de uma queda ou de uma tentativa que falhou. A janela é curta e só afeta quem emite logo ao abrir a página.

Back/forward cache não funciona com mocks ativos, por causa do service worker do MSW.

`tldts` é substituído por `src/mocks/tldts-stub.ts` no build, por alias em `vite.config.ts`. Ele só é usado por `tough-cookie`, para o armazenamento de cookies do MSW, e o app não usa cookies. O corte tira cerca de 270 KB do chunk de MSW, e `getDomain` passa a devolver os dois últimos rótulos do hostname, sem lista de sufixos públicos.

Em `/nft/*` no mobile, a tab bar fica oculta em todos os estados, inclusive no 404 e na tela de erro, que oferecem link para o catálogo.

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
| Ações do card no desktop | Sem estado de hover | Favoritar e carrinho, em hover e foco | Pedido pelo plano, sem frame |
| Nav em perfil e carteiras | Início ativo e botão Entrar | Nenhum item ativo e menu da conta | Telas exigem sessão |
| Perfil e carteiras no mobile | Sem frame | Coluna única, com abas horizontais no topo | Exigido pelo desafio |
| "Igual à carteira principal" | Radio, sempre visível | Checkbox, só ao adicionar | É de marcar e desmarcar, e copiar sobre carteira salva só serviria para sobrescrevê-la |
| "Adicionar" da carteira principal | Sempre visível | Só sem carteira, e foca o primeiro campo | Uma carteira por slot, sem exclusão |
| Botão X do dialog no mobile | Sem botão | Com botão | Sem ele não há como sair |

## Ajustes de acessibilidade

| Item | Figma | Implementação | Motivo |
|---|---|---|---|
| Erro de formulário | `#ED1B2E`, cerca de 3,4:1 sobre card | `#F0805F`, 6,64:1 | Contraste mínimo de 4.5:1 |
| Alvos da bottom nav | Ícones de 20 px | Área de 44 px | Toque em telas pequenas |
| Botões de quantidade no mobile | 20 de largura | 24 | Alvo mínimo de toque |
| Pontos do hero e do carrossel | 7 a 12 px | Área de 24 px | Alvo mínimo de toque |
