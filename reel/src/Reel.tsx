import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {SAFE, theme} from './theme';

export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

// ---- Timeline (seconds) ----
const HOOK = 3.4; // hook text over the ingredients shot
const INGREDIENTS = 5.0; // ingredients clip (trimmed)
const INSPO = 7.0; // inspiration + original macros card
const END = 3.5; // end card

type Clip = {src: string; from?: number; use: number; rate: number; text: string; sub?: string};
// `use` = seconds of source footage used, `rate` = playback speed. Shown length = use / rate.
const COOK: Clip[] = [
  {src: 'oil-spray.mp4', use: 5.3, rate: 2, text: 'Stainless pan + a little olive oil spray'},
  {src: 'chicken-season.mp4', use: 5.5, rate: 1.8, text: 'Chicken cubes + salt'},
  {src: 'chicken-pepper.mp4', use: 7.2, rate: 2.4, text: 'Black pepper, fresh ground'},
  {src: 'chicken-sear.mp4', use: 18, rate: 3.4, text: 'Cook it on all sides'},
  {src: 'chicken-cut.mp4', use: 5.1, rate: 1.7, text: 'Cut into small pieces'},
  {src: 'add-veg.mp4', use: 15, rate: 3, text: 'Sweet potato + courgette'},
  {src: 'add-water.mp4', use: 5.4, rate: 1.8, text: 'A glass of water, lid on', sub: 'cook until everything is tender'},
  {src: 'mix.mp4', use: 23, rate: 5.5, text: 'Stir it all together'},
  {src: 'parmesan.mp4', use: 15, rate: 3.3, text: 'Grated Parmesan'},
  {src: 'cream.mp4', use: 21, rate: 4.5, text: 'Heat low, then 7% cooking cream', sub: 'added last so it never curdles'},
  {src: 'serve.mp4', use: 10.5, rate: 3, text: 'Stir gently'},
  {src: 'plate.mp4', use: 16.8, rate: 3.4, text: 'Pan → plate'},
  {src: 'bite.mp4', use: 8, rate: 2, text: ''},
];
const clipLen = (c: Clip) => c.use / c.rate;
const COOK_TOTAL = COOK.reduce((n, c) => n + s(clipLen(c)), 0);
export const TOTAL_FRAMES = s(INGREDIENTS) + s(INSPO) + COOK_TOTAL + s(END);

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
    <Pop><Pill bg={theme.accent} color="#fff" size={78}>PCOS + foodie</Pill></Pop>
    <Pop delay={7}><Pill size={78}>+ losing weight?</Pill></Pop>
    <Pop delay={16}><Pill bg="rgba(31,26,23,.88)" color="#fff" size={54}>This is what I actually eat</Pill></Pop>
  </AbsoluteFill>
);

const ingredientList = ['Chicken', 'Courgette', 'Sweet potato', 'Parmesan', 'Olive oil spray'];

const Ingredients: React.FC = () => (
  <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'flex-start', padding: `0 ${SAFE.side}px ${SAFE.bottom}px`, gap: 14}}>
    {ingredientList.map((t, i) => (
      <Sequence key={t} from={s(HOOK) + i * 5} layout="none">
        <Pop style={{transformOrigin: 'left center'}}><Pill size={50}>{t}</Pill></Pop>
      </Sequence>
    ))}
    <Sequence from={s(HOOK) + 5 * 5} layout="none">
      <Pop style={{transformOrigin: 'left center'}}><Pill size={44} bg={theme.accent} color="#fff">+ salt, pepper, 7% cooking cream</Pill></Pop>
    </Sequence>
  </AbsoluteFill>
);

const Chip: React.FC<{value: string; label: string}> = ({value, label}) => (
  <div style={{background: '#fff', borderRadius: 24, padding: '14px 26px', textAlign: 'center', fontFamily: theme.font, boxShadow: '0 6px 18px rgba(0,0,0,.15)'}}>
    <div style={{fontWeight: 800, fontSize: 46, color: theme.ink}}>{value}</div>
    <div style={{fontWeight: 600, fontSize: 26, color: '#7a6f66'}}>{label}</div>
  </div>
);

const Inspiration: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [0, 10], [60, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: theme.cream, alignItems: 'center', paddingTop: SAFE.top - 60}}>
      <div style={{fontFamily: theme.font, fontWeight: 800, fontSize: 54, color: theme.accent, marginBottom: 18}}>Inspired by this Picnic recipe</div>
      <div style={{transform: `translateY(${slide}px)`, width: 640, borderRadius: 32, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.3)'}}>
        <Img src={staticFile('inspiration.png')} style={{width: '100%', display: 'block'}} />
      </div>
      <Sequence from={s(1.2)} layout="none">
        <Pop style={{marginTop: 28}}>
          <div style={{fontFamily: theme.font, fontWeight: 700, fontSize: 32, color: theme.ink, textAlign: 'center', marginBottom: 10}}>Original, per portion</div>
          <div style={{display: 'flex', gap: 16}}>
            <Chip value="541" label="kcal" />
            <Chip value="38.7g" label="protein" />
            <Chip value="29.8g" label="fat" />
            <Chip value="27.5g" label="carbs" />
          </div>
        </Pop>
      </Sequence>
      <Sequence from={s(3.4)} layout="none">
        <Pop style={{marginTop: 26}}>
          <Pill bg={theme.ink} color="#fff" size={46}>I wanted it lighter, still<br />creamy + hearty</Pill>
        </Pop>
      </Sequence>
    </AbsoluteFill>
  );
};

const Step: React.FC<{n: number; text: string; sub?: string}> = ({n, text, sub}) => (
  <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: SAFE.top, gap: 14, padding: `${SAFE.top}px ${SAFE.side}px 0`}}>
    <Pop><Pill size={54}><span style={{color: theme.accent}}>{n}</span> · {text}</Pill></Pop>
    {sub ? <Sequence from={8} layout="none"><Pop><Pill size={38} bg="rgba(31,26,23,.88)" color="#fff">{sub}</Pill></Pop></Sequence> : null}
  </AbsoluteFill>
);

const Watermark: React.FC = () => (
  <div style={{position: 'absolute', top: SAFE.top - 110, left: SAFE.side, fontFamily: theme.font, fontWeight: 700, fontSize: 38, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,.6)'}}>
    @recipebooster
  </div>
);

const EndCard: React.FC = () => (
  <AbsoluteFill style={{background: theme.cream, justifyContent: 'center', alignItems: 'center', gap: 28, padding: SAFE.side}}>
    <Pop><div style={{fontFamily: theme.font, fontWeight: 800, fontSize: 84, textAlign: 'center', color: theme.ink, lineHeight: 1.1}}>Full recipe + macros<br />in the description</div></Pop>
    <Sequence from={10} layout="none"><Pop><Pill bg={theme.accent} color="#fff" size={56}>@recipebooster</Pill></Pop></Sequence>
  </AbsoluteFill>
);

export const Reel: React.FC = () => {
  let t = 0;
  const at = (dur: number) => {
    const from = s(t);
    t += dur;
    return {from, durationInFrames: s(dur)};
  };
  const vid = (src: string, rate = 1, from = 0, volume = 0) => (
    <OffthreadVideo src={staticFile(`footage/${src}`)} startFrom={s(from)} playbackRate={rate} volume={volume} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  );
  const a = at(INGREDIENTS), b = at(INSPO);
  const cookStart = s(t);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Sequence {...a}>{vid('ingredients.mp4', 1, 0, 0.5)}<Sequence from={0} durationInFrames={s(HOOK)}><Hook /></Sequence><Ingredients /><Watermark /></Sequence>
      <Sequence {...b}><Inspiration /></Sequence>
      {/* original kitchen sizzle bed under the cooking section */}
      <Sequence from={cookStart} durationInFrames={COOK_TOTAL}>
        <Audio src={staticFile('sizzle.wav')} loop volume={0.55} />
      </Sequence>
      {COOK.map((clip, i) => {
        const seq = at(clipLen(clip));
        return (
          <Sequence key={clip.src} {...seq}>
            {vid(clip.src, clip.rate, clip.from ?? 0, clip.rate <= 2 ? 0.5 : 0)}
            {clip.text ? <Step n={i + 1} text={clip.text} sub={clip.sub} /> : null}
            <Watermark />
          </Sequence>
        );
      })}
      <Sequence {...at(END)}><EndCard /></Sequence>
    </AbsoluteFill>
  );
};
