// The game's rules and state, with no drawing and no browser in it. The player's root tip sinks
// through the soil; rocks are the obstacles, water droplets keep the root alive, nutrients give a
// score-and-growth boost, and each level ends at the aquifer. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react without the world knowing about
// screens or sound. Nothing here allocates after createWorld returns.
import { DROPLET, FIELD, LEVEL, METRES_PER_PX, NUTRIENT, ROCK, TIP, TRAIL } from './config.js';

export const KIND_ROCK = 0;
export const KIND_WATER = 1;
export const KIND_NUTRIENT = 2;

export const EVENT_WATER = 1;
export const EVENT_ROCK = 2;
export const EVENT_NUTRIENT = 4;
export const EVENT_LEVEL = 8;
export const EVENT_OVER = 16;

const TRAIL_STEP = 7; // px of sinking between two trail nodes

function hits(tip, item) {
  const dx = tip.x - item.x;
  const dy = tip.y - item.y;
  const reach = tip.radius + item.radius;
  return dx * dx + dy * dy < reach * reach;
}

export function createWorld(random) {
  const tip = { x: FIELD.width / 2, y: FIELD.surfaceY, radius: TIP.radius, stun: 0 };
  const items = [];
  for (let index = 0; index < 96; index += 1) {
    items.push({ active: false, kind: KIND_ROCK, x: 0, y: 0, radius: 0 });
  }
  const trail = [];
  for (let index = 0; index < TRAIL.max; index += 1) trail.push({ x: 0, y: -1 });
  const state = {
    tip,
    trail,
    items,
    score: 0,
    water: TIP.waterStart,
    level: 1,
    depth: 0,
    goalDepth: LEVEL.goalDepth,
    rockTimer: ROCK.interval,
    waterTimer: DROPLET.interval,
    nutrientTimer: NUTRIENT.interval,
    trailGap: 0,
    boost: 0,
    best: 0,
    won: false,
  };

  function reset() {
    tip.x = FIELD.width / 2;
    tip.y = FIELD.surfaceY;
    tip.stun = 0;
    for (const item of items) item.active = false;
    for (const node of trail) node.y = -1;
    state.score = 0;
    state.water = TIP.waterStart;
    state.level = 1;
    state.depth = 0;
    state.goalDepth = LEVEL.goalDepth;
    state.rockTimer = ROCK.interval;
    state.waterTimer = DROPLET.interval;
    state.nutrientTimer = NUTRIENT.interval;
    state.trailGap = 0;
    state.boost = 0;
    state.won = false;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function spawnRock() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_ROCK;
    item.radius = (ROCK.minWidth + random() * (ROCK.maxWidth - ROCK.minWidth)) / 2;
    item.x = item.radius + random() * (FIELD.width - item.radius * 2);
    item.y = tip.y + FIELD.height * 0.62 + random() * 90;
  }

  function spawnDrop() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_WATER;
    item.radius = DROPLET.radius;
    item.x = DROPLET.radius + random() * (FIELD.width - DROPLET.radius * 2);
    item.y = tip.y + FIELD.height * (0.45 + random() * 0.3);
  }

  function spawnNutrient() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_NUTRIENT;
    item.radius = NUTRIENT.radius;
    item.x = NUTRIENT.radius + random() * (FIELD.width - NUTRIENT.radius * 2);
    item.y = tip.y + FIELD.height * 0.55;
  }

  function rockInterval() {
    return Math.max(ROCK.minInterval, ROCK.interval * ROCK.intervalScale ** (state.level - 1));
  }

  /**
   * One fixed step. `steer` is -1, 0 or 1 (left, straight, right); `holding` (the player pressing
   * down) sinks faster and drains water a little quicker — a risk-reward choice. With `harmless`
   * set (the title screen's backdrop) nothing spawns, touches the tip or scores.
   */
  function step(dt, steer, holding, harmless) {
    let events = 0;
    const stunned = tip.stun > 0;
    if (stunned) tip.stun = Math.max(0, tip.stun - dt);

    // Sink: base rate grows per level, faster when stunned or holding.
    let sink = TIP.sinkSpeed + TIP.sinkSpeedPerLevel * (state.level - 1);
    if (stunned) sink += TIP.stunSinkBoost;
    else if (holding) sink *= 1.55;

    tip.x = Math.min(FIELD.width - tip.radius, Math.max(tip.radius, tip.x + (stunned ? 0 : steer * TIP.steerSpeed * dt)));
    tip.y += sink * dt;

    // Trail: a node every TRAIL_STEP px of sinking.
    state.trailGap += sink * dt;
    if (state.trailGap >= TRAIL_STEP) {
      state.trailGap -= TRAIL_STEP;
      let node = null;
      for (let index = 0; index < trail.length; index += 1) {
        if (trail[index].y < 0) { node = trail[index]; break; }
        if (node === null || trail[index].y < node.y) node = trail[index];
      }
      if (node !== null) { node.x = tip.x; node.y = tip.y; }
    }

    if (harmless) return events;

    // Water drains; the boost slows it (the nutrient's root-growth dividend).
    const drain = TIP.waterDrain + TIP.waterDrainPerLevel * (state.level - 1);
    state.water -= drain * (holding ? 1.35 : 1) * (state.boost > 0 ? 0.6 : 1) * dt;
    if (state.boost > 0) state.boost = Math.max(0, state.boost - dt);
    state.depth = (tip.y - FIELD.surfaceY) * METRES_PER_PX;
    if (state.depth > state.best) state.best = state.depth;

    // Spawning happens below the tip so everything scrolls past as the root sinks.
    state.rockTimer -= dt;
    if (state.rockTimer <= 0) { spawnRock(); state.rockTimer += rockInterval(); }
    state.waterTimer -= dt;
    if (state.waterTimer <= 0) { spawnDrop(); state.waterTimer += DROPLET.interval + random() * DROPLET.intervalJitter; }
    state.nutrientTimer -= dt;
    if (state.nutrientTimer <= 0) { spawnNutrient(); state.nutrientTimer += NUTRIENT.interval + random() * NUTRIENT.intervalJitter; }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      if (item.y < tip.y - FIELD.height) { item.active = false; continue; }
      if (!hits(tip, item)) continue;
      item.active = false;
      if (item.kind === KIND_WATER) {
        state.water = Math.min(100, state.water + DROPLET.waterGain);
        state.score += DROPLET.points;
        events |= EVENT_WATER;
      } else if (item.kind === KIND_NUTRIENT) {
        state.score += NUTRIENT.points;
        state.boost = NUTRIENT.boostSeconds;
        events |= EVENT_NUTRIENT;
      } else {
        if (tip.stun === 0) {
          tip.stun = TIP.stunSeconds;
          state.water = Math.max(0, state.water - 12);
          events |= EVENT_ROCK;
        }
      }
    }

    // Two ways to lose: the root dries out, or (the rock's own toll) three hits at no water.
    if (state.water <= 0) {
      state.water = 0;
      events |= EVENT_OVER;
    }

    // Win the level: reach the aquifer.
    if (!(events & EVENT_OVER) && state.depth >= state.goalDepth) {
      state.score += 500 + state.level * 100;
      if (state.level >= LEVEL.max) {
        // The deepest aquifer: the run is complete — the root has crossed every stratum.
        state.level = LEVEL.max;
        events |= EVENT_OVER;
        state.won = true;
      } else {
        state.level += 1;
        state.goalDepth += LEVEL.goalDepthGrowth;
        state.water = Math.min(100, state.water + 45);
        events |= EVENT_LEVEL;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
