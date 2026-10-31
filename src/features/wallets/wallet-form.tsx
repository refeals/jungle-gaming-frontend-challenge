import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod/mini"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Wallet } from "@/contracts"
import {
  addressOrEns,
  email,
  ethAddress,
  network,
  requiredEnsName,
  requiredText,
} from "@/contracts/common"
import { walletType } from "@/contracts/wallet"
import { EnsInput } from "@/features/account/ens-field"
import { FIELD_CONTROL_CLASS, FormField } from "@/features/account/form-field"
import { useSaveWallet } from "@/features/wallets/queries"
import { networkItems, walletTypeItems } from "@/features/wallets/labels"
import { SelectField } from "@/features/wallets/wallet-fields"
import { applyApiError } from "@/lib/form-errors"
import { notify } from "@/lib/notify"

const walletFormInput = z.object({
  displayName: requiredText,
  nickname: requiredText,
  network,
  profileName: requiredText,
  address: ethAddress,
  secondaryAddress: z.string().check(
    z.refine((value) => !value || addressOrEns.safeParse(value).success, {
      error: "Informe um endereço 0x ou um nome .eth",
    })
  ),
  walletType,
  referralCode: requiredText,
  email,
  ensName: requiredEnsName,
})

export type WalletValues = z.infer<typeof walletFormInput>
export type WalletDraft = Partial<WalletValues>

const FIELD_NAMES = [
  "displayName",
  "nickname",
  "network",
  "profileName",
  "address",
  "secondaryAddress",
  "walletType",
  "referralCode",
  "email",
  "ensName",
] as const

export function toWalletValues(wallet: Wallet): WalletValues {
  return {
    displayName: wallet.displayName,
    nickname: wallet.nickname,
    network: wallet.network,
    profileName: wallet.profileName,
    address: wallet.address,
    secondaryAddress: wallet.secondaryAddress ?? "",
    walletType: wallet.walletType,
    referralCode: wallet.referralCode ?? "",
    email: wallet.email,
    ensName: wallet.ensName ?? "",
  }
}

export function toAccountValues(wallet: Wallet): WalletDraft {
  return {
    displayName: wallet.displayName,
    profileName: wallet.profileName,
    email: wallet.email,
    ensName: wallet.ensName ?? "",
    referralCode: wallet.referralCode ?? "",
  }
}

const EMPTY_WALLET: WalletDraft = {
  displayName: "",
  nickname: "",
  profileName: "",
  address: "",
  secondaryAddress: "",
  referralCode: "",
  email: "",
  ensName: "",
}

type WalletFormProps = {
  userId: string
  slot: Wallet["slot"]
  wallet: Wallet | undefined
  initialValues?: WalletDraft
  formId?: string
  onSaved?: () => void
}

export function WalletForm({
  userId,
  slot,
  wallet,
  initialValues,
  formId,
  onSaved,
}: WalletFormProps) {
  const saveWallet = useSaveWallet(userId, wallet)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<WalletValues>({
    resolver: zodResolver(walletFormInput),
    defaultValues: { ...EMPTY_WALLET, ...initialValues },
    values: wallet && toWalletValues(wallet),
    resetOptions: { keepDirtyValues: true },
  })

  function submit(values: WalletValues) {
    setFormError(null)
    return saveWallet
      .mutateAsync({
        ...values,
        slot,
        secondaryAddress: values.secondaryAddress || null,
      })
      .then((saved) => {
        reset(toWalletValues(saved))
        notify("Carteira salva.")
        onSaved?.()
      })
      .catch((error: unknown) => {
        setFormError(applyApiError(error, FIELD_NAMES, setError))
      })
  }

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
    >
      <div className="mt-8 grid gap-6 md:grid-cols-2 md:gap-x-7">
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
          label="Apelido da carteira"
          error={errors.nickname?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              className={FIELD_CONTROL_CLASS}
              {...register("nickname")}
            />
          )}
        </FormField>
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
        <FormField
          isRequired
          label="Endereço da carteira"
          error={errors.address?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              placeholder="Endereço 0x da carteira"
              className={FIELD_CONTROL_CLASS}
              {...register("address")}
            />
          )}
        </FormField>
        <FormField
          isLabelHidden
          label="ENS ou carteira secundária"
          error={errors.secondaryAddress?.message}
          className="md:mt-[25px]"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              placeholder="ENS ou carteira secundária (opcional)"
              className={FIELD_CONTROL_CLASS}
              {...register("secondaryAddress")}
            />
          )}
        </FormField>
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
            />
          )}
        </FormField>
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

      {formError && (
        <p role="alert" className="mt-4 text-[13px]/4 text-destructive">
          {formError}
        </p>
      )}

      <Button
        type="submit"
        disabled={saveWallet.isPending}
        className="mt-8 h-10 w-[131px] rounded-[3px] px-0 text-[14px]"
      >
        {saveWallet.isPending ? "Salvando..." : "Salvar carteira"}
      </Button>
    </form>
  )
}
