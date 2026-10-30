import * as z from "zod/mini"

export const scenarioName = z.enum([
  "default",
  "empty-catalog",
  "slow",
  "variable-latency",
  "out-of-order",
  "offline",
  "server-error",
  "session-expired",
  "forbidden",
  "register-conflict",
  "form-validation-error",
  "favorite-fails",
  "price-changed",
  "edition-sold-out",
  "order-timeout",
  "payment-declined",
  "payment-pending-long",
  "wallet-rejected",
])

export type ScenarioName = z.infer<typeof scenarioName>

export const scenarioDescriptions: Record<ScenarioName, string> = {
  default: "Sucesso, sem latência artificial",
  "empty-catalog": "Catálogo sem itens",
  slow: "2 s em todas as chamadas",
  "variable-latency": "Sequência fixa de atrasos",
  "out-of-order": "Primeira busca demora mais que a segunda",
  offline: "Falha de conexão em todo REST",
  "server-error": "503 em leituras",
  "session-expired": "Próxima chamada privada recebe 401",
  forbidden: "403 em recursos privados",
  "register-conflict": "Cadastro sempre recebe 409",
  "form-validation-error": "Perfil e carteira recebem 422",
  "favorite-fails": "Favoritar recebe 503",
  "price-changed": "Preço muda depois da próxima cotação",
  "edition-sold-out": "Edição esgota depois da próxima cotação",
  "order-timeout": "Pedido é criado, e resposta passa do timeout",
  "payment-declined": "Pedido termina recusado",
  "payment-pending-long": "Pedido fica pendente até comando no painel",
  "wallet-rejected": "Conexão da carteira é recusada",
}
