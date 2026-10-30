import { Link } from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"

export function NftNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-[28px] font-bold">NFT não encontrado</h1>
      <p className="text-[14px]/[24px] text-muted-foreground">
        Este NFT não existe ou foi removido do catálogo.
      </p>
      <Link to="/" hash="catalog" className={buttonVariants()}>
        Ver catálogo
      </Link>
    </div>
  )
}
