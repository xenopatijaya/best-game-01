// VOID BLOOM — input. One small state object the whole game reads: the keys
// currently held, the keys pressed since the last step (so menus can answer
// a tap, not a hold), and the mouse in canvas coordinates. Nothing here
// knows what any key means; the game decides that.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.tapped = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this.anyGesture = false;

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.held.add(event.code);
      this.tapped.add(event.code);
      this.anyGesture = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => {
      this.held.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
    });
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', (event) => {
      this.mouse.down = true;
      this.mouse.clicked = true;
      this.anyGesture = true;
      event.preventDefault();
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
  }

  /** Movement as a unit-ish vector from the held keys (not normalised). */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) x -= 1;
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) x += 1;
    if (this.held.has('KeyW') || this.held.has('ArrowUp')) y -= 1;
    if (this.held.has('KeyS') || this.held.has('ArrowDown')) y += 1;
    return { x, y };
  }

  isHeld(code) {
    return this.held.has(code);
  }

  /** True once per physical press; reading it consumes it. */
  wasTapped(code) {
    if (!this.tapped.has(code)) return false;
    this.tapped.delete(code);
    return true;
  }

  /** True once per mouse press; reading it consumes it. */
  wasClicked() {
    if (!this.mouse.clicked) return false;
    this.mouse.clicked = false;
    return true;
  }

  /** Call at the end of every simulation step: taps live for one step. */
  endStep() {
    this.tapped.clear();
    this.mouse.clicked = false;
  }
}
