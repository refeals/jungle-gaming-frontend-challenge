const baseUrl = process.env.LIGHTHOUSE_BASE_URL?.replace(/\/$/, "")
const origin = baseUrl ?? "http://localhost:4173"

module.exports = {
  ci: {
    collect: {
      ...(baseUrl
        ? {}
        : {
            startServerCommand:
              "pnpm build && pnpm preview --port 4173 --strictPort",
            startServerReadyPattern: "Local:",
            startServerReadyTimeout: 180000,
          }),
      url: [`${origin}/`, `${origin}/nft/emerald-ape-042`],
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--headless=new",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "lighthouse/results/mobile",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%.report.%%EXTENSION%%",
    },
  },
}
