import { useState } from "react"

import { SearchIcon } from "@/components/icons"
import { NftImage } from "@/components/nft-image"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Nft } from "@/contracts"
import { cn } from "@/lib/utils"

export const GALLERY_LAYOUT = "flex gap-7"
export const GALLERY_THUMBS = "hidden w-[100px] shrink-0 flex-col gap-4 md:flex"
export const GALLERY_THUMB = "aspect-square w-full rounded-md"
export const GALLERY_MAIN =
  "relative flex aspect-[361/356] min-w-0 flex-1 items-center justify-center rounded-3xl md:aspect-square md:max-w-[444px] md:rounded-md md:bg-card"

const MAIN_SIZES = "(min-width: 1280px) 404px, (min-width: 768px) 45vw, 90vw"

export function NftGallery({ nft }: { nft: Nft }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const image = nft.images[activeIndex]

  return (
    <div className={GALLERY_LAYOUT} data-testid="nft-gallery">
      <ul className={GALLERY_THUMBS}>
        {nft.images.map((item, index) => (
          <li key={item.basePath}>
            <button
              type="button"
              aria-label={`Ver imagem ${index + 1} de ${nft.images.length}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
              className={cn(
                GALLERY_THUMB,
                "block overflow-hidden border-2 border-transparent bg-card",
                index === activeIndex && "border-primary"
              )}
            >
              <NftImage
                image={{ basePath: item.basePath, alt: "" }}
                sizes="100px"
                width={100}
                height={100}
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <div className={GALLERY_MAIN}>
        <NftImage
          image={image}
          sizes={MAIN_SIZES}
          width={404}
          height={404}
          priority
          className="aspect-[361/356] w-full rounded-3xl object-cover md:aspect-square md:w-[91%] md:rounded-2xl"
        />
        <Dialog>
          <DialogTrigger
            aria-label="Ampliar imagem"
            className="absolute top-3 right-3 hidden size-[30px] items-center justify-center rounded-full border border-border bg-secondary md:flex"
          >
            <SearchIcon className="size-[18px]" />
          </DialogTrigger>
          <DialogContent className="max-w-[720px]">
            <DialogTitle>{nft.name}</DialogTitle>
            <NftImage
              image={image}
              sizes="(min-width: 768px) 672px, 90vw"
              width={672}
              height={672}
              className="aspect-square w-full rounded-2xl object-cover"
            />
          </DialogContent>
        </Dialog>
        <div className="absolute inset-x-0 bottom-[45px] flex justify-center md:hidden">
          {nft.images.map((item, index) => (
            <button
              key={item.basePath}
              type="button"
              aria-label={`Ver imagem ${index + 1} de ${nft.images.length}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
              className="flex size-6 items-center justify-center"
            >
              <span
                className={cn(
                  "h-[7px] rounded-full bg-primary",
                  index === activeIndex ? "w-5" : "w-[7px]"
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
