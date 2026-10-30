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

`redirect` guarda o destino depois do login. `validateSearch` só aceita caminho interno, comparando a origem depois de `new URL`, porque o parser trata `\` e tabulação como parte de um host externo. Valores inválidos de `auth` e `redirect` são descartados sem exibir erro.

Abrir e fechar o dialog preserva caminho, hash e posição de rolagem. Fechar usa `replace`, para Voltar não reabrir o dialog.

## Boot de rede

`main.tsx` renderiza imediatamente. `setNetworkReady` registra a promise de inicialização da rede, e o interceptor Axios aguarda essa promise antes de cada requisição. Assim, a primeira pintura não espera o MSW, e nenhuma requisição sai antes de ele estar ativo.

## Contratos REST

A definir.

## Eventos

A definir.

## Sessão

A definir.

## Carrinho

A definir.

## Cache

Query faz até 2 retries em falha de rede, timeout ou 5xx, com backoff. Nunca repete 4xx. Mutation não tem retry automático. Os `staleTime` por recurso ficam em `src/app/query-client.ts`.

## Reconciliação entre REST e Socket.IO

A definir.

## Limitações

Ícone de perfil da bottom nav é derivado do contorno exportado, sem os recortes internos, porque o SVG cheio não foi exportado do Figma.

Rotas `/cart`, `/favorites` e `/profile` ainda só mostram título, sem guard nem dados.

## Decisões de UX

Itens fora do escopo usam `aria-disabled` e avisam "Em breve", sem navegar nem aparentar sucesso. Newsletter valida o e-mail e também só informa "Em breve".

Mercado aponta para `/#catalog`, e não para `/`, para Início e Mercado não ficarem ativos ao mesmo tempo.

## Desvios do Figma

A página do arquivo se chama "Marketplace de NFTs GreenMint", mas todos os frames usam a marca Kurio, que é a adotada aqui.

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
