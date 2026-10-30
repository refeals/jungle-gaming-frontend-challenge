import { Link } from "@tanstack/react-router"

import { ArrowRightIcon } from "@/components/icons"
import { NftImage } from "@/components/nft-image"
import { buttonVariants } from "@/components/ui/button"
import type { CatalogSearch } from "@/features/catalog/search"
import { cn } from "@/lib/utils"

const banners: {
  title: [string, string]
  text: string
  art: string
  search: CatalogSearch
}[] = [
  {
    title: ["Lançamentos gênesis", "de edição limitada"],
    text: "Colecione edições escassas diretamente dos criadores antes da revelação pública.",
    art: "emerald-ape",
    search: { tab: "new" },
  },
  {
    title: ["Arte digital selecionada", "e muito mais"],
    text: "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.",
    art: "neon-vessel",
    search: { collection: "digital-art" },
  },
]

export function PromoBanners() {
  return (
    <section
      aria-label="Coleções em destaque"
      className="grid gap-7 xl:grid-cols-2"
    >
      {banners.map(({ title, text, art, search }) => (
        <article
          key={art}
          className="flex flex-col overflow-hidden rounded-lg bg-card sm:flex-row"
        >
          <NftImage
            image={{ basePath: `/images/nfts/${art}`, alt: "" }}
            sizes="(min-width: 640px) 292px, 100vw"
            width={292}
            height={250}
            className="h-[250px] w-full shrink-0 rounded-[18px] object-cover sm:w-[292px]"
          />
          <div className="flex flex-1 flex-col items-end justify-between gap-4 p-6 text-right sm:py-[37px] sm:pr-[30px] sm:pl-0">
            <div>
              <h2 className="text-[18px]/6 font-bold">
                {title[0]}
                <br />
                {title[1]}
              </h2>
              <p className="mt-2 text-[14px]/6 text-muted-foreground">{text}</p>
            </div>
            <Link
              to="/"
              search={search}
              hash="catalog"
              aria-label={`Explorar ${title[0]} ${title[1]}`}
              className={cn(
                buttonVariants(),
                "h-10 w-[140px] gap-1 px-0 text-[14px] font-medium"
              )}
            >
              Explorar
              <ArrowRightIcon className="size-[18px]" />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}
