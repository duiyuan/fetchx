// rollup.config.js

const typescript = require("@rollup/plugin-typescript");

module.exports = {
  input: "src/index.ts",
  output: [
    { file: "lib/index.cjs.js", format: "cjs" },
    { file: "lib/index.esm.js", format: "esm" },
  ],
  external: ["axios"],
  plugins: [typescript()],
};
