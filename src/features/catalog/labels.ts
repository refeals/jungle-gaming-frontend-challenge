import type { Network, NftCategory, NftListQuery } from "@/contracts"

export const categoryLabels: Record<NftCategory, string> = {
  "digital-art": "Arte digital",
  photography: "Fotografia",
  music: "Música",
  "3d-art": "Arte 3D",
  collectibles: "Colecionáveis",
  generative: "Generativa",
  gaming: "Jogos",
  subscriptions: "Assinaturas",
  utility: "Utilidade",
}

export const networkLabels: Record<Network, string> = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  solana: "Solana",
}

export const tabLabels: Record<NftListQuery["tab"], string> = {
  all: "Todos os NFTs",
  new: "Novos lançamentos",
  trending: "Em alta",
}

export const sortLabels: Record<NftListQuery["sort"], string> = {
  recent: "Listados recentemente",
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  name: "Nome",
}
