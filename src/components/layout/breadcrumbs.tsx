import { Link, type LinkProps } from "@tanstack/react-router"
import { Fragment } from "react"

type BreadcrumbItem = {
  label: string
  to?: LinkProps["to"]
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Trilha de navegação">
      <ol className="flex flex-wrap gap-1 text-[15px]/4 font-bold">
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 && <li aria-hidden="true">/</li>}
            <li>
              {item.to ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
