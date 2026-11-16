// 配信ページと視聴ページを本物のサーバーで動かし、動画の素材になるスクリーンショットを撮る。
// 出力：public/shots/*.png と src/shots.json（要素の位置。CSS ピクセル）
//   bun capture/capture.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import type { BrowserContext, Page } from "playwright-core";
import { launchHeadless, rendererOf } from "./headless.ts";

const promoDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = join(promoDir, "..");
const shotsDir = join(promoDir, "public/shots");
mkdirSync(shotsDir, { recursive: true });

const PORT = 47899;
// 撮った画面には WSL の中のアドレスが出るので、家の LAN らしいアドレスに置き換える
const PC_IP = "192.168.1.23";
const PHONE_IP = "192.168.1.41";
const SHOWN_URL = `http://${PC_IP}:47800/`;
const lanIp = Object.values(networkInterfaces()).flat().find((a) => a?.family === "IPv4" && !a.internal)!.address;
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";

const SENDER_VIEWPORT = { width: 1280, height: 800 };
const PHONE_VIEWPORT = { width: 412, height: 915 };
const SCALE = 2;

const server = Bun.spawn(["bun", "run", "server.ts", String(PORT), "--no-open"], { cwd: repoDir, stdout: "ignore", stderr: "inherit" });
await Bun.sleep(800);

const browser = await launchHeadless({
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream=fps=60", "--autoplay-policy=no-user-gesture-required"],
});

const layout: Record<string, unknown> = { sender: { viewport: SENDER_VIEWPORT }, phone: { viewport: PHONE_VIEWPORT }, scale: SCALE, url: SHOWN_URL };

function replaceIps(page: Page, rules: [string, string][]) {
  return page.evaluate((rules) => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      let t = n.textContent ?? "";
      for (const [from, to] of rules) t = t.split(from).join(to);
      if (t !== n.textContent) n.textContent = t;
    }
  }, rules);
}

// headless shell は接続の欄の自分側のアドレスを空で返すので、PC のアドレスを入れる
const senderIps = (): [string, string][] => [["host → host", `host ${PC_IP} → host`], [`host ${lanIp} →`, `host ${PC_IP} →`], [lanIp, PHONE_IP]];
const phoneIps = (): [string, string][] => [[lanIp, PC_IP]];

async function rect(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} が見つからない`);
  const scrollY = await page.evaluate(() => window.scrollY);
  return { x: box.x, y: box.y + scrollY, w: box.width, h: box.height };
}

async function shotSender(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await replaceIps(page, senderIps());
  await page.screenshot({ path: join(shotsDir, `${name}.png`), fullPage: true });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  (layout.sender as Record<string, unknown>)[name] = {
    height,
    start: await rect(page, "#startBtn"),
    qr: await rect(page, "#urls svg"),
    preview: await rect(page, "#preview"),
    dev: await rect(page, ".card.dev"),
  };
}

// 視聴ページは映像だけ透明にして撮り、動画側で映像を下に敷く
async function shotPhone(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await replaceIps(page, phoneIps());
  await page.screenshot({ path: join(shotsDir, `${name}.png`), omitBackground: true });
}

// 動画のテロップと同じフォントで描く。WSL には日本語のフォントが IPA と文泉驛しか無い
const FONT_PATH = join(promoDir, "public/fonts/NotoSansJP.ttf");
const FONT_CSS = `@font-face{font-family:PromoJP;src:url(/__promo/font.ttf)}
body,button,input,select{font-family:PromoJP,sans-serif!important}
code,pre,#dev,.log{font-family:"DejaVu Sans Mono",PromoJP,monospace!important}`;

async function useFont(ctx: BrowserContext) {
  await ctx.route("**/__promo/font.ttf", (route) => route.fulfill({ path: FONT_PATH, contentType: "font/ttf" }));
  await ctx.addInitScript((css) => {
    addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.append(s);
    });
  }, FONT_CSS);
}

async function phoneContext(viewport: { width: number; height: number }): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true, userAgent: ANDROID_UA, colorScheme: "dark" });
  await useFont(ctx);
  await ctx.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = "html,body,#stage,video{background:transparent!important} video{opacity:0!important}";
      document.head.append(s);
    });
  });
  return ctx;
}

try {
  const senderCtx = await browser.newContext({ viewport: SENDER_VIEWPORT, deviceScaleFactor: SCALE, colorScheme: "dark" });
  await useFont(senderCtx);
  await senderCtx.route("**/api/info", async (route) =>
    route.fulfill({ json: { urls: [{ url: SHOWN_URL, qr: await QRCode.toString(SHOWN_URL, { type: "svg", margin: 1 }) }] } }),
  );
  await senderCtx.addInitScript(() => {
    localStorage.clear();
    addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = "#preview{visibility:hidden}";
      document.head.append(s);
    });
  });
  const sender = await senderCtx.newPage();
  await sender.goto(`http://localhost:${PORT}/send`);
  await sender.waitForSelector("#urls svg");
  console.log(`renderer: ${await rendererOf(sender)}`);
  await shotSender(sender, "send_idle");

  const phoneCtx = await phoneContext(PHONE_VIEWPORT);
  const phone = await phoneCtx.newPage();
  await phone.goto(`http://${lanIp}:${PORT}/`);
  await phone.waitForTimeout(500);
  await shotPhone(phone, "phone_waiting");

  await sender.click("#startBtn");
  await phone.waitForSelector("#unmute", { state: "visible", timeout: 15000 });
  await phone.waitForTimeout(3000);
  await shotPhone(phone, "phone_unmute");

  await phone.click("#unmute");
  await phone.waitForSelector("#bar:not(.hidden)");
  await phone.waitForTimeout(400);
  await shotPhone(phone, "phone_bar");

  await phone.click("#settingsBtn");
  await phone.waitForTimeout(300);
  for (let ms = 0; ms <= 120; ms += 10) {
    if (ms > 0) await phone.click("#delayPlus");
    if (ms % 30 === 0) await shotPhone(phone, `phone_delay_${ms}`);
  }
  await phone.click("#rotateFs");
  await shotPhone(phone, "phone_rotate");
  await phone.click("#settingsBtn");

  await sender.waitForTimeout(3000);
  await shotSender(sender, "send_live");

  await sender.check("#devToggle");
  await phone.waitForSelector("#dev.show");
  await sender.waitForTimeout(6000);
  await shotSender(sender, "send_dev");
  await phone.waitForSelector("#bar.hidden", { timeout: 10000 }).catch(() => {});
  await shotPhone(phone, "phone_dev");

  const landCtx = await phoneContext({ width: PHONE_VIEWPORT.height, height: PHONE_VIEWPORT.width });
  const land = await landCtx.newPage();
  await land.goto(`http://${lanIp}:${PORT}/`);
  await land.waitForSelector("#unmute", { state: "visible", timeout: 15000 });
  await land.evaluate(() => document.getElementById("devClose")?.click());
  await land.click("#unmute");
  await land.waitForSelector("#bar:not(.hidden)");
  await land.waitForTimeout(400);
  await shotPhone(land, "phone_land_bar");

  writeFileSync(join(shotsDir, "qr.svg"), await QRCode.toString(SHOWN_URL, { type: "svg", margin: 1 }));
  writeFileSync(join(promoDir, "src/shots.json"), JSON.stringify(layout, null, 2) + "\n");
  console.log(`saved to ${shotsDir}`);
} finally {
  await browser.close();
  server.kill();
}
