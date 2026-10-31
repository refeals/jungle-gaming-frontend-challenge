const ACTION_TOAST_DURATION_MS = 8_000

type NotifyAction = {
  label: string
  onClick: () => void
}

export function notify(message: string, action?: NotifyAction) {
  void import("sonner").then(({ toast }) => {
    toast.info(
      message,
      action
        ? { id: message, action, duration: ACTION_TOAST_DURATION_MS }
        : { id: message }
    )
  })
}
