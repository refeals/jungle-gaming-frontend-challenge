import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import type { RegisterInput } from "@/contracts"
import { registerInput } from "@/contracts/auth"
import { AuthField } from "@/features/auth/auth-field"
import { AUTH_SUBMIT_CLASS } from "@/features/auth/auth-styles"
import { useRegister } from "@/features/auth/session"
import { applyApiError } from "@/lib/form-errors"

const FIELD_NAMES = [
  "username",
  "email",
  "password",
  "confirmPassword",
] as const

export function RegisterForm() {
  const createAccount = useRegister()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerInput),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  function submit(values: RegisterInput) {
    setFormError(null)
    createAccount.mutate(values, {
      onError: (error) =>
        setFormError(applyApiError(error, FIELD_NAMES, setError)),
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <div className="flex flex-col gap-3">
        <AuthField
          label="Nome de usuário"
          autoComplete="username"
          placeholder="Nome de usuário"
          className="max-md:placeholder:text-center"
          error={errors.username?.message}
          {...register("username")}
        />
        <AuthField
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="Digite seu e-mail"
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthField
          isPassword
          label="Senha"
          autoComplete="new-password"
          placeholder="Senha"
          error={errors.password?.message}
          {...register("password")}
        />
        <AuthField
          isPassword
          label="Confirmar senha"
          autoComplete="new-password"
          placeholder="Confirmar senha"
          toggleClassName="md:hidden"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </div>
      {formError && (
        <p role="alert" className="mt-3 text-[13px]/4 text-destructive">
          {formError}
        </p>
      )}
      <Button
        type="submit"
        disabled={createAccount.isPending}
        className={AUTH_SUBMIT_CLASS}
      >
        {createAccount.isPending ? (
          "Criando..."
        ) : (
          <>
            <span className="md:hidden">Criar perfil</span>
            <span className="max-md:hidden">Criar conta</span>
          </>
        )}
      </Button>
    </form>
  )
}
