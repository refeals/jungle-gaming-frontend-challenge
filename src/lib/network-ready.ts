export let networkReady: Promise<void> = Promise.resolve()

export function setNetworkReady(promise: Promise<void>) {
  networkReady = promise
}
