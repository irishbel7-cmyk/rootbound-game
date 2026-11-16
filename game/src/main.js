// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between five screens: title, play, paused, level (a brief aquifer banner) and game over.
//
// ?seed=N fixes the soil layout. ?shot=start|play|win|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_LEVEL, EVENT_OVER, EVENT_ROCK, EVENT_WATER } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_LEVEL, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
/** How long the level banner stays up before play resumes. */
const LEVEL_BANNER_SECONDS = 1.5;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const input = createInput(canvas);

input.setCanvasBounds(renderer.view.scale, renderer.view.x / (window.devicePixelRatio || 1));

function readBest() {
  try {
    return Number.parseFloat(window.localStorage.getItem(BEST_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best depth then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const screen = world.state.won ? SCREEN_WIN : scene.screen;
  let painted = 0;
  function paint() {
    renderer.draw(world.state, screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let banner = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each event.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    banner = 0;
    screen = SCREEN_PLAY;
    announce('Growing. Reach the aquifer before the water runs out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.best > best) {
      best = world.state.best;
      saveBest(best);
    }
    announce(`The root withered at ${Math.round(world.state.depth)} metres. Score ${world.state.score}. Best ${Math.round(best)}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) startGame();
    else if (actions & ACTION_PAUSE && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
      announce(screen === SCREEN_PAUSED ? 'Paused.' : 'Growing.');
    }
  }

  function step() {
    const events = world.step(STEP, input.direction(FIELD.width), input.holding(), false);
    if (events & EVENT_ROCK) announce('Hit a rock. Shaken.');
    else if (events & EVENT_WATER) announce(`Water ${Math.round(world.state.water)} percent.`);
    if (events & EVENT_LEVEL) {
      screen = SCREEN_LEVEL;
      banner = LEVEL_BANNER_SECONDS;
      announce(`Aquifer reached at ${Math.round(world.state.depth)} metres. The next one is deeper.`);
    }
    if (events & EVENT_OVER) {
      if (world.state.won) {
        screen = SCREEN_WIN;
        if (world.state.best > best) { best = world.state.best; saveBest(best); }
        announce(`The root reached the deepest aquifer at ${Math.round(world.state.depth)} metres. Score ${world.state.score}.`);
      } else endGame();
    }
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    handleActions();

    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        accumulator -= STEP;
        step();
      }
    } else if (screen === SCREEN_LEVEL) {
      banner -= elapsed;
      if (banner <= 0) {
        accumulator = 0;
        screen = SCREEN_PLAY;
      }
    } else {
      accumulator = 0;
    }

    renderer.draw(world.state, screen, best);
    requestAnimationFrame(frame);
  }

  // Leaving the tab pauses a running game rather than letting the root sink unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Rootbound. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot !== null) runShot(shot);
else runGame();
