import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import shots from "./shots.json";

export const FONT = "PromoJP, sans-serif";
export const MONO = '"DejaVu Sans Mono", PromoJP, monospace';
export const ACCENT = "#60a5fa";

// 共有しているタブの映像は、場面をまたいでも続きが流れるように動画全体のフレームで動かす
export const GlobalFrame = createContext(0);

export function ease(frame: number, range: [number, number], out: [number, number], easing = Easing.inOut(Easing.cubic)) {
  return interpolate(frame, range, out, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

export function useFade(duration: number, edge = 10) {
  const f = useCurrentFrame();
  return interpolate(f, [0, edge, duration - edge, duration], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

export const Background = () => {
  const f = useCurrentFrame();
  const blob = (x: number, y: number, r: number, color: string, phase: number): CSSProperties => ({
    position: "absolute",
    left: x + Math.sin(f / 90 + phase) * 60,
    top: y + Math.cos(f / 110 + phase) * 40,
    width: r,
    height: r,
    borderRadius: "50%",
    background: color,
    filter: "blur(120px)",
    opacity: 0.55,
  });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #0b1020 0%, #111a33 55%, #0d1326 100%)", overflow: "hidden" }}>
      <div style={blob(-200, -150, 700, "#1d4ed8", 0)} />
      <div style={blob(1300, 500, 800, "#7c3aed", 2)} />
      <div style={blob(700, 700, 500, "#0ea5e9", 4)} />
    </AbsoluteFill>
  );
};

export const Telop = ({ children, sub, delay = 6 }: { children: ReactNode; sub?: ReactNode; delay?: number }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 200 } });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, textAlign: "center", fontFamily: FONT, opacity: s, transform: `translateY(${(1 - s) * 24}px)` }}>
      <div style={{ display: "inline-block", padding: "14px 40px", borderRadius: 20, background: "rgba(8,12,24,.72)", backdropFilter: "blur(8px)" }}>
        <div style={{ color: "#fff", fontSize: 54, fontWeight: 800, letterSpacing: 1 }}>{children}</div>
        {sub && <div style={{ color: "#cbd5e1", fontSize: 28, fontWeight: 500, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
};

export const Em = ({ children }: { children: ReactNode }) => <span style={{ color: ACCENT }}>{children}</span>;

// ---- 共有しているタブの中身（動画サイトで再生中の映像という想定） ----

const DEMO_W = 1600;
const DEMO_H = 900;

export const Demo = ({ width, style }: { width: number; style?: CSSProperties }) => {
  const g = useContext(GlobalFrame);
  const t = g / 30;
  const scale = width / DEMO_W;
  const far = ((t * 14) % 800) - 800;
  const near = ((t * 30) % 1000) - 1000;
  const boatX = 200 + ((t * 40) % 1500);
  const elapsed = 754 + Math.floor(t);
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <div style={{ width, height: width * (DEMO_H / DEMO_W), overflow: "hidden", position: "relative", ...style }}>
      <div style={{ width: DEMO_W, height: DEMO_H, transform: `scale(${scale})`, transformOrigin: "0 0", position: "absolute" }}>
        <svg width={DEMO_W} height={DEMO_H} viewBox={`0 0 ${DEMO_W} ${DEMO_H}`}>
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1e1b4b" />
              <stop offset="0.45" stopColor="#7c3aed" />
              <stop offset="0.75" stopColor="#f97316" />
              <stop offset="1" stopColor="#fde68a" />
            </linearGradient>
            <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f59e0b" />
              <stop offset="0.25" stopColor="#7c2d12" />
              <stop offset="1" stopColor="#1e1b4b" />
            </linearGradient>
            <radialGradient id="sun">
              <stop offset="0" stopColor="#fff7ed" />
              <stop offset="0.5" stopColor="#fdba74" />
              <stop offset="1" stopColor="#fdba74" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={DEMO_W} height={600} fill="url(#sky)" />
          <circle cx={1060} cy={560 + Math.sin(t / 3) * 6} r={210} fill="url(#sun)" />
          <circle cx={1060} cy={560 + Math.sin(t / 3) * 6} r={78} fill="#fff7ed" />
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx={((t * (18 + i * 6) + i * 520) % 1900) - 150} cy={150 + i * 70} rx={160 - i * 20} ry={26} fill="#fff" opacity={0.18} />
          ))}
          <g transform={`translate(${far} 0)`}>
            {[0, 800, 1600].map((dx) => (
              <path key={dx} d={`M${dx} 600 L${dx + 140} 470 L${dx + 260} 540 L${dx + 420} 420 L${dx + 600} 560 L${dx + 800} 600 Z`} fill="#4c1d95" opacity={0.8} />
            ))}
          </g>
          <g transform={`translate(${near} 0)`}>
            {[0, 1000, 2000].map((dx) => (
              <path key={dx} d={`M${dx} 600 Q${dx + 250} 520 ${dx + 500} 585 T${dx + 1000} 600 Z`} fill="#2e1065" />
            ))}
          </g>
          <rect y={600} width={DEMO_W} height={300} fill="url(#sea)" />
          {Array.from({ length: 14 }, (_, i) => {
            const y = 620 + i * 20;
            const w = 120 + Math.sin(t * 2 + i) * 60 + i * 14;
            return <rect key={i} x={1060 - w / 2 + Math.sin(t + i * 1.7) * 20} y={y} width={w} height={4} rx={2} fill="#fde68a" opacity={0.6 - i * 0.035} />;
          })}
          <g transform={`translate(${boatX} ${592 + Math.sin(t * 2) * 4})`}>
            <path d="M-50 0 L50 0 L36 16 L-36 16 Z" fill="#111827" />
            <path d="M0 -4 L0 -86 L44 -8 Z" fill="#111827" />
          </g>
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120, background: "linear-gradient(transparent, rgba(0,0,0,.55))" }} />
        <div style={{ position: "absolute", left: 48, right: 48, bottom: 64, height: 8, borderRadius: 4, background: "rgba(255,255,255,.3)" }}>
          <div style={{ width: `${(elapsed / 1450) * 100}%`, height: "100%", borderRadius: 4, background: "#ef4444" }} />
        </div>
        <div style={{ position: "absolute", left: 48, bottom: 18, color: "#fff", fontFamily: FONT, fontSize: 28 }}>
          ▶&nbsp;&nbsp;{mmss(elapsed)} / {mmss(1450)}
        </div>
      </div>
    </div>
  );
};

// ---- PC のブラウザ ----

export const CHROME_H = 76;
export const WIN_W = 1280;
export const WIN_H = 800;

export type Tab = { title: string; active?: boolean; sharing?: boolean };

export type Win = { x: number; y: number; scale: number };

/** ブラウザの中の CSS 座標を、画面（1920×1080）の座標に直す */
export const inWin = (w: Win, cssX: number, cssY: number, scrollY = 0) => ({ x: w.x + cssX * w.scale, y: w.y + (CHROME_H + cssY - scrollY) * w.scale });

export const Browser = ({ win, tabs, url, children, style }: { win: Win; tabs: Tab[]; url: string; children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      position: "absolute", left: win.x, top: win.y, width: WIN_W, height: CHROME_H + WIN_H, transform: `scale(${win.scale})`, transformOrigin: "0 0",
      borderRadius: 14, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.12)", background: "#14161a", fontFamily: FONT, ...style,
    }}
  >
    <div style={{ height: 40, background: "#0e1013", display: "flex", alignItems: "flex-end", padding: "0 12px", gap: 4 }}>
      <div style={{ display: "flex", gap: 8, alignSelf: "center", marginRight: 12 }}>
        {["#ef4444", "#f59e0b", "#22c55e"].map((c) => <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
      </div>
      {tabs.map((t) => (
        <div key={t.title} style={{ height: 32, width: 230, padding: "0 14px", display: "flex", alignItems: "center", gap: 8, borderRadius: "10px 10px 0 0", background: t.active ? "#25282e" : "transparent", color: t.active ? "#e8eaee" : "#9aa1ad", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden" }}>
          {t.sharing && <span style={{ width: 10, height: 10, borderRadius: 5, background: "#2563eb", flex: "none" }} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
        </div>
      ))}
    </div>
    <div style={{ height: 36, background: "#25282e", display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid #2d3139" }}>
      <div style={{ flex: 1, height: 26, borderRadius: 13, background: "#14161a", color: "#c4c9d2", fontSize: 14, display: "flex", alignItems: "center", padding: "0 14px" }}>{url}</div>
    </div>
    <div style={{ width: WIN_W, height: WIN_H, overflow: "hidden", position: "relative" }}>{children}</div>
  </div>
);

export const VIDEO_TAB = "夕暮れの海辺を歩く - 動画";
export const VIDEO_URL = "video.example/watch?v=sunset";

export const PlayerPage = () => (
  <div style={{ width: WIN_W, height: WIN_H, background: "#0f0f0f", fontFamily: FONT }}>
    <Demo width={WIN_W} />
    <div style={{ padding: "14px 24px", color: "#fff", fontSize: 24, fontWeight: 700 }}>夕暮れの海辺を歩く</div>
  </div>
);

type ShotName = "send_idle" | "send_live" | "send_dev";
type Rect = { x: number; y: number; w: number; h: number };
export const sendLayout = shots.sender as unknown as Record<ShotName, { height: number; start: Rect; qr: Rect; preview: Rect; dev: Rect }>;

/** 配信ページのスクリーンショット。「送っている映像」の枠には共有中のタブの映像を敷く */
export const SendPage = ({ name, scrollY = 0, live = false }: { name: ShotName; scrollY?: number; live?: boolean }) => {
  const p = sendLayout[name].preview;
  const vw = (p.h * 16) / 9;
  return (
    <div style={{ position: "absolute", left: 0, top: -scrollY, width: WIN_W }}>
      <Img src={staticFile(`shots/${name}.png`)} style={{ width: WIN_W, display: "block" }} />
      <div style={{ position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h, background: "#000", borderRadius: 8, overflow: "hidden" }}>
        {live && <Demo width={vw} style={{ position: "absolute", left: (p.w - vw) / 2, top: 0 }} />}
      </div>
    </div>
  );
};

// ---- スマホ ----

export const PH_W = 412;
export const PH_H = 915;
const BEZEL = 14;
export const PHONE_OUTER_W = PH_W + BEZEL * 2;
export const PHONE_OUTER_H = PH_H + BEZEL * 2;

export type PhonePos = { x: number; y: number; scale: number };

/** スマホの画面の CSS 座標を、画面（1920×1080）の座標に直す（縦向き） */
export const inPhone = (p: PhonePos, cssX: number, cssY: number) => ({ x: p.x + (BEZEL + cssX) * p.scale, y: p.y + (BEZEL + cssY) * p.scale });

export const Phone = ({ pos, landscape = false, children, style }: { pos: PhonePos; landscape?: boolean; children: ReactNode; style?: CSSProperties }) => {
  const w = landscape ? PH_H : PH_W;
  const h = landscape ? PH_W : PH_H;
  return (
    <div
      style={{
        position: "absolute", left: pos.x, top: pos.y, width: w + BEZEL * 2, height: h + BEZEL * 2, transform: `scale(${pos.scale})`, transformOrigin: "0 0",
        borderRadius: 58, background: "#0a0a0a", boxShadow: "0 40px 120px rgba(0,0,0,.6), inset 0 0 0 2px #2a2a2a, 0 0 0 1px rgba(255,255,255,.1)", padding: BEZEL, ...style,
      }}
    >
      <div style={{ width: w, height: h, borderRadius: 46, overflow: "hidden", position: "relative", background: "#000" }}>
        {children}
        <div style={{ position: "absolute", width: 14, height: 14, borderRadius: 7, background: "#050505", boxShadow: "0 0 0 2px #111", ...(landscape ? { left: 14, top: h / 2 - 7 } : { top: 14, left: w / 2 - 7 }) }} />
      </div>
    </div>
  );
};

type PhoneShot = "phone_unmute" | "phone_bar" | "phone_delay_0" | "phone_delay_30" | "phone_delay_60" | "phone_delay_90" | "phone_delay_120" | "phone_rotate" | "phone_dev" | "phone_land_bar";

/** 視聴ページ。映像を下に敷き、透明にして撮った操作バーなどを上に重ねる */
export const Viewer = ({ overlay, landscape = false, overlayOpacity = 1 }: { overlay?: PhoneShot; landscape?: boolean; overlayOpacity?: number }) => {
  const w = landscape ? PH_H : PH_W;
  const h = landscape ? PH_W : PH_H;
  const vw = Math.min(w, (h * 16) / 9);
  const vh = (vw * 9) / 16;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Demo width={vw} style={{ position: "absolute", left: (w - vw) / 2, top: (h - vh) / 2 }} />
      {overlay && <Img src={staticFile(`shots/${overlay}.png`)} style={{ position: "absolute", inset: 0, width: w, height: h, opacity: overlayOpacity }} />}
    </AbsoluteFill>
  );
};

// ---- カーソルとタップ ----

export type Key = { f: number; x: number; y: number };

export const Cursor = ({ keys, clicks = [] }: { keys: Key[]; clicks?: number[] }) => {
  const f = useCurrentFrame();
  let x = keys[0].x;
  let y = keys[0].y;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (f >= a.f) {
      x = ease(f, [a.f, b.f], [a.x, b.x]);
      y = ease(f, [a.f, b.f], [a.y, b.y]);
    }
  }
  const press = clicks.some((c) => f >= c && f < c + 5);
  return (
    <>
      {clicks.map((c) => <Ripple key={c} at={c} x={x} y={y} color="rgba(96,165,250,.9)" />)}
      <svg width={44} height={44} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 6, top: y - 3, transform: `scale(${press ? 0.85 : 1})`, filter: "drop-shadow(0 4px 8px rgba(0,0,0,.45))" }}>
        <path d="M4 2 L4 19 L8.5 14.8 L11.5 21.5 L14.2 20.3 L11.2 13.7 L17.5 13.7 Z" fill="#fff" stroke="#111" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </>
  );
};

export const Ripple = ({ at, x, y, color = "rgba(255,255,255,.85)" }: { at: number; x: number; y: number; color?: string }) => {
  const f = useCurrentFrame();
  if (f < at || f > at + 18) return null;
  const k = (f - at) / 18;
  const r = 14 + k * 46;
  return <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `4px solid ${color}`, opacity: 1 - k }} />;
};

/** スマホの画面をタップした跡 */
export const Tap = ({ at, x, y }: { at: number; x: number; y: number }) => {
  const f = useCurrentFrame();
  if (f < at - 6 || f > at + 18) return null;
  const dot = f < at + 4 ? 1 : ease(f, [at + 4, at + 12], [1, 0]);
  return (
    <>
      <div style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22, background: "rgba(255,255,255,.55)", border: "2px solid rgba(255,255,255,.9)", opacity: dot * ease(f, [at - 6, at], [0, 1]) }} />
      <Ripple at={at} x={x} y={y} />
    </>
  );
};

export const SoundWaves = ({ x, y, size = 1 }: { x: number; y: number; size?: number }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${size})`, transformOrigin: "0 50%" }}>
      {[0, 1, 2].map((i) => {
        const k = ((f + i * 12) % 36) / 36;
        return (
          <svg key={i} width={120} height={160} viewBox="0 0 120 160" style={{ position: "absolute", left: 0, top: -80, opacity: 1 - k, transform: `translateX(${k * 50}px)` }}>
            <path d="M20 30 Q60 80 20 130" fill="none" stroke={ACCENT} strokeWidth={8} strokeLinecap="round" />
          </svg>
        );
      })}
      {[0, 1].map((i) => {
        const k = ((f + i * 22) % 45) / 45;
        return <div key={`n${i}`} style={{ position: "absolute", left: 60 + i * 40, top: -60 - k * 80, fontSize: 44, color: "#fff", opacity: Math.sin(k * Math.PI), fontFamily: FONT }}>♪</div>;
      })}
    </div>
  );
};

export const qrSrc = staticFile("shots/qr.svg");
export const shownUrl = shots.url;
