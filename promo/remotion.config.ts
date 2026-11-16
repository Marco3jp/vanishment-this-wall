import { Config } from "@remotion/cli/config";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";

// capture/headless.ts と同じ理由で、Playwright の headless shell を EGL 経由の GPU で描かせる。
// WSL では npm scripts で GALLIUM_DRIVER=d3d12 を渡している
const cache = `${homedir()}/.cache/ms-playwright`;
const shell = existsSync(cache)
  ? readdirSync(cache)
      .filter((d) => d.startsWith("chromium_headless_shell-"))
      .sort()
      .reverse()
      .flatMap((d) => readdirSync(`${cache}/${d}`).map((sub) => `${cache}/${d}/${sub}/chrome-headless-shell`))
      .find((p) => existsSync(p))
  : undefined;
if (shell) Config.setBrowserExecutable(shell);
Config.setChromiumOpenGlRenderer("angle-egl");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
