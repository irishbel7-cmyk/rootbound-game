// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. The soil
// scrolls past as the root sinks; everything drawn in field coordinates is offset by how deep the
// tip has gone. Text that holds a number is rebuilt only when the number changes, so a frame
// allocates nothing.
import { FIELD, FONT, METRES_PER_PX, PALETTE } from './config.js';
import { KIND_NUTRIENT, KIND_WATER } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_LEVEL = 'level';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 34, bottom: 70 };
const BAR = { x: 24, y: 24, width: 280, height: 22 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const depthLabel = cachedLabel('Depth ');
  const scoreLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('Night ');
  const goalLabel = cachedLabel('Goal ');
  const finalLabel = cachedLabel('Depth ');
  const finalScoreLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  /** How far the visible window sits below the surface, in field pixels. */
  function scroll(state) {
    return Math.max(0, state.tip.y - FIELD.height * 0.45);
  }

  function drawUnderground(state, screen) {
    const offset = scroll(state);

    // Sky above the surface, soil below; a horizon strip marks the surface itself.
    const surfaceScreenY = FIELD.surfaceY - offset;
    context.fillStyle = PALETTE.sky;
    context.fillRect(0, 0, FIELD.width, Math.max(0, surfaceScreenY));
    context.fillStyle = PALETTE.soil;
    context.fillRect(0, Math.max(0, surfaceScreenY), FIELD.width, FIELD.height - Math.max(0, surfaceScreenY));

    // Soil strata bands, in world space, give the sinking a sense of motion.
    context.fillStyle = PALETTE.soilDark;
    const band = 110;
    const first = Math.floor(offset / band) * band;
    for (let y = first; y < offset + FIELD.height + band; y += band) {
      const screenY = y - offset;
      if (y > FIELD.surfaceY) context.fillRect(0, screenY, FIELD.width, 8);
    }

    // Pebbles: a deterministic scatter in world space, so the soil reads as soil while it moves.
    context.fillStyle = PALETTE.soilDark;
    const pebbleStart = Math.floor(offset / 160) * 160;
    for (let row = pebbleStart; row < offset + FIELD.height + 160; row += 160) {
      const index = Math.round(row / 160);
      for (let k = 0; k < 7; k += 1) {
        const h = Math.sin(index * 12.9898 + k * 78.233) * 43758.5453;
        const px = Math.abs(h % 1) * FIELD.width;
        const py = row + Math.abs((h * 1.7) % 1) * 150;
        if (py < FIELD.surfaceY) continue;
        context.beginPath();
        context.arc(px, py - offset, 2 + Math.abs((h * 3.3) % 1) * 3, 0, Math.PI * 2);
        context.fill();
      }
    }

    // The surface line with grass tufts, once it is on screen.
    if (surfaceScreenY > -20) {
      context.fillStyle = PALETTE.surface;
      context.fillRect(0, surfaceScreenY, FIELD.width, 12);
      context.fillStyle = '#5a7a3a';
      for (let x = 0; x < FIELD.width; x += 26) {
        context.fillRect(x, surfaceScreenY - 6, 4, 6);
        context.fillRect(x + 10, surfaceScreenY - 10, 4, 10);
      }
    }

    // Rocks, droplets and nutrients, each at its world position minus the scroll.
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active) continue;
      const y = item.y - offset;
      if (y < -item.radius * 2 || y > FIELD.height + item.radius * 2) continue;
      if (item.kind === KIND_WATER) {
        context.fillStyle = PALETTE.water;
        context.beginPath();
        context.arc(item.x, y, item.radius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#bfe9ff';
        context.beginPath();
        context.arc(item.x - item.radius * 0.3, y - item.radius * 0.3, item.radius * 0.3, 0, Math.PI * 2);
        context.fill();
      } else if (item.kind === KIND_NUTRIENT) {
        context.fillStyle = PALETTE.nutrient;
        context.beginPath();
        const cx = item.x;
        const cy = y;
        context.moveTo(cx, cy - item.radius);
        context.lineTo(cx + item.radius, cy);
        context.lineTo(cx, cy + item.radius);
        context.lineTo(cx - item.radius, cy);
        context.closePath();
        context.fill();
      } else {
        context.fillStyle = PALETTE.rock;
        context.beginPath();
        context.moveTo(item.x - item.radius, y + item.radius * 0.55);
        context.lineTo(item.x - item.radius * 0.55, y - item.radius * 0.7);
        context.lineTo(item.x + item.radius * 0.6, y - item.radius * 0.55);
        context.lineTo(item.x + item.radius, y + item.radius * 0.4);
        context.lineTo(item.x + item.radius * 0.35, y + item.radius * 0.8);
        context.lineTo(item.x - item.radius * 0.5, y + item.radius * 0.75);
        context.closePath();
        context.fill();
        context.strokeStyle = PALETTE.rockEdge;
        context.lineWidth = 2;
        context.stroke();
      }
    }

    // The root's trail: a tapering line from the newest node to the tip.
    context.strokeStyle = PALETTE.root;
    context.lineCap = 'round';
    let previous = null;
    for (let index = 0; index < state.trail.length; index += 1) {
      const node = state.trail[index];
      if (node.y < 0) continue;
      const ny = node.y - offset;
      if (previous !== null) {
        context.lineWidth = Math.max(2, 10 - index * 0.05);
        context.beginPath();
        context.moveTo(previous.x, previous.y - offset);
        context.lineTo(node.x, ny);
        context.stroke();
      }
      previous = node;
    }
    // Fine root hairs, alternating sides, so the trail reads as a living root.
    context.lineWidth = 2;
    context.strokeStyle = '#cdbfa5';
    let hairs = 0;
    for (let index = 0; index < state.trail.length; index += 3) {
      const node = state.trail[index];
      if (node.y < 0) continue;
      hairs += 1;
      const side = hairs % 2 === 0 ? 1 : -1;
      const ny = node.y - offset;
      context.beginPath();
      context.moveTo(node.x, ny);
      context.lineTo(node.x + side * 16, ny + 10);
      context.stroke();
    }
    context.strokeStyle = PALETTE.root;
    if (previous !== null) {
      context.lineWidth = 10;
      context.beginPath();
      context.moveTo(previous.x, previous.y - offset);
      context.lineTo(state.tip.x, state.tip.y - offset);
      context.stroke();
    }

    // The tip: a glowing bulb, pulsing when boosted, red-ringed when stunned.
    const tipY = state.tip.y - offset;
    if (state.boost > 0) {
      context.fillStyle = PALETTE.nutrient;
      context.beginPath();
      context.arc(state.tip.x, tipY, state.tip.radius + 6 + Math.sin(Date.now() / 90) * 2, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = state.tip.stun > 0 ? PALETTE.danger : PALETTE.rootTip;
    context.beginPath();
    context.arc(state.tip.x, tipY, state.tip.radius, 0, Math.PI * 2);
    context.fill();
    if (state.tip.stun > 0) {
      context.strokeStyle = PALETTE.danger;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(state.tip.x, tipY, state.tip.radius + 5, 0, Math.PI * 2);
      context.stroke();
    }

    // The aquifer at the level's goal depth, when it is near enough to see.
    const goalY = FIELD.surfaceY + state.goalDepth / METRES_PER_PX - offset;
    if (goalY > -40 && goalY < FIELD.height + 40) {
      context.fillStyle = PALETTE.water;
      context.globalAlpha = 0.35;
      context.fillRect(0, goalY, FIELD.width, FIELD.height - goalY + 400);
      context.globalAlpha = 1;
      context.fillStyle = PALETTE.water;
      context.fillRect(0, goalY - 6, FIELD.width, 6);
      text('AQUIFER', FIELD.width / 2, goalY - 16, 22, PALETTE.water, 'center');
    }

    if (screen === SCREEN_LEVEL) {
      context.fillStyle = 'rgba(10, 8, 6, 0.55)';
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  function drawWaterBar(state) {
    context.fillStyle = PALETTE.panel;
    context.fillRect(BAR.x - 3, BAR.y - 3, BAR.width + 6, BAR.height + 6);
    context.fillStyle = PALETTE.soilDark;
    context.fillRect(BAR.x, BAR.y, BAR.width, BAR.height);
    const fill = (state.water / 100) * BAR.width;
    context.fillStyle = state.water < 25 ? PALETTE.danger : PALETTE.water;
    context.fillRect(BAR.x, BAR.y, fill, BAR.height);
    context.textBaseline = 'top';
    text('WATER', BAR.x + BAR.width + 14, BAR.y + 2, 18, PALETTE.muted, 'left');
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    drawWaterBar(state);
    text(depthLabel(Math.round(state.depth) + 'm'), FIELD.width / 2, 20, 30, PALETTE.text, 'center');
    text(goalLabel(Math.round(state.goalDepth) + 'm'), FIELD.width / 2, 54, 18, PALETTE.muted, 'center');
    text(scoreLabel(state.score), FIELD.width - 24, 20, 28, PALETTE.text, 'right');
    text(levelLabel(state.level), FIELD.width - 24, 54, 22, PALETTE.muted, 'right');
    if (state.boost > 0) text('BOOST', FIELD.width - 24, 84, 18, PALETTE.nutrient, 'right');
    if (state.tip.stun > 0) text('STUNNED!', FIELD.width / 2, 86, 24, PALETTE.danger, 'center');
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 84, 48, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 40, 24, PALETTE.nutrient, 'center');
  }

  const TITLE_LINES = [
    'Grow the root to the aquifer before it dries out.',
    '← → / A D steer, ↓ dive (uses water fast), P pause.',
    'Catch blue droplets, avoid rocks, gold nutrients boost.',
    '',
  ];
  const PAUSED_LINES = ['The soil will wait for you.'];
  const OVER_LINES = ['', '', ''];
  const LEVEL_LINES = [''];

  /** Paint one frame: the underground, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawUnderground(state, screen);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[3] = bestLabel(Math.round(best) + 'm');
      drawPanel('ROOTBOUND', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(Math.round(state.depth) + 'm');
      OVER_LINES[1] = finalScoreLabel(state.score);
      OVER_LINES[2] = bestLabel(Math.round(best) + 'm');
      drawPanel('The root withered', OVER_LINES, 'Press Space or click to grow again');
    } else if (screen === SCREEN_WIN) {
      OVER_LINES[0] = finalLabel(Math.round(state.depth) + 'm');
      OVER_LINES[1] = finalScoreLabel(state.score);
      drawPanel('The deepest aquifer!', OVER_LINES, 'Press Space or click to grow again');
    } else if (screen === SCREEN_LEVEL) {
      LEVEL_LINES[0] = 'The root drank from the aquifer. Next goal: ' + Math.round(state.goalDepth) + 'm';
      drawPanel('Night ' + (state.level - 1) + ' complete', LEVEL_LINES, 'Growing on…');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view, setCanvasBoundsProxy: resize };
}
