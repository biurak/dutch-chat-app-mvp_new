import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {SAFE, theme} from './theme';

export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

// ---- Timeline (seconds) ----
const HOOK = 3.0; // hook text over the ingredients shot
const INGREDIENTS = 5.67; // full ingredients clip
const INSPO = 3.2; // inspiration card
const PAN = 1.8; // empty pan
// Cooking clips: [file, source seconds, playback speed, step caption]
const COOK: {src: string; dur: number; rate: number; text: string}[] = [
  {src: 'oil-spray.mp4', dur: 5.37, rate: 1.5, text: 'A light spray of oil'},
  {src: 'chicken-season.mp4', dur: 5.54, rate: 1.4, text: 'Chicken in + season'},
  {src: 'chicken-pepper.mp4', dur: 7.22, rate: 1.5, text: 'Fresh pepper'},
  {src: 'chicken-sear.mp4', dur: 20.03, rate: 2.5, text: 'Stir until it turns white'},
  {src: 'chicken-cut.mp4', dur: 5.17, rate: 1.3, text: 'Cut into small pieces'},
];
const cookLen = (c: {dur: number; rate: number}) => c.dur / c.rate;
export const TOTAL_FRAMES = s(INGREDIENTS + INSPO + PAN) + COOK.reduce((n, c) => n + s(cookLen(c)), 0);

const Pop: React.FC<{children: React.ReactNode; delay?: number; style?: React.CSSProperties}> = ({children, delay = 0, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 140}});
  return <div style={{transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`, opacity: p, ...style}}>{children}</div>;
};

const Pill: React.FC<{children: React.ReactNode; bg?: string; color?: string; size?: number}> = ({children, bg = theme.cream, color = theme.ink, size = 64}) => (
  <div style={{background: bg, color, fontFamily: theme.font, fontWeight: 800, fontSize: size, lineHeight: 1.1, padding: '18px 36px', borderRadius: 28, boxShadow: '0 10px 30px rgba(0,0,0,.35)', textAlign: 'center'}}>
    {children}
  </div>
);

const Hook: React.FC = () => (
  <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: SAFE.top + 40, gap: 24}}>
    <Pop><Pill bg={theme.accent} color="#fff" size={96}>Oven dish?</Pill></Pop>
    <Pop delay={8}><Pill size={96}>Nope. ONE pan.</Pill></Pop>
    <Pop delay={18}><Pill bg="rgba(31,26,23,.85)" color="#fff" size={52}>creamy chicken + veg</Pill></Pop>
  </AbsoluteFill>
);

const ingredientList = ['Chicken', 'Zucchini', 'Butternut squash', 'Cheese', 'Olive oil'];

const Ingredients: React.FC = () => (
  <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'flex-start', padding: `0 ${SAFE.side}px ${SAFE.bottom}px`, gap: 14}}>
    {ingredientList.map((t, i) => (
      <Sequence key={t} from={s(HOOK) + i * 6} layout="none">
        <Pop style={{transformOrigin: 'left center'}}><Pill size={50}>{t}</Pill></Pop>
      </Sequence>
    ))}
  </AbsoluteFill>
);

const Inspiration: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [0, 10], [60, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: theme.cream, alignItems: 'center', paddingTop: SAFE.top - 40}}>
      <div style={{fontFamily: theme.font, fontWeight: 800, fontSize: 56, color: theme.accent, marginBottom: 20}}>My inspiration</div>
      <div style={{transform: `translateY(${slide}px)`, width: 900, borderRadius: 36, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.3)'}}>
        <Img src={staticFile('inspiration.png')} style={{width: '100%', display: 'block'}} />
      </div>
      <Sequence from={14} layout="none">
        <Pop style={{marginTop: 36}}>
          <Pill bg={theme.ink} color="#fff" size={54}>Albert Heijn oven dish<br />→ I made it in one pan</Pill>
        </Pop>
      </Sequence>
    </AbsoluteFill>
  );
};

const Step: React.FC<{n: number; text: string}> = ({n, text}) => (
  <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: SAFE.top}}>
    <Pop><Pill size={60}><span style={{color: theme.accent}}>Step {n}</span> · {text}</Pill></Pop>
  </AbsoluteFill>
);

const Watermark: React.FC = () => (
  <div style={{position: 'absolute', top: SAFE.top - 110, left: SAFE.side, fontFamily: theme.font, fontWeight: 700, fontSize: 38, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,.6)'}}>
    @recipebooster
  </div>
);

export const Reel: React.FC = () => {
  let t = 0;
  const at = (dur: number) => {
    const from = s(t);
    t += dur;
    return {from, durationInFrames: s(dur)};
  };
  const a = at(INGREDIENTS), b = at(INSPO), c = at(PAN);
  const vid = (src: string, rate = 1) => (
    <OffthreadVideo src={staticFile(`footage/${src}`)} playbackRate={rate} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  );
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Sequence {...a}>{vid('ingredients.mp4')}<Sequence from={0} durationInFrames={s(HOOK)}><Hook /></Sequence><Ingredients /><Watermark /></Sequence>
      <Sequence {...b}><Inspiration /></Sequence>
      <Sequence {...c}>{vid('pan-empty.mp4')}<Step n={1} text="Heat the pan" /><Watermark /></Sequence>
      {COOK.map((clip, i) => {
        const seq = at(cookLen(clip));
        return (
          <Sequence key={clip.src} {...seq}>
            {vid(clip.src, clip.rate)}
            <Step n={i + 2} text={clip.text} />
            <Watermark />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
