import { ComingSoonButton } from "@/components/coming-soon-button"
import { NftImage } from "@/components/nft-image"

const articles = [
  {
    date: "12 de setembro",
    reading: "Leitura de 6 min",
    title: "Como funciona a propriedade de NFTs",
    text: "Aprenda a colecionar, negociar e verificar ativos digitais.",
    art: "neon-vessel",
  },
  {
    date: "13 de setembro",
    reading: "Leitura de 2 min",
    title: "10 artistas digitais para acompanhar",
    text: "Conheça criadores que moldam a cultura digital.",
    art: "emerald-ape",
  },
  {
    date: "15 de setembro",
    reading: "Leitura de 3 min",
    title: "Raridade, atributos e procedência",
    text: "Entenda raridade, procedência, direitos autorais e utilidade.",
    art: "sage-nomad",
  },
  {
    date: "15 de setembro",
    reading: "Leitura de 2 min",
    title: "Como proteger sua carteira",
    text: "Proteja sua carteira, seus ativos e sua identidade.",
    art: "golden-beat",
  },
]

export function JournalSection() {
  return (
    <section aria-labelledby="journal-title">
      <h2
        id="journal-title"
        className="text-center text-[28px]/[37px] font-bold"
      >
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-[14px]/[18px] text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da
        propriedade digital.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-[repeat(4,268px)]">
        {articles.map(({ date, reading, title, text, art }) => (
          <article
            key={title}
            className="flex flex-col overflow-hidden rounded-lg bg-card"
          >
            <NftImage
              image={{ basePath: `/images/nfts/${art}`, alt: "" }}
              sizes="(min-width: 1280px) 268px, (min-width: 640px) 50vw, 100vw"
              width={268}
              height={195}
              className="h-[195px] w-full object-cover"
            />
            <div className="flex flex-1 flex-col p-4 pt-3">
              <p className="text-[12px]/4 font-medium text-muted-foreground">
                {date} &nbsp;|&nbsp; {reading}
              </p>
              <h3 className="mt-2 text-[16px]/[21px] font-bold">{title}</h3>
              <p className="mt-2 text-[12px]/4 font-medium text-muted-foreground">
                {text}
              </p>
              <ComingSoonButton
                aria-label={`Ler mais sobre ${title}`}
                className="mt-2 w-fit text-[12px]/4 font-bold text-brand-text"
              >
                Ler mais →
              </ComingSoonButton>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
