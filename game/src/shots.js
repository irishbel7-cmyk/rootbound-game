// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple autopilot (seek the nearest
// droplet, swerve around rocks, dive when the way is clear), so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { FIELD, METRES_PER_PX, STEP } from './config.js';
import { EVENT_OVER, KIND_WATER } from './world.js';
import { SCREEN_LEVEL, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 1200;
const SAMPLE = 1 / 30;

/**
 * The autopilot's verdict for one candidate steer: a large badness when the path ahead meets a
 * rock, a small one proportional to the distance to the nearest droplet otherwise. Diving gets a
 * small bonus so the root keeps making depth when nothing threatens it.
 */
function pathBadness(state, steer, hold, horizon) {
  const tip = state.tip;
  let badness = 0;
  const sink = 80 + 16 * (state.level - 1);
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.min(FIELD.width - tip.radius, Math.max(tip.radius, tip.x + steer * 340 * t));
    const y = tip.y + sink * (hold ? 1.55 : 1) * t;
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active) continue;
      const dx = x - item.x;
      const dy = y - item.y;
      const reach = tip.radius + item.radius + 14;
      if (dx * dx + dy * dy < reach * reach) {
        badness += item.kind === KIND_WATER ? -30 : 500 / (0.2 + t);
      }
    }
  }
  if (!hold) badness += 5; // a mild preference for diving when it is safe
  return badness;
}

function autopilot(state, horizon) {
  let best = 0;
  let bestBadness = Infinity;
  const candidates = [[-1, false], [0, false], [1, false], [0, true]];
  for (const [steer, hold] of candidates) {
    const badness = pathBadness(state, steer, hold, horizon);
    if (badness < bestBadness) {
      bestBadness = badness;
      best = steer;
      bestHold = hold;
    }
  }
  return best;
}

let bestHold = false;

function holdFor(state) {
  return bestHold;
}

/**
 * Set `world` to the named scene (start, play, win or end; any other name is start) and return
 * the screen to draw over it and the best depth to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'win') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const horizon = name === 'end' ? 0.25 : 0.6;
  const maxSeconds = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let levelSeen = false;
  let overSeen = false;
  let wonSeen = false;
  for (let index = 0; index < maxSeconds / STEP; index += 1) {
    const steer = autopilot(world.state, horizon);
    const events = world.step(STEP, steer, holdFor(world.state), false);
    if (events & EVENT_OVER) {
      overSeen = true;
      wonSeen = world.state.won;
      break;
    }
    if (name === 'win' && !levelSeen && world.state.level > 1) { levelSeen = true; break; }
  }
  if (name === 'win') {
    if (levelSeen) return { screen: SCREEN_LEVEL, best: world.state.best };
    // Not reached in the budget: fall back to the plain play scene.
    return { screen: SCREEN_PLAY, best: world.state.best };
  }
  if (name === 'end') {
    if (overSeen && wonSeen) return { screen: SCREEN_OVER, best: world.state.best, won: true };
    if (overSeen) return { screen: SCREEN_OVER, best: world.state.best };
    return { screen: SCREEN_PLAY, best: world.state.best };
  }
  return { screen: SCREEN_PLAY, best: world.state.best };
}
