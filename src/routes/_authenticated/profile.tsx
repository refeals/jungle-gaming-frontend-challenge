import { createFileRoute } from "@tanstack/react-router"

function ProfilePage() {
  return <h1 className="py-24 text-center text-[28px] font-bold">Perfil</h1>
}

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
})
