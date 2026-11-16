import { AbsoluteFill, Composition, Sequence, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { Background, GlobalFrame } from "./parts";
import { BOTH, Both, DEBUG, DELAY, Debug, Delay, END, End, FULLSCREEN, Fullscreen, HOOK, Hook, INSTALL, Install, PIP, Pip, QR, Qr, SHARE, Share } from "./scenes";

const font = new FontFace("PromoJP", `url(${staticFile("fonts/NotoSansJP.ttf")})`, { weight: "100 900" });
const fontHandle = delayRender("フォントの読み込み");
font.load().then(() => {
  document.fonts.add(font);
  continueRender(fontHandle);
});

const SCENES = [
  [Hook, HOOK], [Install, INSTALL], [Share, SHARE], [Qr, QR], [Both, BOTH],
  [Delay, DELAY], [Fullscreen, FULLSCREEN], [Pip, PIP], [Debug, DEBUG], [End, END],
] as const;
const TOTAL = SCENES.reduce((n, [, d]) => n + d, 0);

const Promo = () => {
  const frame = useCurrentFrame();
  let from = 0;
  return (
    <GlobalFrame.Provider value={frame}>
      <AbsoluteFill>
        <Background />
        {SCENES.map(([Scene, duration]) => {
          const seq = (
            <Sequence key={from} from={from} durationInFrames={duration}>
              <Scene />
            </Sequence>
          );
          from += duration;
          return seq;
        })}
      </AbsoluteFill>
    </GlobalFrame.Provider>
  );
};

export const Root = () => <Composition id="Promo" component={Promo} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />;
