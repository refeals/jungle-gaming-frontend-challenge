import { Component, type ReactNode } from "react"

type LazyBoundaryProps = {
  fallback: ReactNode
  children: ReactNode
}

export class LazyBoundary extends Component<
  LazyBoundaryProps,
  { hasFailed: boolean }
> {
  state = { hasFailed: false }

  static getDerivedStateFromError() {
    return { hasFailed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    return this.state.hasFailed ? this.props.fallback : this.props.children
  }
}
