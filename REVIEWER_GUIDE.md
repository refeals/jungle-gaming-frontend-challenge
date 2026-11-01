# Guia para avaliação

Kurio é um marketplace de NFTs em React e TypeScript. API, sessão, carteiras, pagamento e tempo real são simulados no navegador, então a aplicação publicada funciona sem backend.

- Aplicação: https://jungle-gaming-frontend-challenge-blue.vercel.app
- Login: `collector@kurio.test` ou `second@kurio.test`, com a senha `Kurio@123`
- Instalação e comandos: [README.md](README.md)
- Detalhes técnicos: [ARCHITECTURE.md](ARCHITECTURE.md)

## O que foi feito

- Catálogo com busca, filtros, ordenação e paginação, todos guardados na URL
- Detalhe do NFT com edições, limite de quantidade e atualização em tempo real
- Conta com login, cadastro, sessão expirada, favoritos, perfil e duas carteiras
- Carrinho de visitante e de usuário, com merge no login, cupom e cotação
- Pagamento com idempotência, nova tentativa, pedido pendente, recusa e recibo
- 20 cenários de falha, painel de controle e testes E2E em desktop e mobile, com regressão visual e acessibilidade
- Auditoria Lighthouse versionada em [lighthouse/SUMMARY.md](lighthouse/SUMMARY.md)

## Principais decisões

| Decisão | Motivo |
|---|---|
| A compra só é confirmada pela resposta de `GET /orders/:id` | Evento em tempo real pode ser forjado, repetido ou antigo. Ele só avisa que é preciso reler o pedido |
| Chave de idempotência salva antes do envio | Depois de timeout ou queda, a nova tentativa recupera o mesmo pedido em vez de cobrar duas vezes |
| Valor em ETH é string, e o cálculo usa `big.js` | Evita erro de ponto flutuante. A única exceção é a posição do slider, em passos inteiros |
| URL como fonte de verdade do catálogo | Recarregar, voltar e compartilhar um link restauram a mesma lista |
| Tempo real pelo `socket.io-client`, com protocolo real | O app roda igual com um servidor de verdade: só o mock conhece o mock |
| Mock só em `src/mocks/` | Componentes, hooks e cliente HTTP não têm resposta fictícia nem caminho alternativo de negócio |
| Limpeza única de dados privados ao trocar de usuário | Reduz o risco de dados de uma conta aparecerem em outra |

Desvios do Figma, limitações conhecidas e a análise de performance estão em `ARCHITECTURE.md`.

## Como foi feito

Desenvolvi este projeto com o Claude Code como ferramenta de implementação. Dividi o trabalho em etapas com teto de tempo, validei as principais decisões de produto e arquitetura e fiz todos os commits. As etapas passaram por code review e verificação em navegador real na URL publicada. Decisões, desvios do Figma e limitações estão em `ARCHITECTURE.md`.

## Como controlar a aplicação

O painel de mocks fica na borda esquerda da tela. Ele permite trocar o cenário, definir latência, derrubar o socket, emitir eventos e confirmar ou recusar um pedido pendente.

| Controle | Uso |
|---|---|
| `?scenario=<nome>` | Ativa um cenário pela URL, por exemplo `/?scenario=slow`. A lista completa está no [README](README.md#cenários) |
| `?panel=off`, `?panel=on` | Oculta ou mostra o painel nesta aba |
| "Restaurar seed", duas vezes | Volta dados, cenário e latência ao estado inicial, e encerra a sessão |
| `window.__mocks` | Os mesmos controles no console do navegador |

Comece cada caso abaixo com "Restaurar seed".

## Casos de teste

### 1. Catálogo pela URL

1. Na home, escolha uma coleção e uma rede, e ordene por preço.
2. Recarregue a página e depois use o botão Voltar.

**Esperado:** recarregar mantém filtros e lista. Voltar desfaz a última escolha.

### 2. Compra completa

1. Entre como `collector@kurio.test` e abra o carrinho.
2. Aplique o cupom `KURIO10` e avance para o pagamento.
3. Preencha o código de indicação com `KURIO-1` e conecte a carteira.
4. Clique em "Confirmar compra", revise e confirme.

**Esperado:** o pedido fica em processamento por cerca de 3 s, depois aparece o recibo, e o carrinho fica vazio.

### 3. Evento forjado não confirma a compra

1. Ative o cenário `payment-pending-long` e faça a compra do caso 2.
2. Na tela de processamento, rode no console:

   ```js
   __mocks.emitRaw({
     type: "order.updated",
     resourceId: __mocks.state().orders[0].id,
     eventId: "forged",
     version: 99,
     data: { status: "confirmed", transactionRef: "0xforged" },
   })
   ```

3. Depois, clique em "Confirmar" no painel.

**Esperado:** o evento não muda a tela. O recibo só aparece depois de "Confirmar", sem `0xforged`.

### 4. Pagamento recusado

1. Ative o cenário `payment-declined` e faça a compra.

**Esperado:** aparece "Pagamento recusado", sem recibo, com os itens ainda no carrinho.

### 5. Nova tentativa sem compra duplicada

1. Ative o cenário `order-timeout` e confirme a compra.
2. Aguarde a tela "Não confirmamos seu pedido", cerca de 10 s.
3. Clique em "Tentar novamente".

**Esperado:** a tentativa abre o mesmo pedido, e `__mocks.state().orders` tem um único item.

### 6. Preço e disponibilidade em tempo real

1. Abra `/nft/emerald-ape-042?edition=emerald-ape-042-1-10` e rode no console:

   ```js
   __mocks.emit("nft.updated", "emerald-ape-042", { priceEth: "2.50" })
   __mocks.emit("nft.updated", "emerald-ape-042", {
     editionId: "emerald-ape-042-1-10",
     available: 0,
   })
   ```

**Esperado:** o preço muda sem recarregar. A edição 1/10 fica esgotada, a página passa para outra edição, e um único aviso explica a troca.

### 7. Queda do tempo real

1. Na home, clique em "Derrubar" no painel.
2. Emita um novo preço para `emerald-ape-042`.
3. Clique em "Restaurar".

**Esperado:** aparece "Reconectando...", e o card não muda durante a queda. Ao reconectar, o valor vem pela API.

### 8. Sessão expirada

1. Entre, abra o pagamento e edite o nome de exibição.
2. Ative o cenário `session-expired` e clique em "Confirmar compra".
3. Entre de novo com a mesma conta.

**Esperado:** o login abre sobre a página, e o formulário mantém o texto digitado.

### 9. Isolamento entre usuários

1. Entre como `collector@kurio.test` e abra favoritos, carrinho e perfil.
2. Saia e entre como `second@kurio.test`.
3. Abra as mesmas páginas.

**Esperado:** nenhum dado da primeira conta aparece.

### 10. Carrinho de visitante

1. Sem login, adicione `/nft/sage-nomad-009` ao carrinho.
2. Entre como `collector@kurio.test`.

**Esperado:** o item se soma aos três que a conta já tinha.

### 11. Estados de carregamento e erro

1. Ative o cenário `slow` e recarregue a home.
2. Ative o cenário `empty-catalog` e recarregue.
3. Abra `/nft/inexistente`.

**Esperado:** skeletons sem deslocar o layout, estado vazio com "Limpar filtros" e tela de NFT não encontrado.

## Testes automatizados

```bash
pnpm install
pnpm exec playwright install chromium
pnpm test:e2e
```

A suíte roda sobre o build de produção, nos projetos desktop e mobile. Fora de Linux, os testes visuais são pulados, porque as baselines versionadas são de Linux.
