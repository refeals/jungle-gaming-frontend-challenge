import { mkdir, readdir } from "node:fs/promises"
import { basename, extname, join } from "node:path"
import sharp from "sharp"

const SOURCE_DIR = join(import.meta.dirname, "nft-sources")
const OUTPUT_DIR = join(import.meta.dirname, "../public/images/nfts")
const WIDTHS = [320, 640, 960]

await mkdir(OUTPUT_DIR, { recursive: true })

for (const file of await readdir(SOURCE_DIR)) {
  const name = basename(file, extname(file))
  const input = join(SOURCE_DIR, file)

  for (const width of WIDTHS) {
    const resized = sharp(input).resize({ width })
    await resized
      .clone()
      .avif({ quality: 50 })
      .toFile(join(OUTPUT_DIR, `${name}-${width}.avif`))
    await resized
      .clone()
      .webp({ quality: 78 })
      .toFile(join(OUTPUT_DIR, `${name}-${width}.webp`))
  }
}
