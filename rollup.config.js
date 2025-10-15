import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: [
    { file: "lib/index.cjs.js", format: "cjs" },
    { file: "lib/index.esm.js", format: "esm" },
  ],
  external: ["axios"],
  plugins: [typescript()],
};
