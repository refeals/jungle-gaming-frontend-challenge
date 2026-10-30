# Kurio: Marketplace de NFTs

Desafio de frontend em React e TypeScript. APIs, autenticação, carteiras e pagamentos são simulados com MSW.

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
| `VITE_ENABLE_MOCKS` | `true` | Reservada para ativar a camada de mocks. Ainda sem efeito, porque a camada não existe |

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
| `pnpm test:e2e:update` | Atualiza baselines de regressão visual |
| `pnpm lighthouse` | Auditoria Lighthouse. Configuração entra na etapa de entrega |
| `node scripts/optimize-images.mjs` | Regenera as imagens de `public/images/nfts/` a partir de `scripts/nft-sources/` |

## Credenciais fictícias

A definir junto com a camada de mocks.

## Cenários

A definir junto com a camada de mocks.

## Deploy

A definir.
