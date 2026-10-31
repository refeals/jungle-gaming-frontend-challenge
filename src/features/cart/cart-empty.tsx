import { Link } from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"

export function CartEmpty() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h2 className="text-[18px] font-bold">Seu carrinho está vazio</h2>
      <p className="text-[14px]/6 text-muted-foreground">
        Explore o catálogo e adicione os NFTs que quiser colecionar.
      </p>
      <Link to="/" hash="catalog" className={buttonVariants()}>
        Explorar o catálogo
      </Link>
    </div>
  )
}
