import { HttpResponse, type JsonBodyType, type PathParams } from "msw"
import type * as z from "zod/mini"

import { fail, HttpFailure } from "@/mocks/http/failure"
import { afterHandler, beforeHandler } from "@/mocks/scenarios/apply"

export { fail }

type RouteContext = {
  request: Request
  params: PathParams
}

export function ok<Schema extends z.ZodMiniType>(
  schema: Schema,
  data: z.input<Schema>,
  init?: ResponseInit
) {
  return HttpResponse.json(schema.parse(data) as JsonBodyType, init)
}

export function noContent() {
  return new HttpResponse(null, { status: 204 })
}

function toFields(issues: z.core.$ZodIssue[]) {
  const fields: Record<string, string> = {}
  for (const issue of issues) {
    const path = issue.path.join(".")
    fields[path] ??= issue.message
  }
  return fields
}

export async function readBody<Schema extends z.ZodMiniType>(
  request: Request,
  schema: Schema
): Promise<z.output<Schema>> {
  const raw: unknown = await request.json().catch(() => {
    fail(400, "validation_error", "Corpo da requisição inválido.")
  })
  const parsed = schema.safeParse(raw)

  if (!parsed.success) {
    fail(422, "validation_error", "Verifique os campos informados.", {
      fields: toFields(parsed.error.issues),
    })
  }

  return parsed.data
}

export function readQuery<Schema extends z.ZodMiniType>(
  request: Request,
  schema: Schema
): z.output<Schema> {
  const raw = Object.fromEntries(new URL(request.url).searchParams)
  const parsed = schema.safeParse(raw)

  if (!parsed.success) {
    fail(400, "validation_error", "Parâmetros de busca inválidos.", {
      fields: toFields(parsed.error.issues),
    })
  }

  return parsed.data
}

export function pathParam(params: PathParams, name: string) {
  return String(params[name])
}

export function route(
  handler: (context: RouteContext) => Response | Promise<Response>
) {
  return async (context: RouteContext) => {
    try {
      const interrupted = await beforeHandler(context.request)
      if (interrupted) return interrupted

      const response = await handler(context)
      await afterHandler(context.request, response)
      return response
    } catch (error) {
      if (error instanceof HttpFailure) {
        return HttpResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
              ...error.extras,
            },
          } as JsonBodyType,
          { status: error.status }
        )
      }

      console.error(error)
      return HttpResponse.json(
        {
          error: {
            code: "server_error",
            message: "Algo deu errado. Tente novamente.",
          },
        },
        { status: 500 }
      )
    }
  }
}
