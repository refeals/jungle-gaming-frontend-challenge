import { execSync } from "node:child_process"
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import { join } from "node:path"

const RESULTS_DIR = "lighthouse/results"
const PROFILES = ["mobile", "desktop"]
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"]
const EXPECTED_RUNS = 3

const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const toSeconds = (ms) => `${(ms / 1000).toFixed(2).replace(".", ",")} s`
const toScore = (lhr, category) => {
  const score = lhr.categories[category].score
  if (score === null)
    throw new Error(`${lhr.requestedUrl}: ${category} sem nota`)
  return Math.round(score * 100)
}
const metric = (lhr, audit) => lhr.audits[audit].numericValue

function readRuns(profile) {
  const dir = join(RESULTS_DIR, profile)
  rmSync(join(dir, "manifest.json"), { force: true })
  return readdirSync(dir)
    .filter((file) => file.endsWith(".report.json"))
    .map((file) => JSON.parse(readFileSync(join(dir, file), "utf8")))
    .sort((a, b) => a.fetchTime.localeCompare(b.fetchTime))
}

function toRow(profile, path, runs) {
  if (runs.length !== EXPECTED_RUNS)
    throw new Error(
      `${profile} ${path}: ${runs.length} execuções, esperava ${EXPECTED_RUNS}`
    )
  const failed = runs.find((lhr) => lhr.runtimeError)
  if (failed)
    throw new Error(`${profile} ${path}: ${failed.runtimeError.message}`)

  const scores = CATEGORIES.map((category) =>
    median(runs.map((lhr) => toScore(lhr, category)))
  )
  const seconds = (audit) =>
    toSeconds(median(runs.map((lhr) => metric(lhr, audit))))
  const tbt = Math.round(
    median(runs.map((lhr) => metric(lhr, "total-blocking-time")))
  )
  const cls = median(runs.map((lhr) => metric(lhr, "cumulative-layout-shift")))
  const history = runs.map((lhr) => toScore(lhr, "performance")).join(", ")

  return [
    path === "/" ? "Home" : "Detalhe",
    profile === "mobile" ? "Mobile" : "Desktop",
    ...scores,
    seconds("first-contentful-paint"),
    seconds("largest-contentful-paint"),
    `${tbt} ms`,
    cls.toFixed(3).replace(".", ","),
    history,
  ]
}

function describeThrottling({
  throttlingMethod,
  throttling,
  formFactor,
  screenEmulation,
}) {
  return [
    `${formFactor === "mobile" ? "Mobile" : "Desktop"}: ${throttlingMethod}`,
    `RTT ${throttling.rttMs} ms`,
    `${throttling.throughputKbps} kbps`,
    `CPU ${throttling.cpuSlowdownMultiplier}x`,
    `tela ${screenEmulation.width}x${screenEmulation.height}`,
  ].join(", ")
}

const rows = []
const settings = []
const allRuns = []

for (const profile of PROFILES) {
  const runs = readRuns(profile)
  if (runs.length === 0) throw new Error(`${profile}: nenhuma execução`)
  allRuns.push(...runs)
  settings.push(describeThrottling(runs[0].configSettings))
  const paths = [
    ...new Set(runs.map((lhr) => new URL(lhr.requestedUrl).pathname)),
  ]
  for (const path of paths) {
    rows.push(
      toRow(
        profile,
        path,
        runs.filter((lhr) => new URL(lhr.requestedUrl).pathname === path)
      )
    )
  }
}

if (rows.length !== PROFILES.length * 2)
  throw new Error(`${rows.length} conjuntos, esperava ${PROFILES.length * 2}`)

const first = allRuns[0]
const chrome = first.environment.hostUserAgent.match(/Chrome\/([\d.]+)/)?.[1]
const commit = execSync("git rev-parse --short HEAD", {
  encoding: "utf8",
}).trim()

const summary = `# Lighthouse

Mediana de ${EXPECTED_RUNS} execuções por página e perfil. Relatórios HTML e JSON de cada execução em \`lighthouse/results/\`. Análise em \`ARCHITECTURE.md\`.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Performance por execução |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}

## Ambiente

| Item | Valor |
|---|---|
| Alvo | ${new URL(first.requestedUrl).origin} |
| Commit do checkout | \`${commit}\` |
| Data | ${first.fetchTime} |
| Lighthouse | ${first.lighthouseVersion} |
| Chrome | ${chrome} |
| Node | ${process.version} |
| Sistema | ${os.type()} ${os.release()} ${os.arch()} |
| Índice de benchmark | ${Math.round(first.environment.benchmarkIndex)} |
| Condições | ${settings.join(". ")} |

## Cenário

Primeira visita, com perfil novo a cada execução. Cada carregamento registra o service worker do MSW e abre o socket simulado. Build de produção com o cenário \`default\` dos mocks e o painel ativo, sem \`?panel=off\` nem qualquer simplificação para a auditoria.
`

writeFileSync("lighthouse/SUMMARY.md", summary)
process.stdout.write(summary)
