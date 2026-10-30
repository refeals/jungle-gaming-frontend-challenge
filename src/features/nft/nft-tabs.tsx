import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Edition, Nft } from "@/contracts"
import { networkLabels } from "@/features/catalog/labels"
import { NftReviews } from "@/features/nft/nft-reviews"

const TRIGGER =
  "h-auto flex-none rounded-none border-0 border-b-3 border-transparent px-0 pb-1 text-[15px]/5 font-normal md:text-[17px]/5 text-foreground data-active:border-primary data-active:font-bold data-active:text-brand-text after:hidden"

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function DetailBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-[14px]/6 font-bold">{title}</h3>
      <p className="text-[14px]/6 text-muted-foreground">{text}</p>
    </div>
  )
}

export function NftTabs({ nft, edition }: { nft: Nft; edition: Edition }) {
  const network = networkLabels[nft.network]

  return (
    <Tabs defaultValue="details" className="min-w-0 gap-4">
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-primary p-0 md:gap-9"
      >
        <TabsTrigger value="details" className={TRIGGER}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={TRIGGER}>
          Avaliações de colecionadores ({nft.reviewCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="flex flex-col gap-3">
        <p className="text-[14px]/6 text-muted-foreground">
          {nft.name} é uma obra digital {edition.label} finalizada à mão da
          coleção {nft.collection}. Cada atributo fica armazenado nos metadados
          do token e verificado na {network}. A obra explora identidade,
          movimento e luz em um mundo digital sem fronteiras.
        </p>
        <p className="mt-3 text-[14px]/6 text-muted-foreground">
          A propriedade inclui a arte em alta resolução, lançamentos exclusivos
          para colecionadores e um registro permanente de procedência registrada
          na rede. O criador recebe {nft.royaltyPercent}% de direitos autorais
          nas vendas secundárias, apoiando novos trabalhos e lançamentos da
          comunidade.
        </p>
        <DetailBlock
          title="Rede:"
          text={`Cunhado na ${network} com procedência imutável e metadados armazenados no IPFS.`}
        />
        <DetailBlock
          title="Contrato:"
          text={`${shortenAddress(nft.contractAddress)} • Contrato inteligente ERC-721 verificado.`}
        />
        <DetailBlock
          title="Direitos autorais:"
          text={`Direitos autorais do criador: ${nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.`}
        />
      </TabsContent>

      <TabsContent value="reviews">
        <NftReviews nftId={nft.id} />
      </TabsContent>
    </Tabs>
  )
}
