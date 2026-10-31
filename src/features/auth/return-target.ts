type ReturnLocation = {
  pathname: string
  searchStr: string
  hash: string
}

export function sanitizeReturnTarget(target: string) {
  const { pathname, search, hash } = new URL(target, window.location.origin)
  return getReturnTarget({ pathname, searchStr: search, hash: hash.slice(1) })
}

export function getReturnTarget({ pathname, searchStr, hash }: ReturnLocation) {
  const params = new URLSearchParams(searchStr)
  params.delete("auth")
  params.delete("redirect")
  const query = params.toString()

  return `${pathname}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`
}
