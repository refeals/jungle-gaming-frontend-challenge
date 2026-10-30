import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/register")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/",
      search: { auth: "register", redirect: search.redirect },
    })
  },
})
