import { http } from "@/api/http"
import type {
  AvatarInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from "@/contracts"
import { profile } from "@/contracts/profile"

export async function getProfile(signal?: AbortSignal) {
  const { data } = await http.get<unknown>("/profile", { signal })
  return profile.parse(data)
}

export async function updateProfile(input: UpdateProfileInput) {
  const { data } = await http.patch<unknown>("/profile", input)
  return profile.parse(data)
}

export async function updateAvatar(input: AvatarInput) {
  const { data } = await http.put<unknown>("/profile/avatar", input)
  return profile.parse(data)
}

export async function removeAvatar() {
  const { data } = await http.delete<unknown>("/profile/avatar")
  return profile.parse(data)
}

export async function changePassword(input: ChangePasswordInput) {
  await http.post("/profile/password", input)
}
