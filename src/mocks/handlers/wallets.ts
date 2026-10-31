import { http } from "msw"
import * as z from "zod/mini"

import {
  connectWalletInput,
  wallet as walletSchema,
  walletConnection,
  walletInput,
} from "@/contracts"
import type { MockDb } from "@/mocks/db/schema"
import { readDb, updateDb } from "@/mocks/db/store"
import { requireUser } from "@/mocks/http/auth"
import { fail, ok, pathParam, readBody, route } from "@/mocks/http/respond"
import { isWalletRejected } from "@/mocks/scenarios/apply"
import { nextId } from "@/mocks/services/ids"

const walletList = z.array(walletSchema)

function findOwnedWallet(db: MockDb, userId: string, walletId: string) {
  const wallet =
    db.wallets.find((item) => item.id === walletId) ??
    fail(404, "not_found", "Carteira não encontrada.")
  if (wallet.userId !== userId) {
    fail(403, "forbidden", "Esta carteira pertence a outro usuário.")
  }
  return wallet
}

function assertAddressAvailable(
  db: MockDb,
  userId: string,
  address: string,
  walletId?: string
) {
  const owner = db.wallets.find(
    (wallet) =>
      wallet.id !== walletId &&
      wallet.address.toLowerCase() === address.toLowerCase()
  )
  if (!owner) return

  const message =
    owner.userId === userId
      ? "Este endereço já está na sua outra carteira."
      : "Este endereço já está em uso."
  fail(409, "wallet_address_taken", message, { fields: { address: message } })
}

export const walletHandlers = [
  http.get(
    "/api/wallets",
    route(({ request }) => {
      const db = readDb()
      const user = requireUser(db, request)
      return ok(
        walletList,
        db.wallets.filter((wallet) => wallet.userId === user.id)
      )
    })
  ),

  http.post(
    "/api/wallets",
    route(async ({ request }) => {
      requireUser(readDb(), request)
      const input = await readBody(request, walletInput)
      const result = updateDb((db) => {
        const user = requireUser(db, request)
        const isSlotTaken = db.wallets.some(
          (wallet) => wallet.userId === user.id && wallet.slot === input.slot
        )
        if (isSlotTaken) {
          fail(409, "wallet_slot_taken", "Esta carteira já foi cadastrada.")
        }
        assertAddressAvailable(db, user.id, input.address)

        const wallet = {
          ...input,
          id: nextId(db, "wallet"),
          userId: user.id,
          status: "disconnected" as const,
          connectedNetwork: null,
          connectedWalletType: null,
        }
        db.wallets.push(wallet)
        return wallet
      })
      return ok(walletSchema, result, { status: 201 })
    })
  ),

  http.patch(
    "/api/wallets/:id",
    route(async ({ request, params }) => {
      requireUser(readDb(), request)
      const input = await readBody(request, walletInput)
      const result = updateDb((db) => {
        const user = requireUser(db, request)
        const wallet = findOwnedWallet(db, user.id, pathParam(params, "id"))
        if (input.slot !== wallet.slot) {
          fail(422, "validation_error", "Verifique os campos informados.", {
            fields: { slot: "A posição da carteira não pode mudar." },
          })
        }
        assertAddressAvailable(db, user.id, input.address, wallet.id)

        const isSameAddress =
          input.address.toLowerCase() === wallet.address.toLowerCase()
        if (!isSameAddress || input.network !== wallet.network) {
          wallet.status = "disconnected"
          wallet.connectedNetwork = null
          wallet.connectedWalletType = null
        }
        Object.assign(wallet, input)
        return wallet
      })
      return ok(walletSchema, result)
    })
  ),

  http.post(
    "/api/wallets/:id/connect",
    route(async ({ request, params }) => {
      requireUser(readDb(), request)
      const input = await readBody(request, connectWalletInput)
      const result = updateDb((db) => {
        const user = requireUser(db, request)
        const wallet = findOwnedWallet(db, user.id, pathParam(params, "id"))
        const isRejected = isWalletRejected()
        wallet.status = isRejected ? "rejected" : "connected"
        wallet.connectedNetwork = isRejected ? null : input.network
        wallet.connectedWalletType = isRejected ? null : input.walletType
        return {
          walletId: wallet.id,
          status: wallet.status,
          network: wallet.connectedNetwork,
          walletType: wallet.connectedWalletType,
        }
      })
      return ok(walletConnection, result)
    })
  ),

  http.post(
    "/api/wallets/:id/disconnect",
    route(({ request, params }) => {
      const result = updateDb((db) => {
        const user = requireUser(db, request)
        const wallet = findOwnedWallet(db, user.id, pathParam(params, "id"))
        wallet.status = "disconnected"
        wallet.connectedNetwork = null
        wallet.connectedWalletType = null
        return {
          walletId: wallet.id,
          status: wallet.status,
          network: null,
          walletType: null,
        }
      })
      return ok(walletConnection, result)
    })
  ),
]
