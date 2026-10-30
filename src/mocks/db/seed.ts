import {
  network as networkSchema,
  nftCategory,
  type Edition,
  type Network,
  type Nft,
  type NftCategory,
} from "@/contracts"
import type { MockDb } from "@/mocks/db/schema"

const SEED_CLOCK = "2026-09-15T12:00:00.000Z"
const DAY_MS = 86_400_000
const CONTRACT_ADDRESS = "0x7A420000000000000000000000000000000019E8"

const ARTS = [
  {
    slug: "emerald-ape",
    alt: "Macaco de pelo castanho, óculos redondos e jaqueta verde",
  },
  {
    slug: "sage-nomad",
    alt: "Gorila grisalho de chapéu verde-sálvia e moletom roxo",
  },
  {
    slug: "neon-vessel",
    alt: "Gorila preto de blazer claro e gola alta verde",
  },
  {
    slug: "golden-beat",
    alt: "Macaco dourado de fones verdes e jaqueta creme",
  },
]

const NETWORK_NAMES: Record<Network, string> = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  solana: "Solana",
}

const CATEGORIES = nftCategory.options

const NETWORKS = networkSchema.options

const GENERATED_PRICES = [
  "0.02",
  "12.30",
  "0.15",
  "3.45",
  "0.75",
  "6.10",
  "2.05",
  "0.48",
  "9.99",
  "1.10",
  "4.20",
  "0.08",
]

const NAME_PREFIXES = [
  "Lunar",
  "Crimson",
  "Silent",
  "Astral",
  "Velvet",
  "Solar",
  "Cobalt",
  "Amber",
]

const NAME_SUFFIXES = [
  "Mirage",
  "Echo",
  "Harbor",
  "Prism",
  "Atlas",
  "Orchid",
  "Pulse",
]

type EditionAvailability = {
  oneOfOne: number
  oneOfTen: number
  oneOfFifty: number
}

type NamedNft = {
  name: string
  number: number
  art: number
  priceEth: string
  previousPriceEth?: string
  rarity?: "rare"
  collection: string
  category: NftCategory
  network: Network
  attributes: string[]
  availability: EditionAvailability
  rating?: number
  reviewCount?: number
}

const NAMED_NFTS: NamedNft[] = [
  {
    name: "Emerald Ape",
    number: 42,
    art: 0,
    priceEth: "1.19",
    collection: "Kurio Apes",
    category: "digital-art",
    network: "ethereum",
    attributes: ["Óculos", "Esmeralda", "Raro"],
    availability: { oneOfOne: 1, oneOfTen: 4, oneOfFifty: 12 },
    rating: 4.8,
    reviewCount: 19,
  },
  {
    name: "Sage Nomad",
    number: 9,
    art: 1,
    priceEth: "1.69",
    collection: "Kurio Nomads",
    category: "digital-art",
    network: "ethereum",
    attributes: ["Capuz", "Sálvia"],
    availability: { oneOfOne: 0, oneOfTen: 6, oneOfFifty: 30 },
  },
  {
    name: "Neon Vessel",
    number: 552,
    art: 2,
    priceEth: "1.99",
    previousPriceEth: "2.29",
    rarity: "rare",
    collection: "Kurio Vessels",
    category: "digital-art",
    network: "ethereum",
    attributes: ["Neon", "Raro"],
    availability: { oneOfOne: 1, oneOfTen: 7, oneOfFifty: 18 },
  },
  {
    name: "Cosmic Bloom",
    number: 118,
    art: 1,
    priceEth: "1.29",
    collection: "Kurio Blooms",
    category: "digital-art",
    network: "ethereum",
    attributes: ["Floral", "Cósmico"],
    availability: { oneOfOne: 1, oneOfTen: 2, oneOfFifty: 25 },
  },
  {
    name: "Violet Nomad",
    number: 314,
    art: 1,
    priceEth: "1.39",
    collection: "Kurio Nomads",
    category: "digital-art",
    network: "ethereum",
    attributes: ["Capuz", "Violeta"],
    availability: { oneOfOne: 1, oneOfTen: 8, oneOfFifty: 20 },
  },
  {
    name: "Ivory Baron",
    number: 88,
    art: 2,
    priceEth: "1.79",
    collection: "Kurio Barons",
    category: "digital-art",
    network: "ethereum",
    attributes: ["Marfim", "Coroa"],
    availability: { oneOfOne: 1, oneOfTen: 10, oneOfFifty: 40 },
  },
  {
    name: "Golden Beat",
    number: 207,
    art: 3,
    priceEth: "0.99",
    collection: "Kurio Beats",
    category: "digital-art",
    network: "ethereum",
    attributes: ["Dourado", "Som"],
    availability: { oneOfOne: 1, oneOfTen: 9, oneOfFifty: 35 },
  },
  {
    name: "Golden Frequency",
    number: 71,
    art: 3,
    priceEth: "0.59",
    collection: "Kurio Beats",
    category: "music",
    network: "polygon",
    attributes: ["Dourado", "Frequência"],
    availability: { oneOfOne: 1, oneOfTen: 5, oneOfFifty: 22 },
  },
  {
    name: "Golden Signal",
    number: 160,
    art: 3,
    priceEth: "0.39",
    collection: "Kurio Beats",
    category: "digital-art",
    network: "solana",
    attributes: ["Dourado", "Sinal"],
    availability: { oneOfOne: 1, oneOfTen: 3, oneOfFifty: 28 },
  },
]

const GENERATED_COUNT = 51

function pad(value: number, length: number) {
  return String(value).padStart(length, "0")
}

function createEditions(
  id: string,
  availability: EditionAvailability
): Edition[] {
  return [
    {
      id: `${id}-1-1`,
      label: "1/1",
      supply: 1,
      available: availability.oneOfOne,
    },
    {
      id: `${id}-1-10`,
      label: "1/10",
      supply: 10,
      available: availability.oneOfTen,
    },
    {
      id: `${id}-1-50`,
      label: "1/50",
      supply: 50,
      available: availability.oneOfFifty,
    },
    { id: `${id}-open`, label: "ABERTA", supply: null, available: null },
  ]
}

function createImages(artIndex: number, name: string) {
  return ARTS.map((_, offset) => {
    const art = ARTS[(artIndex + offset) % ARTS.length]
    return { basePath: `/images/nfts/${art.slug}`, alt: `${name}: ${art.alt}` }
  })
}

function createNft(entry: NamedNft, index: number): Nft {
  const slug = `${entry.name.toLowerCase().replaceAll(" ", "-")}-${pad(entry.number, 3)}`
  const name = `${entry.name} #${pad(entry.number, 3)}`

  return {
    id: slug,
    tokenId: `#${pad(entry.number, 4)}`,
    name,
    slug,
    collection: entry.collection,
    category: entry.category,
    network: entry.network,
    priceEth: entry.priceEth,
    previousPriceEth: entry.previousPriceEth,
    rarity: entry.rarity,
    rating: entry.rating ?? (35 + ((index * 7) % 16)) / 10,
    reviewCount: entry.reviewCount ?? 3 + ((index * 11) % 40),
    description: `Um colecionável digital finalizado à mão da coleção ${entry.collection}, verificado na ${NETWORK_NAMES[entry.network]}, com arte desbloqueável e acesso para colecionadores.`,
    contractAddress: CONTRACT_ADDRESS,
    royaltyPercent: 5,
    attributes: entry.attributes,
    images: createImages(entry.art, name),
    editions: createEditions(slug, entry.availability),
    listedAt: new Date(
      new Date(SEED_CLOCK).getTime() - index * 3 * DAY_MS
    ).toISOString(),
    trendingScore: (index * 37) % 100,
    version: 1,
  }
}

function createGeneratedEntry(index: number): NamedNft {
  const prefix = NAME_PREFIXES[index % NAME_PREFIXES.length]
  const suffix = NAME_SUFFIXES[index % NAME_SUFFIXES.length]

  return {
    name: `${prefix} ${suffix}`,
    number: 600 + index,
    art: index % ARTS.length,
    priceEth: GENERATED_PRICES[index % GENERATED_PRICES.length],
    collection: `Kurio ${suffix}s`,
    category: CATEGORIES[index % CATEGORIES.length],
    network: NETWORKS[(index + Math.floor(index / 3)) % NETWORKS.length],
    attributes: [prefix, suffix],
    availability: {
      oneOfOne: index % 4 === 0 ? 0 : 1,
      oneOfTen: index % 7 === 0 ? 0 : (index % 9) + 1,
      oneOfFifty: 10 + ((index * 3) % 40),
    },
  }
}

function createNfts(): Nft[] {
  const generated = Array.from({ length: GENERATED_COUNT }, (_, index) =>
    createGeneratedEntry(index)
  )
  return [...NAMED_NFTS, ...generated].map(createNft)
}

export function createSeed(): MockDb {
  return {
    schemaVersion: 2,
    sequence: 100,
    users: [
      {
        id: "user-collector",
        email: "collector@kurio.test",
        username: "collector",
        displayName: "Colecionador Kurio",
        ensName: "collector",
        walletNickname: "Cofre principal",
        avatarDataUrl: null,
        salt: "6b7572696f2d636f6c6c6563746f72",
        passwordHash:
          "452dae487b22805bf7329fdd458dcfbe7d8e4485e433a4133f829212a889cbf7",
      },
      {
        id: "user-second",
        email: "second@kurio.test",
        username: "second",
        displayName: "Segunda Conta",
        ensName: null,
        walletNickname: null,
        avatarDataUrl: null,
        salt: "6b7572696f2d7365636f6e64",
        passwordHash:
          "3fc1310b2d11010eb63bc83af297f0a83c77b5c51f81042a33a26dde40621d1f",
      },
    ],
    sessions: [],
    nfts: createNfts(),
    favorites: [
      { userId: "user-collector", nftId: "emerald-ape-042" },
      { userId: "user-collector", nftId: "neon-vessel-552" },
      { userId: "user-second", nftId: "sage-nomad-009" },
    ],
    carts: [
      {
        id: "cart-collector",
        userId: "user-collector",
        couponCode: null,
        items: [
          {
            id: "cart-item-1",
            nftId: "emerald-ape-042",
            editionId: "emerald-ape-042-1-50",
            quantity: 2,
          },
          {
            id: "cart-item-2",
            nftId: "violet-nomad-314",
            editionId: "violet-nomad-314-1-50",
            quantity: 6,
          },
          {
            id: "cart-item-3",
            nftId: "ivory-baron-088",
            editionId: "ivory-baron-088-1-10",
            quantity: 9,
          },
        ],
      },
      {
        id: "cart-second",
        userId: "user-second",
        couponCode: null,
        items: [
          {
            id: "cart-item-4",
            nftId: "golden-signal-160",
            editionId: "golden-signal-160-1-50",
            quantity: 1,
          },
        ],
      },
    ],
    quotes: [],
    orders: [],
    wallets: [
      {
        id: "wallet-collector-primary",
        userId: "user-collector",
        slot: "primary",
        displayName: "Colecionador Kurio",
        nickname: "Cofre principal",
        network: "ethereum",
        profileName: "collector",
        address: "0x1111111111111111111111111111111111111111",
        secondaryAddress: null,
        walletType: "metamask",
        referralCode: null,
        email: "collector@kurio.test",
        ensName: "collector",
        status: "disconnected",
        connectedNetwork: null,
      },
      {
        id: "wallet-collector-secondary",
        userId: "user-collector",
        slot: "secondary",
        displayName: "Colecionador Kurio",
        nickname: "Cofre secundário",
        network: "polygon",
        profileName: "collector",
        address: "0x2222222222222222222222222222222222222222",
        secondaryAddress: null,
        walletType: "coinbase",
        referralCode: null,
        email: "collector@kurio.test",
        ensName: null,
        status: "disconnected",
        connectedNetwork: null,
      },
      {
        id: "wallet-second-primary",
        userId: "user-second",
        slot: "primary",
        displayName: "Segunda Conta",
        nickname: "Carteira da segunda conta",
        network: "solana",
        profileName: "second",
        address: "0x3333333333333333333333333333333333333333",
        secondaryAddress: null,
        walletType: "walletconnect",
        referralCode: null,
        email: "second@kurio.test",
        ensName: null,
        status: "disconnected",
        connectedNetwork: null,
      },
    ],
    idempotency: [],
    coupons: [
      { code: "KURIO10", percent: 10, expiresAt: "2027-12-31T23:59:59.000Z" },
      { code: "EXPIRED10", percent: 10, expiresAt: "2026-01-01T00:00:00.000Z" },
    ],
    clock: { baseIso: SEED_CLOCK, anchorMs: null },
  }
}
