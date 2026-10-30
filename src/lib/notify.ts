export function notify(message: string) {
  void import("sonner").then(({ toast }) => {
    toast.info(message, { id: message })
  })
}
