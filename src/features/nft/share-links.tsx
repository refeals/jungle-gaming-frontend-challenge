import { LinkedinIcon, MailIcon, TwitterIcon } from "@/components/icons"

export function ShareLinks({ title }: { title: string }) {
  const url = encodeURIComponent(window.location.href)
  const text = encodeURIComponent(title)
  const links = [
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      icon: LinkedinIcon,
    },
    {
      label: "e-mail",
      href: `mailto:?subject=${text}&body=${url}`,
      icon: MailIcon,
    },
    {
      label: "X",
      href: `https://x.com/intent/tweet?text=${text}&url=${url}`,
      icon: TwitterIcon,
    },
  ]

  return (
    <div className="flex items-center gap-2">
      <p className="text-[15px]/4 font-bold">Compartilhar este NFT:</p>
      <ul className="flex items-center gap-1">
        {links.map(({ label, href, icon: Icon }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Compartilhar por ${label}, abre em nova aba`}
              className="flex size-6 items-center justify-center"
            >
              <Icon className="size-[18px]" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
