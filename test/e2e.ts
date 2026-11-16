import { chromium, type Page } from "playwright-core";
import { homedir, networkInterfaces } from "node:os";

const PORT = 18787;
const base = `http://localhost:${PORT}`;
const lanIp = Object.values(networkInterfaces()).flat().find((a) => a?.family === "IPv4" && !a.internal)!.address;

const server = Bun.spawn(["bun", "run", "server.ts", String(PORT), "--no-open"], { stdout: "ignore", stderr: "inherit" });
await Bun.sleep(800);

const browser = await chromium.launch({
  executablePath: `${homedir()}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext();

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "OK" : "NG"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed++;
}

const waitVideo = (page: Page, timeout = 10000) =>
  page
    .waitForFunction(() => {
      const v = document.querySelector("video")!;
      const t0 = Number(v.dataset.t0 ?? -1);
      if (t0 < 0) v.dataset.t0 = String(v.currentTime);
      return v.videoWidth > 0 && !v.paused && v.currentTime > Number(v.dataset.t0) + 0.5;
    }, null, { timeout, polling: 200 })
    .then(() => true, () => false)
    .finally(() => page.evaluate(() => delete document.querySelector("video")!.dataset.t0));

const statusText = async (page: Page) => (await page.locator("#status").textContent()) ?? "";
const isWaiting = async (page: Page) => (await statusText(page)).includes("待っています");

try {
  const viewer1 = await ctx.newPage();
  await viewer1.goto(`http://${lanIp}:${PORT}/`);
  await viewer1.waitForTimeout(500);
  check("配信前の視聴ページは待機表示", await isWaiting(viewer1), await statusText(viewer1));

  const sender = await ctx.newPage();
  await sender.goto(`${base}/send`);
  await sender.click("#testBtn");
  check("先に開いていた視聴ページに映像が届く", await waitVideo(viewer1));
  // 解像度は帯域の推定に合わせて数秒かけて上がっていく
  await viewer1.waitForFunction(() => document.querySelector("video")!.videoWidth === 1280, null, { timeout: 15000 }).catch(() => {});
  const v1 = await viewer1.evaluate(() => {
    const v = document.querySelector("video")!;
    return { w: v.videoWidth, h: v.videoHeight, audio: (v.srcObject as MediaStream | null)?.getAudioTracks().length ?? 0 };
  });
  check("映像は1280x720で音声トラックがある", v1.w === 1280 && v1.h === 720 && v1.audio === 1, JSON.stringify(v1));

  const defaults = await sender.evaluate(() => ({
    fps: (document.querySelector("#fps") as HTMLSelectElement).value,
    bitrate: (document.querySelector("#bitrate") as HTMLSelectElement).value,
    muteLocal: (document.querySelector("#muteLocal") as HTMLInputElement).checked,
  }));
  check("初期値は60fps・15Mbps・PCでタブの音を鳴らさない", defaults.fps === "60" && defaults.bitrate === "15000000" && defaults.muteLocal, JSON.stringify(defaults));
  const tipHidden = await sender.locator("#muteTip").isVisible();
  await sender.hover(".help button");
  await sender.waitForTimeout(200);
  check("？にマウスを乗せると説明が出る", !tipHidden && (await sender.locator("#muteTip").isVisible()));

  // 音は Web Audio の遅延を通って鳴る
  await viewer1.click("#unmute");
  const heard = await viewer1.waitForFunction(() => (window as any).screencastAudio().peak > 0.05, null, { timeout: 5000, polling: 20 }).then(() => true, () => false);
  const au = await viewer1.evaluate(() => (window as any).screencastAudio());
  check("タップすると Web Audio 経由で音が流れる", heard && au.state === "running" && au.gain === 1, JSON.stringify(au));
  await viewer1.click("#settingsBtn");
  for (let i = 0; i < 3; i++) await viewer1.click("#delayPlus");
  const d1 = await viewer1.evaluate(() => ({ a: (window as any).screencastAudio().delayMs, label: document.querySelector("#delayVal")!.textContent }));
  check("＋を3回押すと音が30ms遅れる", Math.abs(d1.a - 30) < 0.5 && d1.label === "音の遅れ +30ms", JSON.stringify(d1));
  await viewer1.click("#muteBtn");
  check("消音ボタンで音が止まる", (await viewer1.evaluate(() => (window as any).screencastAudio().gain)) === 0);
  await viewer1.click("#muteBtn");

  const viewer2 = await ctx.newPage();
  await viewer2.goto(`http://${lanIp}:${PORT}/`);
  check("後から開いた視聴ページにも映像が届く", await waitVideo(viewer2));
  await sender.waitForTimeout(300);
  const cnt = (await sender.locator("#viewerCount").textContent()) ?? "";
  check("送信側に「2台・届いているのは2台」と出る", cnt.includes("2台") && cnt.includes("届いているのは 2台"), cnt);
  await sender.waitForTimeout(4500);
  const live = await sender.evaluate(() => ({ live: document.querySelector("#live")!.textContent, peers: document.querySelector("#peers")!.textContent }));
  check("配信状況に映像・画質の上限・音が出る", /映像.*1280×720.*60fpsまで/.test(live.live) && live.live.includes("15Mbps") && live.live.includes("ステレオ"), live.live);
  check("端末ごとに解像度・fps・送信量が出る", /視聴中 \d+×\d+ \d+fps [\d.]+Mbps/.test(live.peers), live.peers);
  await sender.selectOption("#bitrate", "3000000");
  check("配信中に画質を変えると表示に反映される", ((await sender.locator("#live").textContent()) ?? "").includes("3Mbps"));
  await sender.waitForTimeout(300);
  const maxBr = await sender.evaluate(() =>
    // @ts-ignore 送信ページのスクリプトの peers を直接見る
    [...peers.values()].map((pc: RTCPeerConnection) => pc.getSenders().find((x) => x.track?.kind === "video")!.getParameters().encodings[0].maxBitrate));
  check("配信中に画質を変えると送信の上限も変わる", maxBr.length === 2 && maxBr.every((b: number) => b === 3000000), JSON.stringify(maxBr));
  await sender.selectOption("#bitrate", "15000000");

  await sender.click("#stopBtn");
  await viewer1.waitForTimeout(500);
  check("停止すると視聴側が待機表示に戻る", await isWaiting(viewer1), await statusText(viewer1));

  await sender.click("#startBtn");
  check("画面共有（getDisplayMedia）で再開すると届く", await waitVideo(viewer1));
  const locked = await sender.evaluate(() => {
    const tr = (document.querySelector("#preview") as HTMLVideoElement).srcObject as MediaStream;
    const v = tr.getVideoTracks()[0];
    return { settings: v.getSettings(), constraints: v.getConstraints() };
  });
  const cw = (locked.constraints.width as any)?.exact, ch = (locked.constraints.height as any)?.exact;
  // ヘッドレスの視聴ページの画面は 1280x720 なので、上限も 1280x720 になる
  check("取り込みの上限が視聴端末の画面に合わせて決まる", cw === 1280 && ch === 720 && locked.settings.width === cw && locked.settings.height === ch,
    `${locked.settings.width}x${locked.settings.height} 上限=${cw}x${ch}`);
  await sender.selectOption("#fps", "60");
  await sender.waitForTimeout(300);
  const after = await sender.evaluate(() => ((document.querySelector("#preview") as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0].getConstraints());
  check("フレームレートを変えても上限が外れない", (after.width as any)?.exact === cw && (after.frameRate as any)?.max === 60, JSON.stringify(after));
  const sizes = new Set<string>();
  for (let i = 0; i < 4; i++) {
    await Bun.sleep(1500);
    const st = await (await fetch(`${base}/api/stats`)).json();
    const last = st.findLast((x: any) => x.role === "sender");
    for (const list of Object.values(last.data.peers) as any[]) {
      const ms = list.find((y: any) => y.type === "media-source" && y.kind === "video");
      if (ms?.width) sizes.add(`${ms.width}x${ms.height}`);
    }
  }
  check("取り込んだ時点のサイズが変わらない", sizes.size === 1 && sizes.has(`${cw}x${ch}`), [...sizes].join(", "));
  // 視聴側の解像度は帯域の見積もりが上がるまで数秒かけて上がる
  const reached = await viewer1.waitForFunction((w) => document.querySelector("video")!.videoWidth === w, cw, { timeout: 20000 }).then(() => true, () => false);
  check("視聴側にも上限のサイズで届く", reached, await viewer1.evaluate(() => `${document.querySelector("video")!.videoWidth}x${document.querySelector("video")!.videoHeight}`));

  // 短辺 1220px・長辺 2712px の端末がつなぐと、上限がその画面に合わせて上がる
  const bigCtx = await browser.newContext({ viewport: { width: 400, height: 860 }, screen: { width: 610, height: 1356 }, deviceScaleFactor: 2 });
  const big = await bigCtx.newPage();
  await big.goto(`http://${lanIp}:${PORT}/`);
  const grown = await sender.waitForFunction(() => {
    const v = ((document.querySelector("#preview") as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0];
    return (v.getConstraints().height as any)?.exact === 1220;
  }, null, { timeout: 8000 }).then(() => true, () => false);
  const capNow = await sender.evaluate(() => {
    const v = ((document.querySelector("#preview") as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0];
    const c: any = v.getConstraints();
    return { cap: `${c.width?.exact}x${c.height?.exact}`, live: document.querySelector("#live")!.textContent };
  });
  check("大きい画面の端末がつなぐと上限が上がる", grown && capNow.cap === "2168x1220" && capNow.live!.includes("上限 2168×1220"), JSON.stringify(capNow));
  await sender.selectOption("#res", "720");
  await sender.waitForTimeout(500);
  const cap720 = await sender.evaluate(() => (((document.querySelector("#preview") as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0].getConstraints() as any).height?.exact);
  check("「720pまで」を選ぶと上限が720になる", cap720 === 720, String(cap720));
  await sender.selectOption("#res", "auto");
  await sender.waitForTimeout(500);
  const capOf = () => sender.evaluate(() => {
    const c: any = ((document.querySelector("#preview") as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0].getConstraints();
    return `${c.width?.exact}x${c.height?.exact}`;
  });
  check("「視聴端末に合わせる」に戻すと上限も戻る", (await capOf()) === "2168x1220", await capOf());
  // 大きい画面の端末が抜けると、10秒待ってから残りの端末に合わせて下げる
  await bigCtx.close();
  await sender.waitForTimeout(4000);
  check("大きい画面の端末が抜けた直後は上限を下げない", (await capOf()) === "2168x1220", await capOf());
  const shrunk = await sender.waitForFunction(() => {
    const c: any = ((document.querySelector("#preview") as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0].getConstraints();
    return c.height?.exact === 720;
  }, null, { timeout: 12000 }).then(() => true, () => false);
  check("10秒たつと残りの端末に合わせて上限を下げる", shrunk, await capOf());

  await viewer1.reload();
  await viewer1.waitForTimeout(300);
  check("音の遅れの設定は読み込み直しても残る", (await viewer1.locator("#delayVal").textContent()) === "音の遅れ +30ms", (await viewer1.locator("#delayVal").textContent()) ?? "");
  check("読み込み直したあとも映像が届く", await waitVideo(viewer1));
  // 音を早める（映像を遅らせる）
  await viewer1.evaluate(() => (window as any).showBar());
  await viewer1.click("#settingsBtn");
  for (let i = 0; i < 8; i++) await viewer1.click("#delayMinus");
  await viewer1.bringToFront();
  const negOk = await viewer1.waitForFunction(() => {
    const v = document.querySelector("#delayedVideo") as HTMLVideoElement;
    return v.style.display === "block" && v.videoWidth > 0 && !v.paused;
  }, null, { timeout: 5000 }).then(() => true, () => false);
  const neg = await viewer1.evaluate(() => {
    const v = document.querySelector("#delayedVideo") as HTMLVideoElement;
    // @ts-ignore 視聴ページの videoDelay を直接見る
    return { label: document.querySelector("#delayVal")!.textContent, hint: document.querySelector("#delayHint")!.textContent, shown: v.style.display, w: v.videoWidth, queue: videoDelay?.queue.length };
  });
  check("−で音の遅れをマイナスにすると、遅らせた映像を2つ目の video で映す", negOk && neg.label === "音の遅れ -50ms" && neg.hint === "映像を50ms遅らせています" && neg.queue <= 24, JSON.stringify(neg));
  check("設定を開いている間は操作バーが隠れない", await viewer1.waitForTimeout(3500).then(() => viewer1.locator("#bar").evaluate((e) => !e.classList.contains("hidden"))));
  for (let i = 0; i < 8; i++) await viewer1.click("#delayPlus");
  await viewer1.waitForTimeout(300);
  check("プラスに戻すと映像の遅延をやめる", (await viewer1.evaluate(() => (document.querySelector("#delayedVideo") as HTMLVideoElement).style.display)) === "none");
  const pip = await viewer1.evaluate(() => ({ enabled: document.pictureInPictureEnabled, shown: (document.querySelector("#pipBtn") as HTMLElement).style.display }));
  check("PiPが使えるブラウザではPiPボタンが出る", pip.enabled ? pip.shown === "" : pip.shown === "none", JSON.stringify(pip));
  const rot = await viewer1.evaluate(() => ({ checked: (document.querySelector("#rotateFs") as HTMLInputElement).checked }));
  check("全画面で横向きにする設定は初期値オン", rot.checked);
  await sender.close();
  await viewer1.waitForTimeout(500);
  check("送信ページを閉じると視聴側が待機表示", await isWaiting(viewer1), await statusText(viewer1));
  const sender2 = await ctx.newPage();
  await sender2.goto(`${base}/send`);
  await sender2.click("#testBtn");
  check("送信ページを開き直すと2台とも再び届く", (await waitVideo(viewer1)) && (await waitVideo(viewer2)));

  // 開発用モード
  await sender2.check("#devToggle");
  const overlay = await viewer1.waitForFunction(() => document.querySelector("#dev")!.classList.contains("show") && /デコーダー/.test(document.querySelector("#devText")!.textContent ?? ""), null, { timeout: 8000 }).then(() => true, () => false);
  check("開発用モードをオンにすると視聴ページに数字が出る", overlay, (await viewer1.locator("#devText").textContent()) ?? "");
  const panelOk = await sender2.waitForFunction(() => {
    const t = document.querySelector("#devPanel")!.textContent ?? "";
    return /エンコーダー/.test(t) && /デコーダー/.test(t) && /ms\/フレーム/.test(t) && !/まだ数字がありません/.test(t);
  }, null, { timeout: 10000 }).then(() => true, () => false);
  check("配信ページに端末ごとの送信・受信の数字が出る", panelOk, ((await sender2.locator("#devPanel").textContent()) ?? "").slice(0, 300));
  const dbg = await (await fetch(`${base}/api/debug`)).json();
  check("/api/debug に端末の画面サイズと出来事が出る", dbg.dev === true && dbg.viewers.length === 2 && dbg.viewers.every((v: any) => v.screen?.long > 0) && dbg.events.some((e: any) => e.kind === "cap"),
    JSON.stringify({ dev: dbg.dev, viewers: dbg.viewers.map((v: any) => v.screen), kinds: [...new Set(dbg.events.map((e: any) => e.kind))] }));
  const lanDbg = await fetch(`http://${lanIp}:${PORT}/api/debug`);
  check("/api/debug はLAN側からは開けない", lanDbg.status === 403, String(lanDbg.status));
  await viewer1.click("#devClose");
  check("× で視聴ページの数字を隠せる", !(await viewer1.locator("#dev").evaluate((e) => e.classList.contains("show"))));
  await sender2.uncheck("#devToggle");

  // 開発用モードをオンにしたまま閉じた配信ページを開き直しても、エラーなく動く
  const devCtx = await browser.newContext();
  await devCtx.addInitScript(() => localStorage.setItem("screencast.dev", "1"));
  const devPage = await devCtx.newPage();
  const devErrors: string[] = [];
  devPage.on("pageerror", (e) => devErrors.push(e.message));
  await devPage.goto(`${base}/send`);
  await devPage.waitForTimeout(1500);
  const devQr = await devPage.locator("#urls svg").count();
  const devConnected = !!(await (await fetch(`${base}/api/debug`)).json()).sender;
  check("開発用モードを保存したまま開き直しても配信ページが動く", devErrors.length === 0 && devQr > 0 && devConnected && (await devPage.locator("#devToggle").isChecked()),
    JSON.stringify({ devErrors, devQr, devConnected }));
  await devCtx.close();
  // 配信ページを閉じたので、元の配信ページを開き直す
  await sender2.reload();
  await sender2.click("#testBtn");

  const intruder = await ctx.newPage();
  await intruder.goto(`http://${lanIp}:${PORT}/send`);
  await intruder.waitForTimeout(800);
  const fatal = (await intruder.locator("#fatal").textContent()) ?? "";
  check("LAN側のアドレスで開いた送信ページは止められる", fatal.length > 0, fatal);
  check("そのあとも配信は乗っ取られていない", await waitVideo(viewer1, 3000));
} finally {
  await browser.close();
  server.kill();
}
console.log(failed ? `\n${failed}件失敗` : "\nすべて成功");
process.exit(failed ? 1 : 0);
