import { Link } from "@tanstack/react-router"
import { useState } from "react"

import { ArrowRightIcon } from "@/components/icons"
import { NftImage } from "@/components/nft-image"
import { buttonVariants } from "@/components/ui/button"
import type { CatalogSearch } from "@/features/catalog/search"
import { cn } from "@/lib/utils"

type HeroSlide = {
  titleDesktop: [string, string]
  titleMobile: [string, string]
  textDesktop: string
  textMobile: string
  art: string
  alt: string
  thumbnailArt: string
  search: CatalogSearch
}

const HERO_SIZES = "(min-width: 1280px) 450px, (min-width: 768px) 40vw, 41vw"

const slides: HeroSlide[] = [
  {
    titleDesktop: ["SEJA DONO DO FUTURO", "DA ARTE DIGITAL"],
    titleMobile: ["SEJA DONO DA", "CULTURA DIGITAL"],
    textDesktop:
      "Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.",
    textMobile: "Descubra NFTs selecionados de criadores do mundo todo.",
    art: "emerald-ape",
    alt: "Macaco de pelo castanho, óculos redondos e jaqueta verde",
    thumbnailArt: "sage-nomad",
    search: {},
  },
  {
    titleDesktop: ["LANÇAMENTOS GÊNESIS", "DE EDIÇÃO LIMITADA"],
    titleMobile: ["LANÇAMENTOS", "GÊNESIS"],
    textDesktop:
      "Colecione edições escassas diretamente dos criadores antes da revelação pública.",
    textMobile: "Colecione edições escassas dos criadores.",
    art: "sage-nomad",
    alt: "Gorila grisalho de chapéu verde-sálvia e moletom roxo",
    thumbnailArt: "golden-beat",
    search: { tab: "new" },
  },
  {
    titleDesktop: ["ARTE DIGITAL", "SELECIONADA"],
    titleMobile: ["ARTE DIGITAL", "SELECIONADA"],
    textDesktop:
      "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.",
    textMobile: "Explore novos artistas e coleções verificadas.",
    art: "neon-vessel",
    alt: "Gorila preto de blazer claro e gola alta verde",
    thumbnailArt: "emerald-ape",
    search: { collection: "digital-art" },
  },
]

function SlideDots({
  activeIndex,
  onSelect,
  className,
}: {
  activeIndex: number
  onSelect: (index: number) => void
  className?: string
}) {
  return (
    <div className={cn("flex", className)}>
      {slides.map((_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Destaque ${index + 1} de ${slides.length}`}
          aria-current={index === activeIndex ? "true" : undefined}
          onClick={() => onSelect(index)}
          className="flex size-6 items-center justify-center"
        >
          <span
            className={cn(
              "size-2 rounded-full",
              index === activeIndex ? "bg-primary" : "bg-primary/40"
            )}
          />
        </button>
      ))}
    </div>
  )
}

export function HeroBanner() {
  const [activeIndex, setActiveIndex] = useState(0)
  const slide = slides[activeIndex]
  const image = { basePath: `/images/nfts/${slide.art}`, alt: slide.alt }

  return (
    <section
      aria-label="Destaques"
      className="relative isolate grid min-h-[190px] grid-cols-[minmax(0,1fr)_41%] items-start gap-2 overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,rgb(210_138_76_/_0.2),rgb(210_138_76_/_0.1))] px-4 pt-1.5 pb-7 md:min-h-0 md:grid-cols-[minmax(0,1fr)_38%] md:items-stretch md:gap-8 md:overflow-visible md:rounded-none md:bg-none md:p-0 lg:grid-cols-[minmax(0,1fr)_450px] xl:gap-[110px]"
    >
      <div
        aria-hidden="true"
        className="absolute top-[-31px] left-[-80px] -z-10 size-[248px] rounded-full bg-[linear-gradient(150deg,rgb(221_154_95_/_0.43),rgb(210_138_76_/_0.04))] md:hidden"
      />
      <div
        aria-hidden="true"
        className="absolute top-[-10px] left-[73px] -z-10 size-[248px] rounded-full bg-[linear-gradient(150deg,rgb(221_154_95_/_0.37),rgb(210_138_76_/_0))] md:hidden"
      />

      <div className="flex min-w-0 flex-col md:relative md:pt-[43px] md:pl-10">
        <p className="text-[12px]/4 font-medium md:text-[14px]/4">
          Bem-vindo à Kurio
        </p>
        <h1 className="mt-1.5 text-[18px]/[29px] font-bold md:text-[24px]/[40px] lg:text-[36px]/[58px] xl:text-[43px]/[70px]">
          <span className="md:hidden">
            {slide.titleMobile[0]}
            <br />
            {slide.titleMobile[1]}
          </span>
          <span className="hidden md:inline">
            {slide.titleDesktop[0]}
            <br />
            {slide.titleDesktop[1]}
          </span>
        </h1>
        <p className="mt-1.5 min-h-[54px] text-[12px]/[18px] text-muted-foreground md:mt-1 md:min-h-[72px] md:max-w-[557px] md:text-[14px]/6">
          <span className="md:hidden">{slide.textMobile}</span>
          <span className="hidden md:inline">{slide.textDesktop}</span>
        </p>
        <Link
          to="/"
          hash="catalog"
          search={slide.search}
          className="flex items-center gap-2 text-[12px]/[14px] font-bold text-brand-text md:hidden"
        >
          EXPLORAR
          <ArrowRightIcon className="size-4" />
        </Link>
        <Link
          to="/"
          hash="catalog"
          search={slide.search}
          className={cn(
            buttonVariants(),
            "mt-8 hidden h-10 w-[140px] px-0 md:inline-flex"
          )}
        >
          EXPLORAR
        </Link>
        <SlideDots
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          className="absolute right-0 bottom-[37px] hidden md:flex"
        />
      </div>

      <div className="relative mt-1.5 md:mt-0">
        <NftImage
          image={image}
          sizes={HERO_SIZES}
          width={450}
          height={450}
          priority
          className="aspect-square w-full rounded-2xl object-cover md:rounded-3xl"
        />
        <div className="absolute bottom-[-8px] left-[10%] w-[42%] md:hidden">
          <NftImage
            image={{
              basePath: `/images/nfts/${slide.thumbnailArt}`,
              alt: "",
            }}
            sizes="58px"
            width={58}
            height={58}
            className="aspect-square w-full rounded-2xl object-cover"
          />
        </div>
      </div>

      <SlideDots
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        className="absolute inset-x-0 bottom-0.5 justify-center md:hidden"
      />
    </section>
  )
}
