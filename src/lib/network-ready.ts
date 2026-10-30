const NETWORK_READY_TIMEOUT = 10_000

let networkReady: Promise<void> = Promise.resolve()

export function setNetworkReady(promise: Promise<void>) {
  networkReady = promise
  promise.catch((error: unknown) => console.error(error))
}

export function waitForNetworkReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Network setup timed out")),
      NETWORK_READY_TIMEOUT
    )
    networkReady.then(resolve, reject).finally(() => clearTimeout(timer))
  })
}
