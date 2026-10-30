import type { Nft } from "@/contracts"

const WIDTHS = [320, 640, 960]

type NftImageProps = {
  image: Nft["images"][number]
  sizes: string
  width: number
  height: number
  priority?: boolean
  className?: string
}

function createSrcSet(basePath: string, extension: string) {
  return WIDTHS.map(
    (width) => `${basePath}-${width}.${extension} ${width}w`
  ).join(", ")
}

export function NftImage({
  image,
  sizes,
  width,
  height,
  priority = false,
  className,
}: NftImageProps) {
  return (
    <picture className="contents">
      <source
        type="image/avif"
        srcSet={createSrcSet(image.basePath, "avif")}
        sizes={sizes}
      />
      <source
        type="image/webp"
        srcSet={createSrcSet(image.basePath, "webp")}
        sizes={sizes}
      />
      <img
        src={`${image.basePath}-640.webp`}
        alt={image.alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={className}
      />
    </picture>
  )
}
