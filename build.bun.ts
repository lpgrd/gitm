#!/usr/bin/env bun
import { $ } from "bun";
import { build } from "tsup";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

console.log("🚀 Building GitM with Bun optimizations...");

// Read package.json to get version
const packageJson = JSON.parse(
  readFileSync(join(import.meta.dir, "package.json"), "utf-8")
);

// Clean dist directory
await $`rm -rf dist`;

// Build with tsup optimized for Bun
await build({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node18",
  platform: "node",
  bundle: true,
  minify: true,
  treeshake: true,
  sourcemap: false,
  clean: true,
  shims: false,
  dts: false,
  splitting: false,  // Disable code splitting for single bundle
  outDir: "dist",
  // Don't load the default config
  config: false,
  // Don't add any banner/shebang here
  external: [
    "fs",
    "path",
    "os",
    "child_process",
    "crypto",
    "util",
    "events",
    "stream",
    "buffer",
    "url",
    "http",
    "https",
    "net",
    "tls",
    "readline",
    "tty",
    "fsevents",
    "esbuild",
  ],
  esbuildOptions(options) {
    // Add plugin to remove existing shebang
    options.plugins = [
      {
        name: "remove-shebang",
        setup(build) {
          build.onLoad({ filter: /cli\.ts$/ }, async (args) => {
            let contents = await Bun.file(args.path).text();
            // Remove existing shebang if present
            contents = contents.replace(/^#!.*\n/, "");
            return { contents, loader: "ts" };
          });
        },
      },
    ];
    
    options.alias = {
      "@": "./src",
      "@types": "./src/types",
      "@utils": "./src/utils",
      "@lib": "./src/lib",
      "@commands": "./src/commands",
      "@config": "./src/config",
    };
    options.treeShaking = true;
    options.minifyWhitespace = true;
    options.minifyIdentifiers = true;
    options.minifySyntax = true;
    // Define constants to be replaced at build time
    options.define = {
      ...options.define,
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __APP_NAME__: JSON.stringify(packageJson.name),
      "process.env.BUN": "true",
    };
  },
});

// Post-process: Add Bun shebang to the built file
const distPath = join(import.meta.dir, "dist/cli.js");
let content = readFileSync(distPath, "utf-8");

// Remove any existing shebang
content = content.replace(/^#!.*\n/, "");

// Add Bun shebang for optimal performance
content = "#!/usr/bin/env bun\n" + content;

// Write back
writeFileSync(distPath, content);

// Make the CLI executable
await $`chmod +x dist/cli.js`;

console.log("✅ Build complete!");