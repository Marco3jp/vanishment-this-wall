import type { ReactNode } from "react";
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  ACCENT, Browser, Cursor, Demo, Em, FONT, MONO, PH_H, PH_W, PHONE_OUTER_H, PHONE_OUTER_W, Phone, PlayerPage, SendPage, SoundWaves, Tap, Telop,
  VIDEO_TAB, VIDEO_URL, Viewer, ease, inPhone, inWin, qrSrc, sendLayout, shownUrl, useFade, type PhonePos, type Win,
} from "./parts";

const SEND_URL = "localhost:47800/send";
const SEND_TABS = [{ title: VIDEO_TAB }, { title: "画面配信", active: true }];
const center = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

const Scene = ({ duration, children }: { duration: number; children: ReactNode }) => {
  const opacity = useFade(duration, 8);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const lerpWin = (f: number, range: [number, number], a: Win, b: Win): Win => ({
  x: ease(f, range, [a.x, b.x]), y: ease(f, range, [a.y, b.y]), scale: ease(f, range, [a.scale, b.scale]),
});

// ---- 1. つかみ ----
export const HOOK = 150;
export const Hook = () => {
  const f = useCurrentFrame();
  const win = lerpWin(f, [45, 80], { x: 352, y: 50, scale: 0.95 }, { x: 110, y: 120, scale: 0.72 });
  const phone: PhonePos = { x: ease(f, [55, 90], [2000, 1330]), y: 60, scale: 0.86 };
  const line = ease(f, [85, 110], [0, 1]);
  return (
    <Scene duration={HOOK}>
      <Browser win={win} tabs={[{ title: VIDEO_TAB, active: true, sharing: f > 80 }, { title: "画面配信" }]} url={VIDEO_URL}>
        <PlayerPage />
      </Browser>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: line }}>
        <path d="M1050 420 Q1190 330 1320 420" fill="none" stroke={ACCENT} strokeWidth={6} strokeDasharray="14 14" strokeDashoffset={-f * 2} strokeLinecap="round" />
      </svg>
      <Phone pos={phone}>
        <Viewer />
      </Phone>
      <div style={{ position: "absolute", left: 48, top: 36, fontFamily: MONO, fontSize: 28, color: "#e2e8f0", opacity: ease(f, [0, 15], [0, 1]) }}>vanishment-this-wall</div>
      <Telop delay={10} sub="PCの前を離れても、続きをそのまま">
        PCで見ている動画を、<Em>布団の中のスマホで</Em>
      </Telop>
    </Scene>
  );
};

// ---- 2. ダウンロードと起動 ----
export const INSTALL = 120;
const ReleaseCard = () => (
  <div style={{ position: "absolute", left: 460, top: 170, width: 1000, background: "#1d2026", borderRadius: 18, padding: "36px 44px", fontFamily: FONT, color: "#e8eaee", boxShadow: "0 40px 120px rgba(0,0,0,.5), 0 0 0 1px #2d3139" }}>
    <div style={{ fontSize: 22, color: "#9aa1ad" }}>Releases</div>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6 }}>
      <div style={{ fontSize: 36, fontWeight: 800 }}>build-20261116-093012</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#15803d", border: "2px solid #22c55e", borderRadius: 999, padding: "2px 14px" }}>Latest</div>
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 28 }}>Assets</div>
    {["vanish.exe", "vanish-linux-x64.tar.gz", "Source code (zip)"].map((name, i) => (
      <div key={name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", marginTop: i ? 0 : 10, borderTop: "1px solid #2d3139", fontSize: 24, color: i === 0 ? "#60a5fa" : "#c4c9d2", fontWeight: i === 0 ? 700 : 400 }}>
        <span style={{ width: 22, height: 26, borderRadius: 4, border: "2px solid currentColor", display: "inline-block" }} />
        {name}
      </div>
    ))}
  </div>
);

const AppIcon = ({ size }: { size: number }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.22, background: "linear-gradient(135deg, #2563eb, #7c3aed)", position: "relative", boxShadow: "0 20px 60px rgba(37,99,235,.45)" }}>
    <div style={{ position: "absolute", left: size * 0.16, top: size * 0.26, width: size * 0.5, height: size * 0.34, borderRadius: size * 0.05, border: `${size * 0.05}px solid #fff` }} />
    <div style={{ position: "absolute", left: size * 0.6, top: size * 0.4, width: size * 0.22, height: size * 0.38, borderRadius: size * 0.05, background: "#fff" }} />
  </div>
);

export const Install = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cut = (a: number, b: number) => ease(f, [a, a + 4], [0, 1]) * (b ? ease(f, [b - 4, b], [1, 0]) : 1);
  const pop = spring({ frame: f - 80, fps, config: { damping: 18 } });
  return (
    <Scene duration={INSTALL}>
      <AbsoluteFill style={{ opacity: cut(0, 40) }}>
        <ReleaseCard />
        <div style={{ position: "absolute", right: 80, top: 60, padding: "14px 24px", borderRadius: 14, background: "#1d2026", fontFamily: FONT, fontSize: 24, color: "#e8eaee", opacity: ease(f, [27, 31], [0, 1]), boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
          ⬇ vanish.exe
        </div>
        <Cursor keys={[{ f: 0, x: 1300, y: 820 }, { f: 22, x: 640, y: 402 }]} clicks={[24]} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: cut(40, 80) }}>
        <div style={{ position: "absolute", left: 880, top: 300, display: "grid", justifyItems: "center", gap: 18, fontFamily: FONT, color: "#fff", fontSize: 28 }}>
          <div style={{ transform: `scale(${f > 62 ? ease(f, [62, 72], [1.08, 1]) : 1})` }}>
            <AppIcon size={160} />
          </div>
          <div style={{ padding: "2px 12px", borderRadius: 6, background: f > 50 ? "rgba(96,165,250,.35)" : "transparent" }}>vanish.exe</div>
        </div>
        <Cursor keys={[{ f: 40, x: 1200, y: 760 }, { f: 52, x: 980, y: 400 }]} clicks={[56, 61]} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: cut(80, 0) }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${0.9 + pop * 0.1})`, transformOrigin: "50% 45%" }}>
          <Browser win={{ x: 352, y: 50, scale: 0.95 }} tabs={[{ title: "画面配信", active: true }]} url={SEND_URL}>
            <SendPage name="send_idle" />
          </Browser>
        </div>
      </AbsoluteFill>
      <Telop delay={4}>ダウンロードして、<Em>ダブルクリック</Em>するだけ</Telop>
    </Scene>
  );
};

// ---- 3. 共有するものを選ぶ ----
export const SHARE = 180;
const MODAL = { x: 550, y: 160, w: 820, h: 600 };

const Thumb = ({ kind }: { kind: "video" | "mail" | "doc" }) =>
  kind === "video" ? (
    <Demo width={240} />
  ) : (
    <div style={{ width: 240, height: 135, background: "#25282e", padding: 14, display: "grid", gap: 8, alignContent: "start" }}>
      {[0.9, 0.7, 0.8, 0.5, 0.75].map((w, i) => <div key={i} style={{ height: 10, width: `${w * 100}%`, borderRadius: 5, background: kind === "mail" && i === 0 ? "#60a5fa" : "#3a3f48" }} />)}
    </div>
  );

const Picker = ({ f }: { f: number }) => {
  const picked = f >= 70;
  const audio = f >= 98;
  const cards: { kind: "video" | "mail" | "doc"; title: string }[] = [
    { kind: "video", title: VIDEO_TAB }, { kind: "mail", title: "メール" }, { kind: "doc", title: "ドキュメント" },
  ];
  return (
    <div style={{ position: "absolute", left: MODAL.x, top: MODAL.y, width: MODAL.w, height: MODAL.h, background: "#1d2026", borderRadius: 18, fontFamily: FONT, color: "#e8eaee", boxShadow: "0 40px 140px rgba(0,0,0,.6), 0 0 0 1px #2d3139" }}>
      <div style={{ position: "absolute", left: 32, top: 26, fontSize: 28, fontWeight: 700 }}>共有するものを選んでください</div>
      <div style={{ position: "absolute", left: 32, top: 84, display: "flex", gap: 28, fontSize: 20, color: "#9aa1ad" }}>
        {["Chrome のタブ", "ウィンドウ", "画面全体"].map((t, i) => (
          <div key={t} style={{ paddingBottom: 8, borderBottom: i === 0 ? `3px solid #60a5fa` : "3px solid transparent", color: i === 0 ? "#60a5fa" : undefined, fontWeight: i === 0 ? 700 : 400 }}>{t}</div>
        ))}
      </div>
      {cards.map((c, i) => (
        <div key={c.title} style={{ position: "absolute", left: 32 + i * 258, top: 150, width: 240, borderRadius: 10, overflow: "hidden", outline: picked && i === 0 ? "4px solid #60a5fa" : "1px solid #2d3139", outlineOffset: picked && i === 0 ? 2 : 0 }}>
          <Thumb kind={c.kind} />
          <div style={{ padding: "8px 10px", fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: "#25282e" }}>{c.title}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 32, right: 32, top: 390, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0", borderTop: "1px solid #2d3139", borderBottom: "1px solid #2d3139", fontSize: 22 }}>
        <span>タブの音声も共有する</span>
        <div style={{ width: 64, height: 36, borderRadius: 18, background: audio ? "#2563eb" : "#3a3f48", position: "relative" }}>
          <div style={{ position: "absolute", top: 4, left: audio ? 32 : 4, width: 28, height: 28, borderRadius: 14, background: "#fff" }} />
        </div>
      </div>
      <div style={{ position: "absolute", right: 32, bottom: 28, display: "flex", gap: 14, fontSize: 20 }}>
        <div style={{ padding: "12px 26px", borderRadius: 10, border: "1px solid #3a3f48", color: "#c4c9d2" }}>キャンセル</div>
        <div style={{ padding: "12px 34px", borderRadius: 10, background: picked ? "#2563eb" : "#1e3a8a", color: "#fff", fontWeight: 700 }}>共有</div>
      </div>
    </div>
  );
};

export const Share = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const win: Win = { x: 352, y: 40, scale: 0.95 };
  const start = inWin(win, center(sendLayout.send_idle.start).x, center(sendLayout.send_idle.start).y);
  const modalIn = spring({ frame: f - 38, fps, config: { damping: 200 } }) * ease(f, [130, 138], [1, 0]);
  const live = f >= 138;
  const scroll = ease(f, [146, 172], [0, 260]);
  return (
    <Scene duration={SHARE}>
      <Browser win={win} tabs={SEND_TABS} url={SEND_URL}>
        <SendPage name={live ? "send_live" : "send_idle"} live={live} scrollY={live ? scroll : 0} />
      </Browser>
      <AbsoluteFill style={{ background: "rgba(0,0,0,.4)", opacity: modalIn }} />
      <div style={{ opacity: modalIn, transform: `translateY(${(1 - modalIn) * 30}px)` }}>
        <Picker f={f} />
      </div>
      <Cursor
        keys={[
          { f: 0, x: 1100, y: 820 }, { f: 28, x: start.x, y: start.y }, { f: 50, x: start.x + 20, y: start.y + 20 },
          { f: 68, x: MODAL.x + 152, y: MODAL.y + 220 }, { f: 80, x: MODAL.x + 152, y: MODAL.y + 220 },
          { f: 96, x: MODAL.x + MODAL.w - 64, y: MODAL.y + 430 }, { f: 106, x: MODAL.x + MODAL.w - 64, y: MODAL.y + 430 },
          { f: 124, x: MODAL.x + MODAL.w - 82, y: MODAL.y + MODAL.h - 50 }, { f: 140, x: MODAL.x + MODAL.w - 82, y: MODAL.y + MODAL.h - 50 },
          { f: 165, x: 1500, y: 900 },
        ]}
        clicks={[30, 70, 98, 126]}
      />
      <Telop delay={6}>共有するタブを選んで、<Em>音声もオン</Em></Telop>
    </Scene>
  );
};

// ---- 4. QR を読む ----
export const QR = 190;
const CameraView = ({ f }: { f: number }) => {
  const found = ease(f, [58, 66], [0, 1]);
  const chip = ease(f, [66, 74], [0, 1]);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #3f3f46 0%, #18181b 75%)" }}>
      <div style={{ position: "absolute", left: 66, top: 280, width: 280, height: 280, background: "#fff", padding: 14, borderRadius: 8, transform: "rotate(-5deg) skewX(-3deg)", boxShadow: "0 20px 40px rgba(0,0,0,.5)" }}>
        <Img src={qrSrc} style={{ width: "100%", height: "100%" }} />
      </div>
      <svg width={PH_W} height={PH_H} style={{ position: "absolute", inset: 0, opacity: found }}>
        {[[50, 262, 1, 1], [362, 262, -1, 1], [50, 580, 1, -1], [362, 580, -1, -1]].map(([x, y, sx, sy], i) => (
          <path key={i} d={`M${x} ${y + sy * 44} L${x} ${y} L${x + sx * 44} ${y}`} fill="none" stroke="#facc15" strokeWidth={7} strokeLinecap="round" transform={`translate(${(1 - found) * -sx * 20} ${(1 - found) * -sy * 20})`} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 40, right: 40, top: 680, padding: "14px 18px", borderRadius: 16, background: "rgba(255,255,255,.95)", fontFamily: FONT, fontSize: 19, color: "#0f172a", opacity: chip, transform: `translateY(${(1 - chip) * 20}px)` }}>
        <div style={{ fontSize: 14, color: "#64748b" }}>QRコード</div>
        {shownUrl.replace(/\/$/, "")} を開く
      </div>
      <div style={{ position: "absolute", left: PH_W / 2 - 38, top: 815, width: 76, height: 76, borderRadius: 38, border: "6px solid #fff" }} />
    </AbsoluteFill>
  );
};

export const Qr = () => {
  const f = useCurrentFrame();
  const live = sendLayout.send_live;
  const qc = center(live.qr);
  const zoomed: Win = { x: 600 - qc.x * 1.5, y: 460 - (76 + qc.y) * 1.5, scale: 1.5 };
  const win = lerpWin(f, [0, 32], { x: 352, y: 40, scale: 0.95 }, zoomed);
  const phone: PhonePos = { x: 1230, y: ease(f, [26, 52], [1200, 70]), scale: 0.86 };
  const chipTap = inPhone(phone, 206, 720);
  const unmute = inPhone(phone, 206, 457);
  const stage = f < 98 ? "camera" : f < 116 ? "connecting" : f < 150 ? "unmute" : "playing";
  return (
    <Scene duration={QR}>
      <div style={{ opacity: ease(f, [40, 60], [1, 0.55]) }}>
        <Browser win={win} tabs={SEND_TABS} url={SEND_URL}>
          <SendPage name="send_live" live />
        </Browser>
      </div>
      <Phone pos={phone}>
        {stage === "camera" && <CameraView f={f} />}
        {stage === "connecting" && (
          <AbsoluteFill style={{ background: "#000", color: "#aaa", fontFamily: FONT, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>つないでいます…</AbsoluteFill>
        )}
        {stage === "unmute" && <Viewer overlay="phone_unmute" />}
        {stage === "playing" && <Viewer overlay="phone_bar" overlayOpacity={ease(f, [170, 180], [1, 0])} />}
      </Phone>
      <Tap at={92} x={chipTap.x} y={chipTap.y} />
      <Tap at={146} x={unmute.x} y={unmute.y} />
      {f > 152 && <SoundWaves x={phone.x + PHONE_OUTER_W * phone.scale + 10} y={phone.y + (PHONE_OUTER_H * phone.scale) / 2} />}
      <Telop delay={6} sub="視聴側はブラウザだけ。アプリのインストールは要りません">
        スマホのカメラで<Em>QRを読むだけ</Em>
      </Telop>
    </Scene>
  );
};

// ---- 5. PC とスマホで同じ映像と音 ----
export const BOTH = 160;
export const Both = () => {
  const phone: PhonePos = { x: 1250, y: 60, scale: 0.86 };
  return (
    <Scene duration={BOTH}>
      <Browser win={{ x: 90, y: 130, scale: 0.72 }} tabs={[{ title: VIDEO_TAB, active: true, sharing: true }, { title: "画面配信" }]} url={VIDEO_URL}>
        <PlayerPage />
      </Browser>
      <Phone pos={phone}>
        <Viewer />
      </Phone>
      <SoundWaves x={phone.x + PHONE_OUTER_W * phone.scale + 10} y={phone.y + (PHONE_OUTER_H * phone.scale) / 2} />
      <Telop delay={6} sub="同じWi-Fiの中で、PCからスマホへ直接送ります">
        映像も音も、<Em>手元のスマホで</Em>
      </Telop>
    </Scene>
  );
};

// ---- 6. 音のタイミング ----
export const DELAY = 150;
const DelayChart = ({ ms }: { ms: number }) => {
  const px = ms * 2.2;
  const track = (label: string, color: string, offset: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 24, height: 90 }}>
      <div style={{ width: 70, fontSize: 28, color: "#e2e8f0" }}>{label}</div>
      <div style={{ position: "relative", width: 560, height: 56, borderRadius: 10, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
        {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: "absolute", left: 30 + i * 150 + offset, top: 8, width: 90, height: 40, borderRadius: 8, background: color }} />)}
      </div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 980, top: 250, fontFamily: FONT }}>
      <div style={{ fontSize: 26, color: "#94a3b8" }}>音の遅れ</div>
      <div style={{ fontSize: 88, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>+{Math.round(ms)}ms</div>
      <div style={{ marginTop: 20, display: "grid", gap: 6 }}>
        {track("映像", "#60a5fa", 0)}
        {track("音", "#f472b6", px)}
      </div>
    </div>
  );
};

export const Delay = () => {
  const f = useCurrentFrame();
  const phone: PhonePos = { x: 470, y: 60, scale: 0.86 };
  const steps = [38, 58, 78, 98];
  const n = steps.filter((s) => f >= s).length;
  const overlay = (["phone_delay_0", "phone_delay_30", "phone_delay_60", "phone_delay_90", "phone_delay_120"] as const)[n];
  const plus = inPhone(phone, 357, 735);
  return (
    <Scene duration={DELAY}>
      <Phone pos={phone}>
        <Viewer overlay={overlay} />
      </Phone>
      {steps.map((s) => <Tap key={s} at={s} x={plus.x} y={plus.y} />)}
      <DelayChart ms={n * 30} />
      <Telop delay={6} sub="値は端末ごとに残ります">
        音と映像のずれを、<Em>10msずつ</Em>調整
      </Telop>
    </Scene>
  );
};

// ---- 7. 全画面で横向き ----
export const FULLSCREEN = 150;
export const Fullscreen = () => {
  const f = useCurrentFrame();
  const scale = 0.86;
  const portrait: PhonePos = { x: 960 - (PHONE_OUTER_W * scale) / 2, y: 60, scale };
  const fsBtn = inPhone(portrait, 358, 881);
  const cx = 960;
  const cy = 60 + (PHONE_OUTER_H * scale) / 2;
  const turning = f >= 40 && f < 64;
  const rot = ease(f, [40, 64], [0, -90]);
  const grow = ease(f, [64, 86], [scale, 1.3]);
  return (
    <Scene duration={FULLSCREEN}>
      {f < 64 ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `rotate(${turning ? rot : 0}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
          <Phone pos={portrait}>
            <Viewer overlay={f < 40 ? "phone_bar" : undefined} />
          </Phone>
        </div>
      ) : (
        <Phone pos={{ x: cx - (PHONE_OUTER_H * grow) / 2, y: cy - (PHONE_OUTER_W * grow) / 2, scale: grow }} landscape>
          <Viewer landscape overlay="phone_land_bar" overlayOpacity={ease(f, [70, 78], [0, 1]) * ease(f, [118, 126], [1, 0])} />
        </Phone>
      )}
      <Tap at={28} x={fsBtn.x} y={fsBtn.y} />
      <Telop delay={6} sub="端末の向きを固定していても横になります">
        全画面にすると、<Em>横向きで大きく</Em>
      </Telop>
    </Scene>
  );
};

// ---- 8. PiP ----
export const PIP = 150;
// 遊んでいるスマホゲーム（色のブロックを3つそろえて消すパズル）
const TILE = 56;
const GAP = 8;
const BOARD = { x: 18, y: 250, cols: 6, rows: 7 };
const COLORS = ["#f472b6", "#60a5fa", "#facc15", "#4ade80", "#a78bfa"];
const CLEARS = [
  { at: 66, color: 0, cells: [[5, 0], [5, 1], [5, 2]] },
  { at: 96, color: 2, cells: [[2, 3], [2, 4], [2, 5]] },
  { at: 126, color: 3, cells: [[3, 1], [4, 1], [5, 1]] },
];
const tileCenter = (r: number, c: number) => ({ x: BOARD.x + c * (TILE + GAP) + TILE / 2, y: BOARD.y + r * (TILE + GAP) + TILE / 2 });

const Game = ({ f }: { f: number }) => {
  const cleared = CLEARS.filter((g) => f >= g.at).length;
  const score = 12360 + Math.round(CLEARS.reduce((n, g) => n + ease(f, [g.at, g.at + 12], [0, 120]), 0));
  const tiles = [];
  for (let r = 0; r < BOARD.rows; r++) {
    for (let c = 0; c < BOARD.cols; c++) {
      const group = CLEARS.find((g) => g.cells.some(([gr, gc]) => gr === r && gc === c));
      const color = group ? COLORS[group.color] : COLORS[(r * 7 + c * 3 + ((r * c) % 4)) % COLORS.length];
      let scale = 1;
      let drop = 0;
      if (group && f >= group.at) {
        scale = f < group.at + 8 ? ease(f, [group.at, group.at + 8], [1, 0]) : ease(f, [group.at + 8, group.at + 16], [0, 1]);
        drop = f < group.at + 8 ? 0 : ease(f, [group.at + 8, group.at + 16], [-40, 0]);
      }
      const after = group && f >= group.at + 8 ? COLORS[(group.color + 2) % COLORS.length] : color;
      tiles.push(
        <div key={`${r}-${c}`} style={{ position: "absolute", left: BOARD.x + c * (TILE + GAP), top: BOARD.y + r * (TILE + GAP) + drop, width: TILE, height: TILE, borderRadius: 14, background: after, boxShadow: "inset 0 -6px 0 rgba(0,0,0,.18), inset 0 4px 0 rgba(255,255,255,.35)", transform: `scale(${scale})` }} />,
      );
    }
  }
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #312e81 0%, #6d28d9 55%, #0e7490 100%)", fontFamily: FONT, color: "#fff" }}>
      <div style={{ position: "absolute", left: 22, top: 66, fontSize: 18, opacity: 0.85 }}>ステージ 24</div>
      <div style={{ position: "absolute", left: 22, top: 92, fontSize: 40, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{score.toLocaleString()}</div>
      <div style={{ position: "absolute", left: 22, top: 152, fontSize: 16, opacity: 0.85 }}>のこり {18 - cleared} 手</div>
      <div style={{ position: "absolute", left: BOARD.x - 8, top: BOARD.y - 8, width: BOARD.cols * (TILE + GAP) + 8, height: BOARD.rows * (TILE + GAP) + 8, borderRadius: 20, background: "rgba(0,0,0,.25)" }} />
      {tiles}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 40, display: "flex", justifyContent: "center", gap: 28 }}>
        {["#f59e0b", "#22d3ee", "#f43f5e"].map((c) => <div key={c} style={{ width: 64, height: 64, borderRadius: 32, background: c, boxShadow: "inset 0 -6px 0 rgba(0,0,0,.2)" }} />)}
      </div>
    </AbsoluteFill>
  );
};

export const Pip = () => {
  const f = useCurrentFrame();
  const scale = 0.86;
  const phone: PhonePos = { x: 960 - (PHONE_OUTER_W * scale) / 2, y: 60, scale };
  const pipBtn = inPhone(phone, 219, 881);
  const vh = (PH_W * 9) / 16;
  const k = ease(f, [32, 56], [0, 1]);
  const w = PH_W + (200 - PH_W) * k;
  const x = 0 + (PH_W - 16 - 200) * k;
  const y = ease(f, [32, 56], [(PH_H - vh) / 2, 600]) + ease(f, [92, 116], [0, -470]);
  return (
    <Scene duration={PIP}>
      <Phone pos={phone}>
        {f < 32 ? <Viewer overlay="phone_bar" /> : (
          <>
            <div style={{ position: "absolute", inset: 0, opacity: k }}><Game f={f} /></div>
            <div style={{ position: "absolute", left: x, top: y, borderRadius: 12 * k, overflow: "hidden", boxShadow: `0 12px 30px rgba(0,0,0,${0.45 * k})` }}>
              <Demo width={w} />
            </div>
          </>
        )}
      </Phone>
      <Tap at={24} x={pipBtn.x} y={pipBtn.y} />
      {CLEARS.map((g) => {
        const [r, c] = g.cells[1];
        const t = tileCenter(r, c);
        const at = inPhone(phone, t.x, t.y);
        return <Tap key={g.at} at={g.at - 2} x={at.x} y={at.y} />;
      })}
      <Telop delay={6} sub="動画を小さな画面で流したまま、スマホゲームも">
        <Em>PiP</Em>で、ゲームをしながら見られる
      </Telop>
    </Scene>
  );
};

// ---- 9. 開発用モード ----
export const DEBUG = 300;
export const Debug = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mag = spring({ frame: f - 70, fps, config: { damping: 200 } });
  const win: Win = { x: 70, y: 40, scale: 0.78 };
  const live = sendLayout.send_live;
  const dev = sendLayout.send_dev;
  const startScroll = live.height - 800;
  const on = f >= 32;
  const scroll = on ? ease(f, [60, 250], [startScroll, dev.height - 800]) : startScroll;
  const box = inWin(win, live.dev.x + 27, live.dev.y + 30, startScroll);
  const phone: PhonePos = { x: 1260, y: 60, scale: 0.86 };
  return (
    <Scene duration={DEBUG}>
      <Browser win={win} tabs={SEND_TABS} url={SEND_URL}>
        <SendPage name={on ? "send_dev" : "send_live"} live scrollY={scroll} />
      </Browser>
      <Cursor keys={[{ f: 0, x: 900, y: 900 }, { f: 26, x: box.x, y: box.y }, { f: 50, x: box.x, y: box.y }, { f: 80, x: 1150, y: 980 }]} clicks={[30]} />
      <Phone pos={phone}>
        <Viewer overlay="phone_dev" overlayOpacity={ease(f, [36, 46], [0, 1])} />
      </Phone>
      <div style={{ position: "absolute", left: 1090, top: 540, width: 534, height: 245, borderRadius: 16, overflow: "hidden", background: "#000", border: "2px solid rgba(255,255,255,.3)", boxShadow: "0 30px 80px rgba(0,0,0,.6)", opacity: mag, transform: `scale(${0.9 + 0.1 * mag})` }}>
        <Img src={staticFile("shots/phone_dev.png")} style={{ position: "absolute", left: -14, top: -14, width: PH_W * 1.75 }} />
      </div>
      <Telop delay={6} sub="圧縮・デコードの時間、受信バッファ、取りこぼし、出来事の記録">
        <Em>開発用モード</Em>で、送る側と受ける側の数字を確認
      </Telop>
    </Scene>
  );
};

// ---- 10. 締め ----
export const END = 190;
export const End = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: f - 4, fps, config: { damping: 200 } });
  const b = spring({ frame: f - 24, fps, config: { damping: 200 } });
  return (
    <Scene duration={END}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT, color: "#fff", textAlign: "center" }}>
        <div style={{ opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>
          <div style={{ fontFamily: MONO, fontSize: 92, fontWeight: 700, letterSpacing: -1 }}>vanishment-this-wall</div>
          <div style={{ fontSize: 40, color: "#cbd5e1", marginTop: 18 }}>PCの画面と音を、同じWi-Fiのスマホ・タブレットへ</div>
        </div>
        <div style={{ opacity: b, transform: `translateY(${(1 - b) * 30}px)`, marginTop: 70, display: "grid", gap: 16, justifyItems: "center" }}>
          <div style={{ fontFamily: MONO, fontSize: 36, padding: "16px 34px", borderRadius: 16, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)" }}>github.com/Marco3jp/vanishment-this-wall</div>
          <div style={{ fontSize: 28, color: "#94a3b8" }}>Releases から vanish.exe をダウンロード</div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};
