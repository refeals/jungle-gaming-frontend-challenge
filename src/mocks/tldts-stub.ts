export function getDomain(hostname: string) {
  const labels = hostname.split(".").filter(Boolean)
  return labels.length > 1 ? labels.slice(-2).join(".") : (labels[0] ?? null)
}
