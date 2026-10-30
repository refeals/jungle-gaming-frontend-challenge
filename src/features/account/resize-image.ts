const AVATAR_SIZE = 256
const MAX_FILE_SIZE = 500 * 1024
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"]

export const ACCEPTED_IMAGE_TYPES = ACCEPTED_TYPES.join(",")

export class AvatarFileError extends Error {}

export async function resizeAvatar(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new AvatarFileError("Use uma imagem PNG, JPEG ou WebP.")
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new AvatarFileError("A imagem deve ter até 500 KB.")
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new AvatarFileError("Não foi possível ler esta imagem.")
  }

  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  canvas
    .getContext("2d")
    ?.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE
    )
  bitmap.close()

  return canvas.toDataURL("image/webp", 0.85)
}
