import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

type OutputChunk = {
  type: "chunk"
  fileName: string
  imports: string[]
  facadeModuleId?: string | null
}

function collectChunkFiles(
  chunk: OutputChunk | undefined,
  chunks: Record<string, OutputChunk>,
  files = new Set<string>()
) {
  if (!chunk || files.has(chunk.fileName)) return files
  files.add(chunk.fileName)
  for (const name of chunk.imports)
    collectChunkFiles(chunks[name], chunks, files)
  return files
}

function preloadDataChunks(): Plugin {
  return {
    name: "preload-data-chunks",
    transformIndexHtml: {
      order: "post",
      handler(_, context) {
        if (!context.bundle) return []

        const chunks = Object.fromEntries(
          Object.values(context.bundle)
            .filter((item) => item.type === "chunk")
            .map((item) => [item.fileName, item as OutputChunk])
        )
        const findChunk = (path: string) =>
          Object.values(chunks).find((chunk) =>
            chunk.facadeModuleId?.includes(path)
          )
        const entry = Object.values(context.bundle).find(
          (item) => item.type === "chunk" && item.isEntry
        ) as OutputChunk | undefined
        const loaded = collectChunkFiles(entry, chunks)
        const toHrefs = (chunk: OutputChunk | undefined) =>
          [...collectChunkFiles(chunk, chunks)]
            .filter((file) => !loaded.has(file))
            .map((file) => `/${file}`)

        const mockTags = toHrefs(findChunk("src/mocks/start")).map((href) => ({
          tag: "link",
          attrs: { rel: "modulepreload", href },
          injectTo: "head" as const,
        }))
        const homeHrefs = toHrefs(findChunk("src/routes/index.tsx"))

        return [
          ...mockTags,
          {
            tag: "script",
            children: `if(location.pathname==="/"){for(const href of ${JSON.stringify(homeHrefs)}){const link=document.createElement("link");link.rel="modulepreload";link.href=href;document.head.append(link)}}`,
            injectTo: "head" as const,
          },
        ]
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    preloadDataChunks(),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      tldts: resolve(import.meta.dirname, "./src/mocks/tldts-stub.ts"),
    },
  },
})
