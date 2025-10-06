const path = require("path");

module.exports = {
  webpack: {
    configure: (config) => {
      // Allow imports from outside src (packages/shared)
      config.resolve.plugins = (config.resolve.plugins || []).filter(
        (p) => p.constructor && p.constructor.name !== "ModuleScopePlugin"
      );

      // Transpile our shared package source
      const oneOf = config.module.rules.find((r) =>
        Array.isArray(r.oneOf)
      ).oneOf;
      const babelRule = oneOf.find(
        (r) => r.loader && r.loader.includes("babel-loader")
      );
      const sharedSrc = path.resolve(__dirname, "packages/shared/src");
      const webSrc = path.resolve(__dirname, "src");
      babelRule.include = [webSrc, sharedSrc];

      config.resolve.symlinks = true; // follow workspace symlinks
      return config;
    },
  },
};
