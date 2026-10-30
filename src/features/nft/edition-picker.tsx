import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"

import type { Edition } from "@/contracts"
import { isEditionAvailable } from "@/features/nft/editions"

type EditionPickerProps = {
  editions: Edition[]
  value: string
  onChange: (editionId: string) => void
}

export function EditionPicker({
  editions,
  value,
  onChange,
}: EditionPickerProps) {
  return (
    <div>
      <p id="edition-label" className="text-[15px]/4 font-bold">
        Edição:
      </p>
      <RadioGroup
        aria-labelledby="edition-label"
        value={value}
        onValueChange={(next) => onChange(next as string)}
        className="mt-3 flex flex-wrap gap-1.5 max-md:gap-3"
      >
        {editions.map((edition) => (
          <Radio.Root
            key={edition.id}
            value={edition.id}
            disabled={!isEditionAvailable(edition)}
            className="flex h-7 cursor-pointer items-center gap-1 rounded-full border border-border px-1.5 text-[14px]/4 text-muted-foreground select-none data-checked:border-primary data-checked:font-medium data-checked:text-brand-text data-disabled:cursor-not-allowed data-disabled:text-subtle-foreground"
          >
            {edition.label}
            {!isEditionAvailable(edition) && (
              <span className="text-[12px]/4">Esgotada</span>
            )}
          </Radio.Root>
        ))}
      </RadioGroup>
    </div>
  )
}
