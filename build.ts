#!/usr/bin/env bun
import { readFileSync, writeFileSync, chmodSync } from "node:fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };
const version = pkg.version;

const result = await Bun.build({
  entrypoints: ["./src/main.ts"],
  outdir: "./dist",
  target: "node",
  minify: true,
  define: {
    "process.env.CLI_VERSION": JSON.stringify(version),
  },
  naming: "[dir]/piapi.mjs",
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const outPath = "./dist/piapi.mjs";
const bundled = readFileSync(outPath, "utf-8");
writeFileSync(outPath, `#!/usr/bin/env node\n${bundled}`);
chmodSync(outPath, 0o755);

console.log(`✓ Built dist/piapi.mjs (v${version})`);
