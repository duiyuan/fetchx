// // Strict Node.js detection to avoid false positives from build tool polyfills
// // (Rollup/Webpack/Next.js often inject fake process objects in browser bundles)
// export const isNode =
//   typeof process !== "undefined" &&
//   typeof process.versions === "object" &&
//   typeof process.versions.node === "string" &&
//   typeof XMLHttpRequest === "undefined";

export const isNode =
  Object.prototype.toString.call(
    typeof process !== "undefined" ? process : 0
  ) === "[object process]";
