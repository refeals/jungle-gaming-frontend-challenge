import { Link, useCanGoBack, useRouter } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

import { ComingSoonButton } from "@/components/coming-soon-button"
import { ChevronLeftIcon, HeartOutlineIcon, ShopIcon } from "@/components/icons"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { buttonVariants } from "@/components/ui/button"
import type { Nft } from "@/contracts"
import { CollectionCarousel } from "@/features/nft/collection-carousel"
import { EditionPicker } from "@/features/nft/edition-picker"
import {
  getMaxQuantity,
  isEditionAvailable,
  isSoldOut,
  resolveEdition,
} from "@/features/nft/editions"
import { NftGallery } from "@/features/nft/nft-gallery"
import { NftRating } from "@/features/nft/nft-rating"
import { NftTabs } from "@/features/nft/nft-tabs"
import { QuantityStepper } from "@/features/nft/quantity-stepper"
import { ShareLinks } from "@/features/nft/share-links"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

export const DETAIL_COLUMNS =
  "md:mt-3 lg:grid lg:grid-cols-2 lg:gap-8 xl:grid-cols-[573px_595px] xl:justify-between xl:gap-0"
export const MOBILE_HERO =
  "max-md:-mx-6 max-md:bg-[linear-gradient(180deg,var(--card),var(--secondary))] max-md:px-7 max-md:pt-[23px]"
export const DETAIL_SHEET =
  "relative -mx-6 -mt-[30px] rounded-t-[31px] bg-card px-6 pt-8 pb-8 max-lg:md:mt-8 md:mx-0 md:mt-0 md:rounded-none md:bg-transparent md:p-0"
export const BUY_BAR =
  "fixed inset-x-0 bottom-0 z-40 rounded-t-[40px] bg-card px-6 pt-5 pb-[26px] md:hidden"

const ROUND_ACTION =
  "flex size-[35px] items-center justify-center rounded-full border border-border bg-secondary text-primary"

function BackButton() {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  if (canGoBack) {
    return (
      <button
        type="button"
        aria-label="Voltar"
        onClick={() => router.history.back()}
        className={ROUND_ACTION}
      >
        <ChevronLeftIcon className="size-5" />
      </button>
    )
  }

  return (
    <Link to="/" aria-label="Voltar ao início" className={ROUND_ACTION}>
      <ChevronLeftIcon className="size-5" />
    </Link>
  )
}

type NftDetailProps = {
  nft: Nft
  editionId: string | undefined
  onEditionChange: (editionId: string) => void
}

export function NftDetail({ nft, editionId, onEditionChange }: NftDetailProps) {
  const { edition, wasReplaced } = resolveEdition(nft, editionId)
  const [requestedQuantity, setRequestedQuantity] = useState(1)
  const maxQuantity = getMaxQuantity(edition)
  const quantity = Math.min(requestedQuantity, maxQuantity)
  const soldOut = isSoldOut(nft)
  const shownPrice = useRef(nft.priceEth)
  const shownEdition = useRef(edition.id)

  useEffect(() => {
    if (nft.priceEth === shownPrice.current) return
    shownPrice.current = nft.priceEth
    notify(`Preço atualizado para ${nft.priceEth} ETH`)
  }, [nft.priceEth])

  useEffect(() => {
    if (wasReplaced) {
      notify(
        `A edição pedida não está disponível. Mostrando a edição ${edition.label}.`
      )
    }
  }, [edition.label, wasReplaced])

  useEffect(() => {
    if (edition.id === shownEdition.current) return
    const previous = nft.editions.find(
      (item) => item.id === shownEdition.current
    )
    shownEdition.current = edition.id
    if (previous && !isEditionAvailable(previous)) {
      notify(
        `A edição ${previous.label} esgotou. Mostrando a edição ${edition.label}.`
      )
    }
  }, [edition.id, edition.label, nft.editions])

  const buyLabel = soldOut ? "Esgotado" : "COMPRAR"

  return (
    <>
      <div className="hidden md:block">
        <Breadcrumbs
          items={[{ label: "Início", to: "/" }, { label: "Mercado" }]}
        />
      </div>

      <div className={DETAIL_COLUMNS}>
        <div className={MOBILE_HERO}>
          <div className="mb-2 flex justify-between md:hidden">
            <BackButton />
            <ComingSoonButton
              aria-label={`Favoritar ${nft.name}`}
              className={ROUND_ACTION}
            >
              <HeartOutlineIcon className="h-[17px] w-[18px]" />
            </ComingSoonButton>
          </div>
          <NftGallery key={nft.id} nft={nft} />
        </div>

        <div className={DETAIL_SHEET}>
          <div className="flex items-center justify-between gap-3 md:block">
            <h1 className="text-[20px]/4 font-bold md:text-[28px]/[37px]">
              {nft.name}
            </h1>
            <div className="md:mt-3 md:flex md:items-center md:justify-between">
              <p className="hidden items-baseline gap-2 text-[22px]/4 font-bold text-brand-text md:flex">
                {nft.priceEth} ETH
                {nft.previousPriceEth && (
                  <s className="text-[15px] font-normal text-muted-foreground">
                    <span className="sr-only">Preço anterior: </span>
                    {nft.previousPriceEth} ETH
                  </s>
                )}
              </p>
              <NftRating nft={nft} />
            </div>
          </div>
          <hr className="mt-3 hidden border-primary md:block xl:w-[573px]" />

          <h2 className="mt-3 text-[15px]/4 font-bold max-md:sr-only">
            Sobre este NFT:
          </h2>
          <p className="mt-3 text-[14px]/6 text-muted-foreground xl:max-w-[574px]">
            {nft.description}
          </p>

          <div className="mt-3">
            <EditionPicker
              editions={nft.editions}
              value={edition.id}
              onChange={onEditionChange}
            />
          </div>

          <div className="mt-3 hidden items-start justify-between md:flex">
            <div>
              <QuantityStepper
                value={quantity}
                max={maxQuantity}
                onChange={setRequestedQuantity}
                hintClassName="mt-1 min-h-4"
              />
            </div>
            <div className="flex gap-2">
              {soldOut ? (
                <button
                  type="button"
                  disabled
                  className={cn(
                    buttonVariants(),
                    "h-10 w-[130px] px-0 text-[14px]"
                  )}
                >
                  {buyLabel}
                </button>
              ) : (
                <ComingSoonButton
                  className={cn(
                    buttonVariants(),
                    "h-10 w-[130px] px-0 text-[14px]"
                  )}
                >
                  {buyLabel}
                </ComingSoonButton>
              )}
              <ComingSoonButton className="flex h-10 w-[130px] items-center justify-center gap-2 rounded-md border border-primary text-[14px]/5 font-medium text-brand-text">
                <HeartOutlineIcon className="h-[17px] w-[18px]" />
                Favoritar
              </ComingSoonButton>
            </div>
          </div>

          <dl className="mt-3 flex flex-col gap-3 text-[15px]/5 text-subtle-foreground">
            <div className="flex gap-1.5">
              <dt>ID do token:</dt>
              <dd>{nft.tokenId}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Coleção:</dt>
              <dd>{nft.collection}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Atributos:</dt>
              <dd>{nft.attributes.join(", ")}</dd>
            </div>
          </dl>

          <div className="mt-3 hidden md:block">
            <ShareLinks title={nft.name} />
          </div>
        </div>
      </div>

      <div className="mt-8 md:mt-24">
        <NftTabs nft={nft} edition={edition} />
      </div>
      <div className="mt-6 md:hidden">
        <ShareLinks title={nft.name} />
      </div>
      <CollectionCarousel nft={nft} />

      <div data-buy-bar className={BUY_BAR}>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px]/4 font-medium text-muted-foreground">
              Qtd.
            </span>
            <QuantityStepper
              value={quantity}
              max={maxQuantity}
              onChange={setRequestedQuantity}
              hintClassName="absolute top-full left-0 mt-0.5"
            />
          </div>
          <p className="text-[20px]/4 font-bold text-brand-text">
            {nft.priceEth} ETH
          </p>
        </div>
        <div className="mt-7 flex gap-3">
          {soldOut ? (
            <button
              type="button"
              disabled
              className="h-[60px] w-[196px] rounded-[40px] bg-primary text-[16px]/5 font-bold text-primary-foreground disabled:opacity-50"
            >
              Esgotado
            </button>
          ) : (
            <ComingSoonButton className="h-[60px] w-[196px] rounded-[40px] bg-[linear-gradient(135deg,#d28a4c,rgb(210_138_76_/_0.8))] text-[16px]/5 font-bold text-primary-foreground">
              Comprar NFT
            </ComingSoonButton>
          )}
          <ComingSoonButton
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            className="flex size-[60px] items-center justify-center rounded-full border border-border bg-secondary text-primary"
          >
            <ShopIcon className="size-5" />
          </ComingSoonButton>
        </div>
      </div>
    </>
  )
}
