// Keyboard and pointer input. Held keys give steering and dive control; one-shot presses (start or
// restart, pause) are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. The mouse steers too: the tip leans toward the
// pointer's column while a pointer button is held.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let left = false;
  let right = false;
  let down = false;
  let actions = 0;
  let pointerX = null;
  let pointerHeld = false;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (DOWN.has(event.code)) down = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    down = false;
    pointerHeld = false;
  });
  target.addEventListener('pointerdown', (event) => {
    pointerHeld = true;
    pointerX = event.clientX;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
  });
  window.addEventListener('pointerup', () => {
    pointerHeld = false;
  });

  /** The canvas's left edge in client coordinates, to turn a pointer column into a steer. */
  function setCanvasBounds(scale, offsetX) {
    canvasScale = scale;
    canvasOffset = offsetX;
  }

  let canvasScale = 1;
  let canvasOffset = 0;

  return {
    setCanvasBounds,
    /** -1 for left, 1 for right, 0 for neither or both; the held pointer wins when it leans. */
    direction(fieldWidth) {
      let steer = (right ? 1 : 0) - (left ? 1 : 0);
      if (pointerHeld && pointerX !== null && steer === 0) {
        const fieldX = (pointerX - canvasOffset) / canvasScale;
        const centre = fieldWidth / 2;
        if (fieldX > centre + 40) steer = 1;
        else if (fieldX < centre - 40) steer = -1;
      }
      return steer;
    },
    holding() {
      return down || pointerHeld;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
