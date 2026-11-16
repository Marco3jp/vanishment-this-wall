// ヘッドレス Chromium を GPU で描くように起動する。Playwright の既定の SwiftShader（CPU）だと描くのが遅い。
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { chromium, type Browser, type LaunchOptions, type Page } from "playwright-core";

const PLAYWRIGHT_CACHE = `${homedir()}/.cache/ms-playwright`;

// フル版の chrome は WSL の d3d12 だとシェーダーのリンクに失敗するので、headless shell を使う
export function findHeadlessShell(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (!existsSync(PLAYWRIGHT_CACHE)) return undefined;
  const dirs = readdirSync(PLAYWRIGHT_CACHE).filter((d) => d.startsWith("chromium_headless_shell-")).sort().reverse();
  for (const dir of dirs) {
    for (const sub of readdirSync(`${PLAYWRIGHT_CACHE}/${dir}`)) {
      const path = `${PLAYWRIGHT_CACHE}/${dir}/${sub}/chrome-headless-shell`;
      if (existsSync(path)) return path;
    }
  }
  return undefined;
}

export function launchHeadless(options: LaunchOptions = {}): Promise<Browser> {
  // Linux では EGL 経由で GL ドライバに描かせる。llvmpipe は Chromium のブロックリストに載っているので外す。
  // WSL（/dev/dxg がある）では、指定しないと Mesa が llvmpipe を選ぶので、Windows の GPU につながる d3d12 を選ばせる
  const linux = process.platform === "linux";
  const args = linux ? ["--use-gl=angle", "--use-angle=gl-egl", "--ignore-gpu-blocklist"] : [];
  const env: Record<string, string> = linux && existsSync("/dev/dxg") ? { GALLIUM_DRIVER: "d3d12" } : {};
  return chromium.launch({
    executablePath: findHeadlessShell(),
    ...options,
    env: { ...env, ...process.env, ...options.env } as Record<string, string>,
    args: [...args, ...(options.args ?? [])],
  });
}

export function rendererOf(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "WebGL2 なし";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  });
}
