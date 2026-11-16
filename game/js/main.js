// VOID BLOOM — boot and the frame loop. This file wires the pieces: the
// canvas, the input, the sound garden, the screen keys (begin, pause,
// mute, draft picks, rooting again), and the fixed-step simulation under
// a variable-rate display. It also answers ?shot= — the screenshot scenes
// the entry's screenshots are staged with.

import { Game, SCREEN } from './game.js';
import { Input } from './input.js';
import { SoundGarden } from './audio.js';
import { drawHUD } from './hud.js';
import { drawTitle, drawDraft, drawPause, drawEnd, draftCardRects } from './screens.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('garden');
const ctx = canvas.getContext('2d');
const audio = new SoundGarden();
const input = new Input(canvas);
const game = new Game(audio);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number.parseInt(params.get('seed') || '7', 10) || 7;

let audioWoken = false;
let lastStamp = performance.now();
let shotReport = null;
let shotFrames = 0;

if (shotName) {
  shotReport = stageShot(shotName, game, shotSeed);
}

function frameSeed() {
  return (Date.now() % 90000) + 11;
}

/** Screen-level keys and clicks, read once per frame before stepping. */
function handleScreenInput() {
  if (input.anyGesture && !audioWoken) {
    audioWoken = true;
    audio.wake();
    if (game.screen === SCREEN.PLAY) audio.startMusic();
  }
  if (input.wasTapped('KeyM')) {
    audio.wake();
    audio.setMuted(!audio.muted);
  }

  if (game.screen === SCREEN.TITLE) {
    if (input.wasTapped('Enter') || input.wasTapped('Space') || input.wasClicked()) {
      audio.wake();
      game.startRun(frameSeed());
    }
    return;
  }
  if (game.screen === SCREEN.PLAY) {
    if (input.wasTapped('KeyP') || input.wasTapped('Escape')) game.screen = SCREEN.PAUSE;
    return;
  }
  if (game.screen === SCREEN.PAUSE) {
    if (input.wasTapped('KeyP') || input.wasTapped('Escape') || input.wasTapped('Enter')) game.screen = SCREEN.PLAY;
    return;
  }
  if (game.screen === SCREEN.DRAFT) {
    for (let i = 0; i < 3; i += 1) {
      if (input.wasTapped(`Digit${i + 1}`) || input.wasTapped(`Numpad${i + 1}`)) {
        audio.click();
        game.chooseDraft(i);
        return;
      }
    }
    if (input.wasClicked()) {
      const rects = draftCardRects();
      for (let i = 0; i < rects.length; i += 1) {
        const r = rects[i];
        if (input.mouse.x >= r.x && input.mouse.x <= r.x + r.w && input.mouse.y >= r.y && input.mouse.y <= r.y + r.h) {
          audio.click();
          game.chooseDraft(i);
          return;
        }
      }
    }
    return;
  }
  if (game.screen === SCREEN.OVER || game.screen === SCREEN.DAWN) {
    if (input.wasTapped('KeyR') || input.wasTapped('Enter') || input.wasClicked()) {
      audio.wake();
      game.startRun(frameSeed());
    }
  }
}

function buildControls() {
  return {
    move: input.moveVector(),
    aim: { x: game.camera.x + input.mouse.x, y: game.camera.y + input.mouse.y },
    dash: input.isHeld('Space') || input.isHeld('ShiftLeft') || input.isHeld('ShiftRight'),
  };
}

function draw() {
  game.drawWorld(ctx);
  if (game.screen === SCREEN.TITLE) {
    drawTitle(ctx, game, game.time);
  } else if (game.screen === SCREEN.DRAFT) {
    drawHUD(ctx, game, audio.muted);
    drawDraft(ctx, game, input.mouse);
  } else if (game.screen === SCREEN.PAUSE) {
    drawHUD(ctx, game, audio.muted);
    drawPause(ctx);
  } else if (game.screen === SCREEN.OVER || game.screen === SCREEN.DAWN) {
    drawEnd(ctx, game, game.time);
  } else {
    drawHUD(ctx, game, audio.muted);
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - lastStamp) / 1000);
  lastStamp = now;

  if (shotName) {
    // The staged frame holds still; only the light breathes.
    game.time += dt;
    draw();
    shotFrames += 1;
    if (shotFrames === 4) {
      window.__SHOT__ = shotReport;
      window.__SHOT_READY__ = true;
    }
    return;
  }

  handleScreenInput();
  const controls = buildControls();
  const steps = Math.max(1, Math.min(3, Math.ceil(dt / (1 / 60))));
  const h = dt / steps;
  for (let i = 0; i < steps; i += 1) game.update(h, controls);
  input.endStep();
  draw();
}

requestAnimationFrame(frame);

// For the screenshot scenes and for testing: the whole game, reachable.
window.VOID_BLOOM = { game, stageShot, SCREEN };
