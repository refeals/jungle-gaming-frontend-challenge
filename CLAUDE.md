# Kurio NFT Marketplace: acordo de trabalho

Desafio de código para entrevista. Prazo: 2 dias, 8h por dia (16h no total, sem folga).

Antes de qualquer coisa em uma sessão nova, leia:

1. `_plans/_index.md`: sequência, tetos de tempo e status dos planos
2. `_plans/_decisions.md`: decisões já aprovadas (não rediscutir)
3. `_plans/_challenge.md`: enunciado completo (fonte de verdade dos requisitos)
4. A pasta do plano atual

`_plans/` fica fora do git de propósito. Não commitar `_plans/` nem a alteração do `.gitignore`.

## Ciclo de cada plano

Avise em que passo estamos a cada mudança de passo.

1. Ler os arquivos do plano
2. Implementar cada sub-plano em plan mode
3. Ao fim de cada sub-plano, o usuário testa pelo `04-walkthrough.md`
4. Ao fim de todos os sub-planos, rodar `/code-review` e `/caveman-review` em paralelo, uma vez por plano
5. Escolher as correções junto com o usuário (em geral, o que for "bug" e "risk")
6. Entregar as mensagens de commit no chat, prontas para copiar
7. Entregar o conteúdo de `06-review-prompt.md` para o usuário abrir a sessão externa
8. Corrigir o que a sessão externa devolver

## Regras

- Não commitar. O usuário faz todos os commits.
- Mensagens de commit em inglês, até 60 caracteres, sem `Co-Authored-By` nem atribuição.
- Não tomar decisão sozinho. Suposição nova deve ser validada com o usuário antes de implementar.
- Evitar comentários no código. Perguntar antes de adicionar.
  - Exceção já aprovada: comentário curto explicando por que o token de sessão fica em `localStorage` e não em cookie `httpOnly`.
- Identificadores, arquivos e URLs em inglês. Texto de interface em português.
- Componente, hook e cliente Axios nunca contêm resposta fictícia nem caminho alternativo de negócio. Mock vive só em `src/mocks/`.
- Evento em tempo real sempre sai pelo socket mock e chega por `socket.io-client`. Nunca escrever direto no cache a partir do mock ou do painel.
- Valor em ETH é string decimal em API, cache e UI. Cálculo usa `big.js`. Nunca passa por `Number`.
- Ao concluir um plano, atualizar `README.md` e `ARCHITECTURE.md` na parte que ele tocou.

## Comandos

Definidos no plano 01: `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`, `pnpm lighthouse`.

## Design

Frames em `_plans/_design/{Desktop,Mobile}/`. Valor exato do Figma: consultar `_plans/_design/figma-file.json` e `_plans/_design/assets/`. O que não estiver lá: pedir ao usuário, sem inventar. Token só na extração do 02b, lido de `~/.config/figma/token`, sem imprimir nem copiar.
