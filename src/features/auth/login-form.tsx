import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { ComingSoonButton } from "@/components/coming-soon-button"
import { Button } from "@/components/ui/button"
import type { LoginInput } from "@/contracts"
import { loginInput } from "@/contracts/auth"
import { AuthField } from "@/features/auth/auth-field"
import { AUTH_SUBMIT_CLASS } from "@/features/auth/auth-styles"
import { useLogin } from "@/features/auth/session"
import { applyApiError } from "@/lib/form-errors"

const FIELD_NAMES = ["email", "password"] as const

export function LoginForm() {
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInput),
    defaultValues: { email: "", password: "" },
  })

  function submit(values: LoginInput) {
    setFormError(null)
    login.mutate(values, {
      onError: (error) =>
        setFormError(applyApiError(error, FIELD_NAMES, setError)),
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <div className="flex flex-col gap-3">
        <AuthField
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <AuthField
          isPassword
          label="Senha"
          autoComplete="current-password"
          placeholder="Senha"
          error={errors.password?.message}
          {...register("password")}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <ComingSoonButton className="text-[14px]/4 text-brand-text">
          Esqueceu a senha?
        </ComingSoonButton>
      </div>
      {formError && (
        <p role="alert" className="mt-3 text-[13px]/4 text-destructive">
          {formError}
        </p>
      )}
      <Button
        type="submit"
        disabled={login.isPending}
        className={AUTH_SUBMIT_CLASS}
      >
        {login.isPending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  )
}
