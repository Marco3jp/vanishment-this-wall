// 指定したフレームの静止画を書き出して、見た目を確かめる
//   bun capture/stills.ts <保存先ディレクトリ> <フレーム>...
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findHeadlessShell } from "./headless.ts";

const [outDir, ...frames] = process.argv.slice(2);
if (!outDir || !frames.length) {
  console.error("usage: bun capture/stills.ts <保存先ディレクトリ> <フレーム>...");
  process.exit(2);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const serveUrl = await bundle({ entryPoint: join(root, "src/index.ts"), publicDir: join(root, "public") });
const browserExecutable = findHeadlessShell() ?? null;
const chromiumOptions = { gl: "angle-egl" as const };
const puppeteerInstance = await openBrowser("chrome", { browserExecutable, chromiumOptions });
const composition = await selectComposition({ serveUrl, id: "Promo", puppeteerInstance, browserExecutable, chromiumOptions });
for (const f of frames.map(Number)) {
  await renderStill({ composition, serveUrl, frame: f, output: join(outDir, `f${String(f).padStart(4, "0")}.png`), puppeteerInstance, browserExecutable, chromiumOptions, scale: 0.5 });
  console.log(`frame ${f}`);
}
await puppeteerInstance.close({ silent: true });
