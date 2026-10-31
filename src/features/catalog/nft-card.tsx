import { Link } from "@tanstack/react-router"

import { NftImage } from "@/components/nft-image"
import type { Nft } from "@/contracts"
import { AddToCartButton } from "@/features/cart/add-to-cart-button"
import { FavoriteButton } from "@/features/favorites/favorite-button"

export const CARD_FRAME =
  "flex aspect-[175/200] items-start justify-center rounded-[20px] pt-3 md:items-center md:pt-0 bg-[linear-gradient(180deg,var(--card),var(--secondary))] md:aspect-[258/300] md:rounded-none md:bg-card md:bg-none"
export const CARD_IMAGE = "aspect-square w-[96%] rounded-2xl md:w-[97%]"
export const CARD_NAME =
  "mt-2 pl-2 text-[15px]/5 md:mt-3 md:pl-0 md:text-[16px]/4"
export const CARD_PRICE =
  "pl-2 text-[16px]/4 font-bold md:mt-3 md:pl-0 md:text-[18px]/4"

const CARD_ACTION =
  "flex size-7 items-center justify-center rounded-full bg-card text-primary"
const IMAGE_SIZES = "(min-width: 1280px) 250px, (min-width: 768px) 30vw, 46vw"

export function NftCard({ nft }: { nft: Nft }) {
  return (
    <article className="group relative">
      <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block">
        <div className={CARD_FRAME}>
          <NftImage
            image={nft.images[0]}
            sizes={IMAGE_SIZES}
            width={250}
            height={250}
            className={`${CARD_IMAGE} object-cover`}
          />
        </div>
        <h3 className={`${CARD_NAME} truncate`}>{nft.name}</h3>
        <p className={`${CARD_PRICE} flex flex-wrap gap-x-2 text-brand-text`}>
          <span>{nft.priceEth} ETH</span>
          {nft.previousPriceEth && (
            <s className="font-normal text-muted-foreground">
              <span className="sr-only">Preço anterior: </span>
              {nft.previousPriceEth} ETH
            </s>
          )}
        </p>
      </Link>

      {nft.rarity === "rare" && (
        <span className="pointer-events-none absolute top-4 left-0 flex h-8 w-[68px] items-center justify-center bg-primary text-[13px]/4 font-medium text-primary-foreground">
          RARO
        </span>
      )}

      <div className="absolute top-3 right-3 flex flex-col gap-2 transition-opacity md:top-9 md:right-3 md:[@media(hover:hover)]:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <FavoriteButton
          nftId={nft.id}
          nftName={nft.name}
          className={CARD_ACTION}
          iconClassName="h-3.5 w-[15px]"
        />
        <AddToCartButton
          nft={nft}
          className={`${CARD_ACTION} aria-disabled:opacity-50 max-md:hidden`}
        />
      </div>
    </article>
  )
}
