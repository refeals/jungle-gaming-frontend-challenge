import { http } from "@/api/http"
import type { QuoteRequest } from "@/contracts"
import { quote } from "@/contracts/quote"

export async function createQuote(input: QuoteRequest, signal?: AbortSignal) {
  const { data } = await http.post<unknown>("/quotes", input, { signal })
  return quote.parse(data)
}
