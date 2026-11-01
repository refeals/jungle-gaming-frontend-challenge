import { Link } from "@tanstack/react-router"
import {
  lazy,
  Suspense,
  type ComponentType,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react"

import { KurioLogo } from "@/components/brand/kurio-logo"
import { LazyBoundary } from "@/components/lazy-boundary"
import { WalletBadges } from "@/components/brand/wallet-badges"
import { ComingSoonButton } from "@/components/coming-soon-button"
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from "@/components/icons"
import type { NftCategory } from "@/contracts"

const NewsletterForm = lazy(() =>
  import("@/components/layout/newsletter-form").then((module) => ({
    default: module.NewsletterForm,
  }))
)

const NEWSLETTER_ROOT_MARGIN = "600px"

function LazyNewsletterForm() {
  const placeholderRef = useRef<HTMLDivElement>(null)
  const [isNear, setIsNear] = useState(false)

  useEffect(() => {
    const placeholder = placeholderRef.current
    if (!placeholder) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        setIsNear(true)
      },
      { rootMargin: NEWSLETTER_ROOT_MARGIN }
    )
    observer.observe(placeholder)
    return () => observer.disconnect()
  }, [])

  const placeholder = (
    <div ref={placeholderRef} className="h-10 rounded-md bg-accent" />
  )

  if (!isNear) return placeholder

  return (
    <LazyBoundary
      fallback={
        <p role="alert" className="text-[13px]/5 text-muted-foreground">
          Não foi possível carregar o formulário. Recarregue a página.
        </p>
      }
    >
      <Suspense fallback={placeholder}>
        <NewsletterForm />
      </Suspense>
    </LazyBoundary>
  )
}

const benefits = [
  {
    mark: "W",
    title: "Segurança da carteira",
    description:
      "Proteja sua carteira e colecione arte digital verificada com confiança.",
  },
  {
    mark: "C",
    title: "Criadores em destaque",
    description:
      "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.",
  },
  {
    mark: "D",
    title: "Alertas de lançamentos",
    description:
      "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.",
  },
]

const collections: { label: string; slug: NftCategory }[] = [
  { label: "Arte digital", slug: "digital-art" },
  { label: "Fotografia", slug: "photography" },
  { label: "Música", slug: "music" },
  { label: "Arte 3D", slug: "3d-art" },
  { label: "Utilidade", slug: "utility" },
]

const helpLinks = [
  "Central de ajuda",
  "Como comprar NFTs",
  "Carteira e segurança",
  "Política do mercado",
  "Denunciar item",
]

const socialLinks: {
  label: string
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  className: string
}[] = [
  {
    label: "Facebook",
    href: "https://www.facebook.com",
    icon: FacebookIcon,
    className: "h-4 w-2",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com",
    icon: InstagramIcon,
    className: "size-4",
  },
  {
    label: "Twitter",
    href: "https://x.com",
    icon: TwitterIcon,
    className: "h-3.5 w-4",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com",
    icon: LinkedinIcon,
    className: "size-4",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com",
    icon: YoutubeIcon,
    className: "h-3.5 w-[19px]",
  },
]

const COLUMNS =
  "grid gap-8 md:grid-cols-2 xl:grid-cols-[211px_211px_211px_1fr] xl:gap-[92px]"
const TEXT_LINK =
  "text-left text-[14px]/[30px] text-foreground hover:text-brand-text"

function LinkColumn({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <h2 className="mb-2 text-[18px] font-bold">{title}</h2>
      <ul>{children}</ul>
    </div>
  )
}

function ComingSoonItem({ label }: { label: string }) {
  return (
    <li>
      <ComingSoonButton className={TEXT_LINK}>{label}</ComingSoonButton>
    </li>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-24">
      <section
        aria-label="Benefícios"
        className="grid gap-8 bg-card p-8 md:grid-cols-2 xl:grid-cols-[265px_265px_265px_1fr] xl:gap-0 xl:pb-4"
      >
        {benefits.map((benefit) => (
          <div
            key={benefit.mark}
            className="flex flex-col gap-3 xl:border-r xl:border-primary xl:px-4"
          >
            <span
              aria-hidden="true"
              className="flex size-[74px] items-center justify-center rounded-full bg-primary text-[24px] font-bold text-primary-foreground"
            >
              {benefit.mark}
            </span>
            <h2 className="text-[17px] font-bold xl:leading-4">
              {benefit.title}
            </h2>
            <p className="text-[14px]/[22px] text-muted-foreground xl:max-w-[204px]">
              {benefit.description}
            </p>
          </div>
        ))}
        <div className="flex flex-col gap-3 xl:px-4">
          <h2 className="text-[18px] font-bold">
            Antecipe-se ao próximo lançamento
          </h2>
          <LazyNewsletterForm />
          <p className="text-[13px]/[22px] text-muted-foreground">
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>
        </div>
      </section>

      <section
        aria-label="Contato"
        className={`${COLUMNS} items-center bg-accent p-8 text-[14px]/[22px] xl:py-[22px]`}
      >
        <KurioLogo className="w-fit" />
        <p className="xl:whitespace-nowrap">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <p>contato@email.com</p>
        <p>+55 11 4002 8922</p>
      </section>

      <nav aria-label="Rodapé" className={`${COLUMNS} bg-card p-8`}>
        <LinkColumn title="Meu perfil">
          <li>
            <Link to="/profile" className={TEXT_LINK}>
              Meu perfil
            </Link>
          </li>
          <ComingSoonItem label="Minha coleção" />
          <ComingSoonItem label="Atividade" />
          <ComingSoonItem label="Estúdio do criador" />
          <li>
            <Link to="/favorites" className={TEXT_LINK}>
              Lista de interesse
            </Link>
          </li>
        </LinkColumn>
        <LinkColumn title="Central de ajuda">
          {helpLinks.map((label) => (
            <ComingSoonItem key={label} label={label} />
          ))}
        </LinkColumn>
        <LinkColumn title="Coleções">
          {collections.map(({ label, slug }) => (
            <li key={slug}>
              <Link to="/" search={{ collection: slug }} className={TEXT_LINK}>
                {label}
              </Link>
            </li>
          ))}
        </LinkColumn>
        <div>
          <h2 className="mb-5 text-[18px] font-bold">Redes sociais</h2>
          <ul className="flex gap-2.5">
            {socialLinks.map(({ label, href, icon: Icon, className }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label}, abre em nova aba`}
                  className="flex size-[30px] items-center justify-center rounded-[4px] border border-primary text-primary hover:bg-accent"
                >
                  <Icon className={className} />
                </a>
              </li>
            ))}
          </ul>
          <h2 className="mt-8 mb-3 text-[18px] font-bold whitespace-nowrap">
            Carteiras compatíveis
          </h2>
          <WalletBadges />
        </div>
      </nav>

      <p className="mt-1.5 text-center text-[14px]/[30px]">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}
