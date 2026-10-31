import { useFormContext } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Wallet } from "@/contracts"
import { walletType } from "@/contracts/wallet"
import { EnsInput } from "@/features/account/ens-field"
import { FIELD_CONTROL_CLASS, FormField } from "@/features/account/form-field"
import type { CheckoutValues } from "@/features/checkout/checkout-values"
import { networkItems, walletTypeItems } from "@/features/wallets/labels"
import { SelectField } from "@/features/wallets/wallet-fields"

const GRID = "grid gap-4 md:grid-cols-2 md:gap-x-6"

export function NetworkField() {
  const {
    control,
    formState: { errors },
  } = useFormContext<CheckoutValues>()

  return (
    <FormField isRequired label="Rede" error={errors.network?.message}>
      {(controlProps) => (
        <SelectField
          name="network"
          control={control}
          items={networkItems}
          placeholder="Selecione uma rede"
          controlProps={controlProps}
        />
      )}
    </FormField>
  )
}

export function CollectorFields({
  address,
  includesWallet,
  onWalletTypeSelected,
}: {
  address: string
  includesWallet: boolean
  onWalletTypeSelected?: (value: Wallet["walletType"]) => void
}) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<CheckoutValues>()

  return (
    <>
      <div className={GRID}>
        <FormField
          isRequired
          label="Nome de exibição"
          error={errors.displayName?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              className={FIELD_CONTROL_CLASS}
              {...register("displayName")}
            />
          )}
        </FormField>
        <FormField
          isRequired
          label="Nome de usuário"
          error={errors.username?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              className={FIELD_CONTROL_CLASS}
              {...register("username")}
            />
          )}
        </FormField>
        {includesWallet && <NetworkField />}
        <FormField
          isRequired
          label="Nome do perfil"
          error={errors.profileName?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              className={FIELD_CONTROL_CLASS}
              {...register("profileName")}
            />
          )}
        </FormField>
        {includesWallet && (
          <FormField isRequired label="Endereço da carteira">
            {(controlProps) => (
              <Input
                {...controlProps}
                readOnly
                value={address}
                className={`${FIELD_CONTROL_CLASS} truncate text-muted-foreground`}
              />
            )}
          </FormField>
        )}
        <FormField
          isLabelHidden={includesWallet}
          label={
            includesWallet
              ? "ENS ou carteira secundária"
              : "ENS ou carteira secundária (opcional)"
          }
          error={errors.secondaryAddress?.message}
          className={includesWallet ? "mt-[25px]" : undefined}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              placeholder={
                includesWallet
                  ? "ENS ou carteira secundária (opcional)"
                  : undefined
              }
              className={FIELD_CONTROL_CLASS}
              {...register("secondaryAddress")}
            />
          )}
        </FormField>
        {includesWallet && (
          <FormField
            isRequired
            label="Tipo de carteira"
            error={errors.walletType?.message}
          >
            {(controlProps) => (
              <SelectField
                name="walletType"
                control={control}
                items={walletTypeItems}
                placeholder="Selecione uma carteira"
                controlProps={controlProps}
                onValueSelected={(value) =>
                  onWalletTypeSelected?.(walletType.parse(value))
                }
              />
            )}
          </FormField>
        )}
        <FormField
          isRequired
          label="Código de indicação"
          error={errors.referralCode?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              className={FIELD_CONTROL_CLASS}
              {...register("referralCode")}
            />
          )}
        </FormField>
        <FormField isRequired label="E-mail" error={errors.email?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              type="email"
              className={FIELD_CONTROL_CLASS}
              {...register("email")}
            />
          )}
        </FormField>
        <FormField isRequired label="Nome ENS" error={errors.ensName?.message}>
          {(controlProps) => (
            <EnsInput {...controlProps} {...register("ensName")} />
          )}
        </FormField>
      </div>
    </>
  )
}

export function NoteField() {
  const { register } = useFormContext<CheckoutValues>()

  return (
    <FormField
      label="Observação do colecionador (opcional)"
      labelClassName="h-auto"
    >
      {(controlProps) => (
        <Textarea
          {...controlProps}
          className="h-[152px] w-full max-w-[350px] resize-none rounded-[3px] bg-transparent text-[15px] dark:bg-transparent"
          {...register("note")}
        />
      )}
    </FormField>
  )
}
