import { networkInterfaces } from "node:os";
import type { ServerWebSocket } from "bun";
import QRCode from "qrcode";
import sendHtml from "./send.html" with { type: "text" };
import viewHtml from "./view.html" with { type: "text" };

const args = process.argv.slice(2);
const portArg = process.env.PORT ?? args.find((a) => /^\d+$/.test(a));
const AUTO_OPEN = !args.includes("--no-open");
// 開発用モード。--dev で起動するか、配信ページのチェックで切り替える
let devMode = args.includes("--dev");

// ダブルクリックで起動したとき、エラーでウィンドウが即座に閉じて読めなくならないようにする
function fatal(message: string): never {
  console.error(`\n起動できませんでした: ${message}`);
  if (process.platform === "win32") prompt("\nEnter キーで閉じます");
  process.exit(1);
}
process.on("uncaughtException", (e) => fatal(e?.stack ?? String(e)));

type Peer = {
  role: "sender" | "viewer"; id: string; ip: string; ua: string; since: string;
  screen?: { long: number; short: number };
};
type WS = ServerWebSocket<Peer>;

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    if (/vEthernet|WSL|Hyper-V|VirtualBox|VMware|docker|Loopback/i.test(name)) continue;
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254.")) out.push(a.address);
    }
  }
  return out;
}

const normalizeIp = (ip: string) => ip.replace(/^::ffff:/, "");
const isLoopback = (ip: string) => ip === "127.0.0.1" || ip === "::1";
const isIPv4 = (ip: string) => /^\d+\.\d+\.\d+\.\d+$/.test(ip);

// ブラウザは自分のIPを隠すために ICE candidate のアドレスを xxxx.local（mDNS）にする。
// マルチキャストを通さないルーターやメッシュWi-Fiだと相手が名前解決できずにつながらないので、
// サーバーが知っている実IPに書き換えた candidate も追加で渡す。
function withRealAddresses(candidate: string, ips: string[]): string[] {
  const parts = candidate.split(" ");
  if (parts.length < 8 || !parts[4]?.endsWith(".local")) return [];
  return ips.map((ip) => {
    const p = [...parts];
    p[4] = ip;
    return p.join(" ");
  });
}

let sender: WS | null = null;
const viewers = new Map<string, WS>();

const send = (ws: WS | null | undefined, msg: unknown) => ws?.send(JSON.stringify(msg));

function relayCandidate(to: WS | null, extra: Record<string, unknown>, cand: any, ips: string[]) {
  send(to, { type: "signal", ...extra, data: { candidate: cand } });
  for (const c of withRealAddresses(cand.candidate ?? "", ips)) {
    send(to, { type: "signal", ...extra, data: { candidate: { ...cand, candidate: c } } });
  }
}

// 受信状況の直近の記録。PCのブラウザで /api/stats を開くと見られる
const statsLog: { t: string; role: string; id: string; ip: string; data: unknown }[] = [];
function recordStats(ws: WS, data: unknown) {
  statsLog.push({ t: new Date().toISOString(), role: ws.data.role, id: ws.data.id, ip: ws.data.ip, data });
  if (statsLog.length > 600) statsLog.splice(0, statsLog.length - 600);
}

// 出来事の記録。/api/debug で見られる。開発用モードのときはターミナルにも出す
const events: { t: string; kind: string; text: string; data?: unknown }[] = [];
function event(kind: string, text: string, data?: unknown) {
  events.push({ t: new Date().toISOString(), kind, text, data });
  if (events.length > 500) events.splice(0, events.length - 500);
  if (devMode) log(`[${kind}] ${text}${data === undefined ? "" : " " + JSON.stringify(data)}`);
}

function setDev(on: boolean) {
  if (devMode === on) return;
  devMode = on;
  event("dev", `開発用モードを${on ? "オン" : "オフ"}にしました`);
  for (const v of viewers.values()) send(v, { type: "dev", on });
}

const viewerUrls = () => lanAddresses().map((ip) => `http://${ip}:${server.port}/`);

const handlers: Omit<Parameters<typeof Bun.serve<Peer>>[0], "port"> = {
  hostname: "0.0.0.0",
  async fetch(req, srv) {
    const url = new URL(req.url);
    const ip = normalizeIp(srv.requestIP(req)?.address ?? "");

    if (url.pathname === "/ws") {
      const role = url.searchParams.get("role") === "sender" ? "sender" : "viewer";
      const data: Peer = { role, id: crypto.randomUUID().slice(0, 8), ip, ua: req.headers.get("user-agent") ?? "", since: new Date().toISOString() };
      if (srv.upgrade(req, { data })) return;
      return new Response("websocket only", { status: 400 });
    }
    const html = (body: string) =>
      new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    if (url.pathname === "/") return html(viewHtml);
    if (url.pathname === "/send") return html(sendHtml);
    if (url.pathname === "/api/stats") {
      if (!isLoopback(ip)) return new Response("forbidden", { status: 403 });
      return Response.json(statsLog);
    }
    if (url.pathname === "/api/debug") {
      if (!isLoopback(ip)) return new Response("forbidden", { status: 403 });
      const latest: Record<string, unknown> = {};
      for (const x of statsLog) latest[`${x.role}:${x.id}`] = x;
      return Response.json({
        dev: devMode, port: server.port, lan: lanAddresses(),
        sender: sender && { id: sender.data.id, since: sender.data.since, ua: sender.data.ua },
        viewers: [...viewers.values()].map((v) => ({ id: v.data.id, ip: v.data.ip, since: v.data.since, ua: v.data.ua, screen: v.data.screen ?? null })),
        events, latest,
      });
    }
    if (url.pathname === "/api/info") {
      const urls = viewerUrls();
      const qrs = await Promise.all(urls.map((u) => QRCode.toString(u, { type: "svg", margin: 1 })));
      return Response.json({ urls: urls.map((u, i) => ({ url: u, qr: qrs[i] })) });
    }
    return new Response("not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      const { role, id, ip } = ws.data;
      if (role === "sender") {
        // 画面を送る役は、このPC上のブラウザからしか名乗れないようにする
        if (!isLoopback(ip)) {
          ws.close(4003, "sender must be localhost");
          return;
        }
        if (sender) sender.close(4001, "replaced");
        sender = ws;
        const screens: Record<string, unknown> = {};
        const info: Record<string, unknown> = {};
        for (const [id, v] of viewers) {
          if (v.data.screen) screens[id] = v.data.screen;
          info[id] = { ip: v.data.ip, ua: v.data.ua };
        }
        send(ws, { type: "hello", viewers: [...viewers.keys()], screens, info, dev: devMode });
        log(`配信ページが接続しました`);
        event("sender", "配信ページが接続しました");
      } else {
        viewers.set(id, ws);
        send(ws, { type: "hello", id, live: !!sender, dev: devMode });
        send(sender, { type: "viewer-join", id, info: { ip, ua: ws.data.ua } });
        log(`視聴端末が接続しました (${ip}) 計${viewers.size}台`);
        event("viewer", `視聴端末 ${id} が接続しました`, { ip, ua: ws.data.ua });
      }
    },
    message(ws, raw) {
      let msg: any;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (ws.data.role === "sender") {
        if (ws !== sender) return;
        if (msg.type === "signal") {
          const to = viewers.get(msg.to);
          if (!to) return;
          if (msg.data?.candidate) relayCandidate(to, {}, msg.data.candidate, lanAddresses());
          else send(to, { type: "signal", data: msg.data });
        } else if (msg.type === "stats") {
          recordStats(ws, msg.data);
        } else if (msg.type === "idle") {
          for (const v of viewers.values()) send(v, { type: "idle" });
          event("sender", "配信を止めました");
        } else if (msg.type === "dev") {
          setDev(!!msg.on);
        } else if (msg.type === "event") {
          event(String(msg.kind ?? "sender"), String(msg.text ?? ""), msg.data);
        }
      } else {
        const from = ws.data.id;
        if (msg.type === "signal") {
          const ips = isIPv4(ws.data.ip) ? [ws.data.ip] : [];
          if (msg.data?.candidate) relayCandidate(sender, { from }, msg.data.candidate, ips);
          else send(sender, { type: "signal", from, data: msg.data });
        } else if (msg.type === "stats") {
          recordStats(ws, msg.data);
          if (devMode) send(sender, { type: "viewer-stats", id: from, data: msg.data });
        } else if (msg.type === "screen") {
          const long = Math.round(Number(msg.long)), short = Math.round(Number(msg.short));
          if (!(long > 0 && short > 0 && long <= 16384 && short <= 16384)) return;
          ws.data.screen = { long, short };
          send(sender, { type: "viewer-screen", id: from, screen: ws.data.screen });
          event("screen", `視聴端末 ${from} の画面は ${long}×${short}`, msg.detail);
        } else if (msg.type === "request-offer") {
          send(sender, { type: "viewer-join", id: from, info: { ip: ws.data.ip, ua: ws.data.ua } });
          event("viewer", `視聴端末 ${from} がつなぎ直しを求めました`, { reason: msg.reason });
        }
      }
    },
    close(ws) {
      if (ws.data.role === "sender") {
        if (ws !== sender) return;
        sender = null;
        for (const v of viewers.values()) send(v, { type: "sender-offline" });
        log(`配信ページが閉じられました`);
        event("sender", "配信ページが閉じられました");
      } else {
        viewers.delete(ws.data.id);
        send(sender, { type: "viewer-leave", id: ws.data.id });
        log(`視聴端末が切断しました 計${viewers.size}台`);
        event("viewer", `視聴端末 ${ws.data.id} が切断しました`);
      }
    },
  },
};

// ポートを指定されなかったときは、ほかのソフトが使っていたら次の番号を試す
const firstPort = Number(portArg ?? 47800);
const tries = portArg ? 1 : 20;
let server!: ReturnType<typeof Bun.serve<Peer>>;
for (let i = 0; i < tries; i++) {
  try {
    server = Bun.serve<Peer>({ ...handlers, port: firstPort + i } as any);
    break;
  } catch (e: any) {
    if (e?.code !== "EADDRINUSE") fatal(e?.message ?? String(e));
    if (i === tries - 1) {
      fatal(portArg
        ? `ポート ${firstPort} はほかのソフトが使っています。別の番号を指定してください（例: vanish.exe 9000）`
        : `ポート ${firstPort}〜${firstPort + tries - 1} がすべて使われています。vanish.exe 9000 のように番号を指定してください`);
    }
  }
}

function log(s: string) {
  const t = new Date().toLocaleTimeString("ja-JP", { hour12: false });
  console.log(`[${t}] ${s}`);
}

const sendUrl = `http://localhost:${server.port}/send`;
console.log(`\n配信ページ（このPCのChrome/Edgeで開く）: ${sendUrl}`);
const urls = viewerUrls();
if (urls.length === 0) console.log("LANのIPアドレスが見つかりませんでした");
for (const u of urls) console.log(`視聴ページ（スマホ・タブレットで開く）: ${u}`);
if (urls[0]) console.log(await QRCode.toString(urls[0], { type: "terminal", small: true }));
if (devMode) console.log(`開発用モード: オン（状態は http://localhost:${server.port}/api/debug ）`);
console.log("止めるときはこのウィンドウで Ctrl+C\n");

if (AUTO_OPEN && process.platform === "win32") {
  Bun.spawn(["cmd", "/c", "start", "", sendUrl], { stdout: "ignore", stderr: "ignore" });
}
