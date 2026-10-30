import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod/mini"

import { showComingSoon } from "@/components/coming-soon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const newsletterSchema = z.object({
  email: z.string().check(z.email("Digite um e-mail válido.")),
})

type NewsletterValues = z.infer<typeof newsletterSchema>

export function NewsletterForm() {
  const inputId = useId()
  const errorId = useId()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewsletterValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" },
  })

  return (
    <form noValidate onSubmit={handleSubmit(() => showComingSoon())}>
      <Label htmlFor={inputId} className="sr-only">
        E-mail
      </Label>
      <div className="flex">
        <Input
          id={inputId}
          type="email"
          autoComplete="email"
          placeholder="digite seu e-mail..."
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? errorId : undefined}
          className="rounded-l-md rounded-r-none border-0 bg-accent pl-3 placeholder:text-sm"
          {...register("email")}
        />
        <Button type="submit" className="rounded-l-none px-3 text-[18px]">
          Enviar
        </Button>
      </div>
      {errors.email && (
        <p id={errorId} className="mt-2 text-[13px]/4 text-destructive">
          {errors.email.message}
        </p>
      )}
    </form>
  )
}
