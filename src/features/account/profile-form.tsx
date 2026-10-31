import { zodResolver } from "@hookform/resolvers/zod"
import { useState, type FormEvent } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod/mini"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ChangePasswordInput, Profile } from "@/contracts"
import { email, requiredEnsName, requiredText } from "@/contracts/common"
import { changePasswordInput } from "@/contracts/profile"
import { AvatarField } from "@/features/account/avatar-field"
import { EnsInput } from "@/features/account/ens-field"
import { FIELD_CONTROL_CLASS, FormField } from "@/features/account/form-field"
import { useChangePassword, useUpdateProfile } from "@/features/account/queries"
import { PasswordInput } from "@/features/auth/password-input"
import { getToken } from "@/features/auth/token-storage"
import { applyApiError } from "@/lib/form-errors"
import { notify } from "@/lib/notify"

const profileFormInput = z.object({
  displayName: requiredText,
  username: requiredText,
  email,
  ensName: requiredEnsName,
  walletNickname: requiredText,
})

type ProfileValues = z.infer<typeof profileFormInput>

const PROFILE_FIELDS = [
  "displayName",
  "username",
  "email",
  "ensName",
  "walletNickname",
] as const
const PASSWORD_FIELDS = [
  "currentPassword",
  "newPassword",
  "confirmPassword",
] as const
const EMPTY_PASSWORD: ChangePasswordInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}

function toProfileValues(profile: Profile): ProfileValues {
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensName: profile.ensName ?? "",
    walletNickname: profile.walletNickname ?? "",
  }
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile(profile.id)
  const changePassword = useChangePassword()
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileFormInput),
    values: toProfileValues(profile),
    resetOptions: { keepDirtyValues: true },
  })
  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordInput),
    defaultValues: EMPTY_PASSWORD,
    shouldFocusError: false,
  })
  const { errors: profileErrors, isDirty: isProfileDirty } =
    profileForm.formState
  const passwordErrors = passwordForm.formState.errors
  const isSaving = updateProfile.isPending || changePassword.isPending

  function saveProfile(values: ProfileValues): Promise<boolean> {
    setProfileError(null)
    return updateProfile
      .mutateAsync(values)
      .then((saved) => {
        profileForm.reset(toProfileValues(saved))
        notify("Perfil atualizado.")
        return true
      })
      .catch((error: unknown) => {
        setProfileError(
          applyApiError(error, PROFILE_FIELDS, profileForm.setError)
        )
        return false
      })
  }

  function savePassword(values: ChangePasswordInput, shouldFocus: boolean) {
    setPasswordError(null)
    return changePassword
      .mutateAsync(values)
      .then(() => {
        passwordForm.reset(EMPTY_PASSWORD)
        notify("Senha alterada.")
      })
      .catch((error: unknown) => {
        setPasswordError(
          applyApiError(
            error,
            PASSWORD_FIELDS,
            passwordForm.setError,
            shouldFocus
          )
        )
      })
      .finally(() => changePassword.reset())
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return

    const { newPassword, confirmPassword } = passwordForm.getValues()
    const shouldSavePassword = Boolean(newPassword || confirmPassword)

    setProfileError(null)
    setPasswordError(null)
    profileForm.clearErrors()
    passwordForm.clearErrors()

    if (!isProfileDirty && !shouldSavePassword) {
      notify("Nenhuma alteração para salvar.")
      return
    }

    let isProfileOk = true
    if (isProfileDirty) {
      await profileForm.handleSubmit(
        async (values) => {
          isProfileOk = await saveProfile(values)
        },
        () => {
          isProfileOk = false
        }
      )()
    }

    if (shouldSavePassword && getToken()) {
      await passwordForm.handleSubmit(
        (values) => savePassword(values, isProfileOk),
        (errors) => {
          const firstField = PASSWORD_FIELDS.find((name) => errors[name])
          if (isProfileOk && firstField) passwordForm.setFocus(firstField)
        }
      )()
    }
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)}>
      <h1 className="text-[16px]/4 font-bold">Perfil do colecionador</h1>

      <div className="mt-8 grid gap-6 md:grid-cols-2 md:gap-x-7">
        <FormField
          isRequired
          label="Nome de exibição"
          error={profileErrors.displayName?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              autoComplete="name"
              className={FIELD_CONTROL_CLASS}
              {...profileForm.register("displayName")}
            />
          )}
        </FormField>
        <FormField
          isRequired
          label="Nome de usuário"
          error={profileErrors.username?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              autoComplete="username"
              className={FIELD_CONTROL_CLASS}
              {...profileForm.register("username")}
            />
          )}
        </FormField>
        <FormField
          isRequired
          label="E-mail"
          error={profileErrors.email?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="email"
              autoComplete="email"
              className={FIELD_CONTROL_CLASS}
              {...profileForm.register("email")}
            />
          )}
        </FormField>
        <FormField
          isRequired
          label="Nome ENS"
          error={profileErrors.ensName?.message}
        >
          {(controlProps) => (
            <EnsInput {...controlProps} {...profileForm.register("ensName")} />
          )}
        </FormField>
        <FormField
          isRequired
          label="Apelido da carteira"
          error={profileErrors.walletNickname?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              className={FIELD_CONTROL_CLASS}
              {...profileForm.register("walletNickname")}
            />
          )}
        </FormField>
        <AvatarField profile={profile} />
      </div>

      {profileError && (
        <p role="alert" className="mt-4 text-[13px]/4 text-destructive">
          {profileError}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-[16px]/4 font-medium">Alterar senha</h2>
        <div className="mt-6 grid gap-6 md:w-[calc(50%-14px)]">
          <FormField
            label="Senha atual"
            error={passwordErrors.currentPassword?.message}
          >
            {(controlProps) => (
              <PasswordInput
                {...controlProps}
                autoComplete="current-password"
                className={FIELD_CONTROL_CLASS}
                {...passwordForm.register("currentPassword")}
              />
            )}
          </FormField>
          <FormField
            label="Nova senha"
            error={passwordErrors.newPassword?.message}
          >
            {(controlProps) => (
              <PasswordInput
                {...controlProps}
                autoComplete="new-password"
                className={FIELD_CONTROL_CLASS}
                {...passwordForm.register("newPassword")}
              />
            )}
          </FormField>
          <FormField
            label="Confirmar nova senha"
            error={passwordErrors.confirmPassword?.message}
          >
            {(controlProps) => (
              <PasswordInput
                {...controlProps}
                autoComplete="new-password"
                className={FIELD_CONTROL_CLASS}
                {...passwordForm.register("confirmPassword")}
              />
            )}
          </FormField>
        </div>
        {passwordError && (
          <p role="alert" className="mt-4 text-[13px]/4 text-destructive">
            {passwordError}
          </p>
        )}
      </section>

      <Button
        type="submit"
        disabled={isSaving}
        className="mt-8 h-10 w-[131px] rounded-[3px] px-0 text-[14px]"
      >
        {isSaving ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  )
}
