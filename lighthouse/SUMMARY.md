# Lighthouse

Mediana de 3 execuções por página e perfil. Relatórios HTML e JSON de cada execução em `lighthouse/results/`. Análise em `ARCHITECTURE.md`.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Performance por execução |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Home | Mobile | 90 | 100 | 100 | 100 | 2,79 s | 3,12 s | 45 ms | 0,000 | 88, 90, 90 |
| Detalhe | Mobile | 91 | 100 | 100 | 100 | 2,64 s | 2,91 s | 60 ms | 0,000 | 91, 91, 91 |
| Home | Desktop | 100 | 100 | 100 | 100 | 0,53 s | 0,61 s | 0 ms | 0,000 | 100, 100, 100 |
| Detalhe | Desktop | 100 | 100 | 100 | 100 | 0,53 s | 0,61 s | 0 ms | 0,000 | 100, 100, 100 |

## Ambiente

| Item | Valor |
|---|---|
| Alvo | https://jungle-gaming-frontend-challenge-blue.vercel.app |
| Commit do checkout | `34ee1e3` |
| Data | 2026-11-01T01:12:59.744Z |
| Lighthouse | 12.6.1 |
| Chrome | 156.0.0.0 |
| Node | v24.11.0 |
| Sistema | Linux 7.0.0-38-generic x64 |
| Índice de benchmark | 2615 |
| Condições | Mobile: simulate, RTT 150 ms, 1638.4 kbps, CPU 4x, tela 412x823. Desktop: simulate, RTT 40 ms, 10240 kbps, CPU 1x, tela 1350x940 |

## Cenário

Primeira visita, com perfil novo a cada execução. Cada carregamento registra o service worker do MSW e abre o socket simulado. Build de produção com o cenário `default` dos mocks e o painel ativo, sem `?panel=off` nem qualquer simplificação para a auditoria.
