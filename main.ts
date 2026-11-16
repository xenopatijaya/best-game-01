// VOID BLOOM — the hand-in program (Node 22, standard library only).
//
// The game is this repository's game/ folder: plain static files a desktop
// browser plays offline (game/index.html and its ES modules — no library,
// no network). This program copies game/ and screenshots/ from beside
// itself into the output directory and writes dossier.json there with the
// vendored make.fun library: the screenshots and the source outline the
// judge reads. Run it the way the grader does, twice — the bytes must not
// change between runs.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps, passed to the dossier builder so an entry the
// scorer would refuse is refused here first: at most 4 screenshots of
// 256 KiB, at most 993 files and 48 MiB under game/, no game path over
// 1,000 bytes, and the dossier's source text held to 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
