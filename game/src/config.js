// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, surfaceY: 64 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The growing root tip. It always sinks; the player steers it sideways and slows or speeds it. */
export const TIP = {
  radius: 9,
  sinkSpeed: 78,          // px/s downward at level 1
  sinkSpeedPerLevel: 14,
  steerSpeed: 340,        // px/s sideways
  waterStart: 100,        // percent
  waterDrain: 2.6,        // percent per second at level 1
  waterDrainPerLevel: 0.5,
  stunSeconds: 1.1,       // dazed after a rock hit: cannot steer, sinks faster
  stunSinkBoost: 150,
};

export const ROCK = {
  minWidth: 46,
  maxWidth: 150,
  minHeight: 34,
  maxHeight: 78,
  /** Rocks per second at level 1, and how the rate grows. */
  interval: 1.15,
  intervalScale: 0.9,
  minInterval: 0.42,
};

export const DROPLET = {
  radius: 11,
  /** Seconds between water droplets, plus jitter. */
  interval: 1.5,
  intervalJitter: 1.0,
  waterGain: 14,
  points: 25,
};

export const NUTRIENT = {
  radius: 13,
  /** Seconds between nutrients, plus jitter. */
  interval: 9,
  intervalJitter: 4,
  points: 120,
  boostSeconds: 10,
  boostMultiplier: 3,
};

/** Depth in metres of the aquifer that ends a level, and how much deeper the next one sits. */
export const LEVEL = { goalDepth: 90, goalDepthGrowth: 45, max: 6 };

/** METRES_PER_PX converts the tip's sinking into the depth the HUD shows. */
export const METRES_PER_PX = 0.05;

export const TRAIL = { max: 260 };

export const PALETTE = {
  backdrop: '#140f0c',
  sky: '#2b1d16',
  surface: '#3a2b1d',
  soil: '#2f2118',
  soilDark: '#261a12',
  rock: '#57504b',
  rockEdge: '#6e665f',
  root: '#f0e6d2',
  rootTip: '#ffd98a',
  water: '#4fc3f7',
  nutrient: '#f2c94c',
  panel: '#1d1510',
  text: '#f3ede2',
  muted: '#a08e7d',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best depth and score are kept between visits (this browser only). */
export const BEST_KEY = 'rootbound.best';
