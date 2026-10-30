import { useEffect, useRef, useState, type KeyboardEvent } from "react"

import { ethAmount } from "@/contracts"
import { mockControl } from "@/mocks/control"
import { scenarioDescriptions, scenarioName } from "@/mocks/scenarios"

const REFRESH_INTERVAL_MS = 1000

const fieldClass =
  "w-full rounded border border-neutral-500 bg-neutral-800 px-2 py-1.5 text-sm text-white"
const buttonClass =
  "rounded border border-neutral-400 px-2 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"

export function MockPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirmingReset, setIsConfirmingReset] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [nftId, setNftId] = useState("")
  const [priceEth, setPriceEth] = useState("")
  const [, setRevision] = useState(0)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const timer = setInterval(
      () => setRevision((revision) => revision + 1),
      REFRESH_INTERVAL_MS
    )
    return () => clearInterval(timer)
  }, [isOpen])

  const { mock, nfts, orders } = mockControl.state()
  const selectedNftId = nftId || nfts[0]?.id
  const pendingCount = orders.filter(
    (order) => order.status === "pending"
  ).length

  function run(action: () => void, message: string) {
    action()
    setFeedback(message)
    setRevision((revision) => revision + 1)
  }

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key !== "Escape") return
    setIsOpen(false)
    toggleRef.current?.focus()
  }

  function emitPrice() {
    if (!ethAmount.safeParse(priceEth).success) {
      setFeedback("Informe um preço válido, como 1.25.")
      return
    }
    run(
      () => mockControl.emit("nft.updated", selectedNftId, { priceEth }),
      "nft.updated emitido."
    )
  }

  function resetAll() {
    if (!isConfirmingReset) {
      setIsConfirmingReset(true)
      return
    }
    setIsConfirmingReset(false)
    run(() => mockControl.reset(), "Seed restaurado.")
  }

  return (
    <aside
      aria-label="Painel de mocks"
      onKeyDown={closeOnEscape}
      className="fixed top-1/2 left-0 z-[100] flex -translate-y-1/2 items-center text-white"
    >
      {isOpen && (
        <div
          id="mock-panel-content"
          className="flex max-h-[80vh] w-72 max-w-[calc(100vw-3rem)] flex-col gap-3 overflow-y-auto rounded-r border border-neutral-600 bg-neutral-900 p-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="mock-scenario" className="text-sm">
              Cenário
            </label>
            <select
              id="mock-scenario"
              value={mock.scenario}
              className={`${fieldClass} ${focusClass}`}
              onChange={(event) =>
                run(
                  () => mockControl.scenario(event.target.value),
                  `Cenário ${event.target.value} ativo.`
                )
              }
            >
              {scenarioName.options.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-300">
              {scenarioDescriptions[mock.scenario]}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="mock-latency" className="text-sm">
              Latência adicional (ms)
            </label>
            <input
              id="mock-latency"
              type="number"
              min={0}
              step={100}
              value={mock.latencyMs}
              className={`${fieldClass} ${focusClass}`}
              onChange={(event) =>
                run(
                  () => mockControl.latency(Number(event.target.value)),
                  "Latência atualizada."
                )
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm">
              Conexão:{" "}
              {mock.connectionBlocked
                ? "bloqueada"
                : `${mock.connectionCount} ativa(s)`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={`${buttonClass} ${focusClass}`}
                disabled={mock.connectionBlocked}
                onClick={() =>
                  run(() => mockControl.dropConnection(), "Conexão derrubada.")
                }
              >
                Derrubar
              </button>
              <button
                type="button"
                className={`${buttonClass} ${focusClass}`}
                disabled={!mock.connectionBlocked}
                onClick={() =>
                  run(
                    () => mockControl.restoreConnection(),
                    "Conexão restaurada."
                  )
                }
              >
                Restaurar
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="mock-nft" className="text-sm">
              Emitir nft.updated
            </label>
            <select
              id="mock-nft"
              value={selectedNftId}
              className={`${fieldClass} ${focusClass}`}
              onChange={(event) => setNftId(event.target.value)}
            >
              {nfts.map((nft) => (
                <option key={nft.id} value={nft.id}>
                  {nft.name} ({nft.priceEth} ETH)
                </option>
              ))}
            </select>
            <label htmlFor="mock-price" className="text-sm">
              Novo preço (ETH)
            </label>
            <input
              id="mock-price"
              inputMode="decimal"
              value={priceEth}
              className={`${fieldClass} ${focusClass}`}
              onChange={(event) => setPriceEth(event.target.value)}
            />
            <button
              type="button"
              className={`${buttonClass} ${focusClass}`}
              onClick={emitPrice}
            >
              Emitir
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm">Pedidos pendentes: {pendingCount}</span>
            <div className="flex gap-2">
              <button
                type="button"
                className={`${buttonClass} ${focusClass}`}
                disabled={pendingCount === 0}
                onClick={() =>
                  run(
                    () => mockControl.settlePending("confirmed"),
                    "Pedidos confirmados."
                  )
                }
              >
                Confirmar
              </button>
              <button
                type="button"
                className={`${buttonClass} ${focusClass}`}
                disabled={pendingCount === 0}
                onClick={() =>
                  run(
                    () => mockControl.settlePending("declined"),
                    "Pedidos recusados."
                  )
                }
              >
                Recusar
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`${buttonClass} ${focusClass}`}
            onClick={resetAll}
          >
            {isConfirmingReset ? "Confirmar reset do seed" : "Restaurar seed"}
          </button>

          <p role="status" className="min-h-4 text-xs text-neutral-300">
            {feedback}
          </p>
        </div>
      )}

      <button
        ref={toggleRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="mock-panel-content"
        aria-label={`Mock: ${mock.scenario}, painel de mocks`}
        className={`w-6 rounded-r border border-l-0 border-neutral-500 bg-neutral-900 px-4 text-xs leading-none text-white [writing-mode:vertical-rl] ${focusClass}`}
        onClick={() => {
          setIsConfirmingReset(false)
          setIsOpen((open) => !open)
        }}
      >
        Mock: {mock.scenario}
      </button>
    </aside>
  )
}
