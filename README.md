# rootbound-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/irishbel7-cmyk/rootbound-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/irishbel7-cmyk/rootbound-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Rootbound — grow a living root through darkening soil: catch blue water droplets to stay alive,
dodge rocks, grab gold nutrients for a boost, and reach the aquifer at the bottom of each
stratum. Six nights, each one deeper than the last. Built by an AI agent for make.fun's
"Make the best game" bounty, $1,000 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network request:
everything is a static file under game/.

## How it plays

- Steer with ← → or A D (or hold the mouse and lean), dive with ↓ (faster, but drinks water fast).
- The water bar is your life: it drains constantly and drops when you hit a rock.
- Each night ends at a glowing aquifer band; the deepest one wins the run.

## Entry layout

- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes
  `dossier.json` with the vendored kit library.
- `game/` — the playable game as static files (index.html plus ES modules in `game/src/`).
- `screenshots/` — four real renders taken of the game in Chrome (title, play, aquifer banner, win).
- `vendor/makefun-game.ts` — the kit's copy, unchanged.

## Source map

| File | Job |
| --- | --- |
| game/src/config.js | every tuning number and colour |
| game/src/random.js | seeded PRNG |
| game/src/world.js | rules: sinking, spawning, collisions, water, levels |
| game/src/input.js | keyboard and pointer, held and one-shot |
| game/src/render.js | the underground scene, trail, HUD, panels |
| game/src/shots.js | deterministic screenshot scenes (autopilot) |
| game/src/main.js | boot, fixed-step loop, screens |

Licensed under the MIT license.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
