import { Link } from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"

export function NotFoundScreen() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-[28px] font-bold">Página não encontrada</h1>
      <p className="text-[14px]/[24px] text-muted-foreground">
        O endereço acessado não existe ou foi removido.
      </p>
      <Link to="/" className={buttonVariants()}>
        Voltar para o início
      </Link>
    </div>
  )
}
