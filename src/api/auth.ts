import { http } from "@/api/http"
import type { LoginInput, RegisterInput } from "@/contracts"
import { authResult, session } from "@/contracts/auth"

export async function login(input: LoginInput) {
  const { data } = await http.post<unknown>("/auth/login", input)
  return authResult.parse(data)
}

export async function register(input: RegisterInput) {
  const { data } = await http.post<unknown>("/auth/register", input)
  return authResult.parse(data)
}

export async function logout() {
  await http.post("/auth/logout")
}

export async function getSession(signal?: AbortSignal) {
  const { data } = await http.get<unknown>("/session", { signal })
  return session.parse(data)
}
