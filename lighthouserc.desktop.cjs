const { ci } = require("./lighthouserc.cjs")

module.exports = {
  ci: {
    ...ci,
    collect: {
      ...ci.collect,
      settings: { ...ci.collect.settings, preset: "desktop" },
    },
    upload: { ...ci.upload, outputDir: "lighthouse/results/desktop" },
  },
}
