import type * as z from "zod/mini"

import type { apiErrorBody, network, nftCategory } from "@/contracts/common"
import type {
  authResult,
  loginInput,
  registerInput,
  session,
  user,
} from "@/contracts/auth"
import type {
  addCartItemInput,
  cart,
  cartItem,
  cartSummary,
  couponInput,
  mergeCartInput,
  mergeResult,
  updateCartItemInput,
} from "@/contracts/cart"
import type {
  eventEnvelope,
  nftUpdatedEvent,
  orderUpdatedEvent,
} from "@/contracts/events"
import type { favoriteList } from "@/contracts/favorite"
import type {
  edition,
  nft,
  nftFacets,
  nftListQuery,
  nftListResponse,
  nftReview,
} from "@/contracts/nft"
import type {
  collectorDetails,
  createOrderInput,
  order,
  orderSnapshot,
  orderStatus,
} from "@/contracts/order"
import type {
  avatarInput,
  changePasswordInput,
  profile,
  updateProfileInput,
} from "@/contracts/profile"
import type { quote, quoteLine, quoteRequest } from "@/contracts/quote"
import type {
  connectWalletInput,
  wallet,
  walletConnection,
  walletInput,
} from "@/contracts/wallet"

export * from "@/contracts/auth"
export * from "@/contracts/cart"
export * from "@/contracts/common"
export * from "@/contracts/events"
export * from "@/contracts/favorite"
export * from "@/contracts/nft"
export * from "@/contracts/order"
export * from "@/contracts/profile"
export * from "@/contracts/quote"
export * from "@/contracts/wallet"

export type ApiErrorBody = z.infer<typeof apiErrorBody>
export type Network = z.infer<typeof network>
export type NftCategory = z.infer<typeof nftCategory>
export type User = z.infer<typeof user>
export type Session = z.infer<typeof session>
export type AuthResult = z.infer<typeof authResult>
export type LoginInput = z.infer<typeof loginInput>
export type RegisterInput = z.infer<typeof registerInput>
export type Edition = z.infer<typeof edition>
export type Nft = z.infer<typeof nft>
export type NftFacets = z.infer<typeof nftFacets>
export type NftListQuery = z.infer<typeof nftListQuery>
export type NftListResponse = z.infer<typeof nftListResponse>
export type NftReview = z.infer<typeof nftReview>
export type FavoriteList = z.infer<typeof favoriteList>
export type Cart = z.infer<typeof cart>
export type CartItem = z.infer<typeof cartItem>
export type CartSummary = z.infer<typeof cartSummary>
export type AddCartItemInput = z.infer<typeof addCartItemInput>
export type UpdateCartItemInput = z.infer<typeof updateCartItemInput>
export type CouponInput = z.infer<typeof couponInput>
export type MergeCartInput = z.infer<typeof mergeCartInput>
export type MergeResult = z.infer<typeof mergeResult>
export type QuoteRequest = z.infer<typeof quoteRequest>
export type QuoteLine = z.infer<typeof quoteLine>
export type Quote = z.infer<typeof quote>
export type OrderStatus = z.infer<typeof orderStatus>
export type CollectorDetails = z.infer<typeof collectorDetails>
export type CreateOrderInput = z.infer<typeof createOrderInput>
export type OrderSnapshot = z.infer<typeof orderSnapshot>
export type Order = z.infer<typeof order>
export type Profile = z.infer<typeof profile>
export type UpdateProfileInput = z.infer<typeof updateProfileInput>
export type ChangePasswordInput = z.infer<typeof changePasswordInput>
export type AvatarInput = z.infer<typeof avatarInput>
export type Wallet = z.infer<typeof wallet>
export type WalletInput = z.infer<typeof walletInput>
export type ConnectWalletInput = z.infer<typeof connectWalletInput>
export type WalletConnection = z.infer<typeof walletConnection>
export type EventEnvelope = z.infer<typeof eventEnvelope>
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEvent>
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEvent>
