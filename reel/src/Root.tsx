import {Composition} from 'remotion';
import {Reel, TOTAL_FRAMES, FPS} from './Reel';

export const Root = () => (
  <Composition id="Reel" component={Reel} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} />
);
