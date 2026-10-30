import { Link } from "@tanstack/react-router"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { User } from "@/contracts"
import { useLogout } from "@/features/auth/session"

export function UserMenu({ user }: { user: User }) {
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Menu da conta de ${user.displayName}`}
        className="flex size-[35px] items-center justify-center overflow-hidden rounded-full bg-accent text-[14px] font-bold text-brand-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {user.avatarDataUrl ? (
          <img
            src={user.avatarDataUrl}
            alt=""
            width={35}
            height={35}
            className="size-full object-cover"
          />
        ) : (
          <span aria-hidden="true">
            {user.displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem render={<Link to="/profile" />}>
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/wallets" />}>
          Carteiras
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/favorites" />}>
          Favoritos
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
