# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/xenopatijaya/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/xenopatijaya/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**VOID BLOOM** — one night in the blight garden. You are the last
Bloomkeeper, a seed-spirit with a lantern heart, holding a drowned garden
against the blight until dawn. Ten bells of swarming mites, skitters,
bulwarks and spitters; an elite at bells 3, 6 and 9; and at the tenth bell
THE HOLLOW HUSK roots itself in the garden and tries to snuff your light.
Outlast the night or bring the Husk down and the garden blooms again. Let
your heart-root reach zero and you wither where you stand.

Your weapons fire on their own at the nearest blight — your hands are for
positioning, dashing through the swarm, and choosing how you grow. Every
kill sheds pollen; gather enough and the garden offers a **graft**: one of
three growths, a new weapon or a stronger root, and the build you choose is
the run you get. Petal Fan, Thorn Orbit, Nova Bloom and Wisp Seekers mix
with Swift Roots, Thick Bark, Sap Flow, Pollen Magnet and Bright Heart.
Kills chained inside a breath build the BLOOM CHAIN multiplier, up to ×9.

**Controls** — WASD or arrow keys to move, the mouse to aim, Space or
Shift to dash (you cannot be hurt mid-dash), P or Esc to pause, M to mute,
R to root again from an end screen, Enter or a click to begin. Survive all
ten bells for dawn; the score screen at the end counts your bells, kills,
level and chain best.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. The game is plain
static files under `game/` — no build step, no network — served by any
static file server. `main.ts` hands the entry in: it copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored make.fun library.

The screenshots in `screenshots/` are real renders of this game's own
code, staged with the game's built-in `?shot=` scenes (`shots.json`):
each scene starts a fresh run and plays the real rules forward under a
simple autopilot, so a frame is what a short game really looks like.

---

<sub>Entered on [make.fun](https://make.fun/?ref=fmkt9ms6&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
