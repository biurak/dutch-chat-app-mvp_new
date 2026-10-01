import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {SAFE, theme} from './theme';

export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

// ---- Timeline (seconds) ----
const HOOK = 3.6; // finished dish + hook text
const INGREDIENTS = 4.2; // ingredients clip (trimmed)
const INSPO = 6.4; // inspiration photo, full screen
const END = 5.0; // end card

type Clip = {src: string; from?: number; use: number; rate: number; text: string; sub?: string | string[]; noNum?: boolean};
// `use` = seconds of source footage used, `rate` = playback speed. Shown length = use / rate.
const COOK: Clip[] = [
  {src: 'oil-spray.mp4', use: 5.3, rate: 2, text: 'Stainless pan + a little olive oil spray'},
  {src: 'chicken-season.mp4', use: 5.5, rate: 1.8, text: 'Chicken cubes + salt'},
  {src: 'chicken-pepper.mp4', use: 7.2, rate: 2.4, text: 'Black pepper, fresh ground'},
  {src: 'chicken-sear.mp4', use: 18, rate: 3.4, text: 'Cook it on all sides'},
  {src: 'chicken-cut.mp4', use: 5.1, rate: 1.7, text: 'Add some garlic'},
  {src: 'add-veg.mp4', use: 15, rate: 3, text: 'Sweet potato + courgette'},
  {src: 'add-water.mp4', use: 5.4, rate: 1.8, text: 'A glass of water, lid on', sub: 'cook until everything is tender'},
  {src: 'parmesan.mp4', use: 15, rate: 3.3, text: 'Grated Parmesan'},
  {src: 'cream.mp4', use: 21, rate: 4.5, text: 'Heat low, then 7% cooking cream', sub: 'added last so it never curdles'},
  {src: 'plate.mp4', use: 16.8, rate: 2.1, noNum: true, text: 'This is how I make a hearty, creamy dish', sub: ['Creamy + hearty = easier to stick to your lifestyle with PCOS', 'Under 400 kcal · 37g protein per portion']},
  {src: 'bite.mp4', use: 8, rate: 2, text: ''},
];
const clipLen = (c: Clip) => c.use / c.rate;
const COOK_TOTAL = COOK.reduce((n, c) => n + s(clipLen(c)), 0);
export const TOTAL_FRAMES = s(HOOK) + s(INGREDIENTS) + s(INSPO) + COOK_TOTAL + s(END);

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
  <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: SAFE.top + 20, gap: 22}}>
    <Pop><Pill bg={theme.accent} color="#fff" size={68}>I'm a foodie with PCOS</Pill></Pop>
    <Pop delay={7}><Pill size={68}>trying to lose weight</Pill></Pop>
    <Pop delay={16}><Pill bg="rgba(31,26,23,.88)" color="#fff" size={50}>and this is what I actually eat</Pill></Pop>
  </AbsoluteFill>
);

const ingredientList = ['Chicken', 'Courgette', 'Sweet potato', 'Parmesan', 'Olive oil spray'];

const Ingredients: React.FC = () => (
  <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'flex-start', padding: `0 ${SAFE.side}px ${SAFE.bottom}px`, gap: 14}}>
    {ingredientList.map((t, i) => (
      <Sequence key={t} from={4 + i * 5} layout="none">
        <Pop style={{transformOrigin: 'left center'}}><Pill size={50}>{t}</Pill></Pop>
      </Sequence>
    ))}
    <Sequence from={4 + 5 * 5} layout="none">
      <Pop style={{transformOrigin: 'left center'}}><Pill size={50}>7% cooking cream</Pill></Pop>
    </Sequence>
  </AbsoluteFill>
);

const Inspiration: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.25]);
  const panY = interpolate(frame, [0, durationInFrames], [-20, 40]);
  const line = (txt: string, at: number, bg = 'rgba(31,26,23,.9)') => (
    <Sequence from={s(at)} layout="none"><Pop><Pill bg={bg} color="#fff" size={54}>{txt}</Pill></Pop></Sequence>
  );
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <Img src={staticFile('inspiration.png')} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom}) translateY(${panY}px)`}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)'}} />
      <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', padding: `${SAFE.top}px ${SAFE.side}px 0`, gap: 18}}>
        {line('I came across this recipe', 0, theme.accent)}
        {line('but too high in calories + saturated fat for me', 1.6)}
        {line('so I changed it', 3.4)}
        {line('and this is what I actually made', 4.6, theme.accent)}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Step: React.FC<{n: number; text: string; sub?: string | string[]; noNum?: boolean}> = ({n, text, sub, noNum}) => {
  const subs = sub === undefined ? [] : Array.isArray(sub) ? sub : [sub];
  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: SAFE.top, gap: 14, padding: `${SAFE.top}px ${SAFE.side}px 0`}}>
      <Pop><Pill size={54}>{noNum ? null : <><span style={{color: theme.accent}}>{n}</span> · </>}{text}</Pill></Pop>
      {subs.map((x, i) => (
        <Sequence key={x} from={8 + i * 14} layout="none"><Pop><Pill size={38} bg="rgba(31,26,23,.88)" color="#fff">{x}</Pill></Pop></Sequence>
      ))}
    </AbsoluteFill>
  );
};

const Watermark: React.FC = () => (
  <div style={{position: 'absolute', top: SAFE.top - 110, left: SAFE.side, fontFamily: theme.font, fontWeight: 700, fontSize: 38, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,.6)'}}>
    @recipebooster
  </div>
);

const EndCard: React.FC = () => (
  <AbsoluteFill style={{background: theme.cream, justifyContent: 'center', alignItems: 'center', gap: 30, padding: SAFE.side}}>
    <Pop><div style={{fontFamily: theme.font, fontWeight: 800, fontSize: 76, textAlign: 'center', color: theme.ink, lineHeight: 1.1}}>Full recipe + macros<br />in the description</div></Pop>
    <Sequence from={14} layout="none"><Pop><div style={{fontFamily: theme.font, fontWeight: 600, fontSize: 46, textAlign: 'center', color: theme.ink, lineHeight: 1.25}}>I'm a foodie with PCOS on a<br />weight loss journey.<br />Stick around if you want to get inspired.</div></Pop></Sequence>
    <Sequence from={30} layout="none"><Pop><Pill bg={theme.accent} color="#fff" size={56}>@recipebooster</Pill></Pop></Sequence>
  </AbsoluteFill>
);

export const Reel: React.FC = () => {
  let t = 0;
  const at = (dur: number) => {
    const from = s(t);
    t += dur;
    return {from, durationInFrames: s(dur)};
  };
  // Each clip keeps its own original sound, with short fades so cuts don't click.
  const vid = (src: string, durationInFrames: number, rate = 1, from = 0, vol = 0.9) => (
    <OffthreadVideo
      src={staticFile(`footage/${src}`)}
      startFrom={s(from)}
      playbackRate={rate}
      volume={(f) => interpolate(f, [0, 5, durationInFrames - 5, durationInFrames], [0, vol, vol, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
      style={{width: '100%', height: '100%', objectFit: 'cover'}}
    />
  );
  const o = at(HOOK), a = at(INGREDIENTS), b = at(INSPO);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Sequence {...o}>{vid('plate.mp4', o.durationInFrames, 1, 5)}<Hook /><Watermark /></Sequence>
      <Sequence {...a}>{vid('ingredients.mp4', a.durationInFrames, 1, 0)}<Ingredients /><Watermark /></Sequence>
      <Sequence {...b}><Inspiration /></Sequence>
      {COOK.map((clip, i) => {
        const seq = at(clipLen(clip));
        return (
          <Sequence key={clip.src} {...seq}>
            {vid(clip.src, seq.durationInFrames, clip.rate, clip.from ?? 0)}
            {clip.text ? <Step n={i + 1} text={clip.text} sub={clip.sub} noNum={clip.noNum} /> : null}
            <Watermark />
          </Sequence>
        );
      })}
      <Sequence {...at(END)}><EndCard /></Sequence>
    </AbsoluteFill>
  );
};
