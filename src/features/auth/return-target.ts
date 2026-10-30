type ReturnLocation = {
  pathname: string
  searchStr: string
  hash: string
}

export function getReturnTarget({ pathname, searchStr, hash }: ReturnLocation) {
  const params = new URLSearchParams(searchStr)
  params.delete("auth")
  params.delete("redirect")
  const query = params.toString()

  return `${pathname}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`
}
