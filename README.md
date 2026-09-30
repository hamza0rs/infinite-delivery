# Infinite Delivery 🛵🍕

Drive an **autonomous delivery scooter** through an endless, procedurally generated
city. Pick up pizza orders, race to the drop-off point before the timer runs out,
dodge traffic and potholes, outrun the police, and survive rain, storms and other
road hazards for as long as you can.

There is **no rider and no living creature anywhere in the game** — only vehicles,
weather and environmental hazards — with a procedural **2.5D perspective presentation**, no living-character imagery, and **no music**, only short generated
sound effects (engine hum, brakes, sirens, chimes). Both are deliberate design
constraints, not omissions.

## Tech stack

- React + TypeScript + Vite
- Phaser 3 (Canvas renderer) for the game world
- Web Audio API for all sound effects (nothing downloaded, nothing pre-recorded)
- `localStorage` for settings, stats, garage and the local leaderboard

React owns the app shell, menus and HUD; Phaser owns the game world. The two talk
through a small typed event bus (`src/game/EventBus.ts`) so neither reaches into
the other's internals.

## Getting started

```bash
npm install
npm run dev       # local dev server
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build locally
```

## Deploying to GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub
Pages on every push to `main` (or manually via "Run workflow"). In your repo
settings, set **Pages → Source → GitHub Actions**.

`vite.config.ts` sets `base: '/infinite-delivery/'` for a project-page URL like
`https://<user>.github.io/infinite-delivery/`. If you rename the repository (or
deploy to a user/organization root site), update `REPO_NAME` in that file.

## Controls

| Action | Desktop | Touch |
|---|---|---|
| Steer | `A`/`D` or arrow keys | Virtual joystick |
| Accelerate | `W` / `↑` | ▲ button |
| Brake | `S` / `↓` | ▼ button |
| Boost | `Space` | ⚡ button |
| Deliver / interact | `E` | 📦 button |
| Pause | `Esc` | pause icon (top right) |
| Debug overlay | `F1` | — |

## Project structure

```
src/
  game/         Phaser layer: scene, procedural generation, traffic AI,
                event director, difficulty curve, sound effects, garage data
  components/   React screens: menu, HUD, pause, game over, garage, stats,
                settings, how-to-play, touch controls
  hooks/        useGame.ts - owns the Phaser lifecycle, persistence and
                event-bus wiring
  services/     versioned localStorage read/write helpers
  types/        shared TypeScript types
```

## Scope notes (read this before filing a "missing feature")

This was built against a very large, ambitious spec. Everything core is real,
tested gameplay — not a mockup — but a few things were deliberately simplified
to ship something solid rather than something broad and half-working:

- **World shape.** The city is an endless *forward-scrolling multi-lane road*
  (buildings, traffic and hazards scroll toward the player) rather than a
  free-roam 2D grid with turns and intersections. Every vehicle still has its
  own independent position/velocity/state — a vehicle driving your direction
  drifts past slowly, a stationary hazard rushes at you, oncoming/police
  traffic closes distance fast — but you don't turn corners.
- **Renderer.** Phaser is configured for the **Canvas** renderer rather than
  WebGL. In this project's own test environment, WebGL silently fell back to
  an unstable software path that froze the game loop; Canvas is completely
  reliable for 2D content of this complexity and avoids that class of bug
  entirely on any machine.
- **Districts** are expressed as building color palettes/density rather than
  distinct gameplay rules per neighborhood.
- **Garage customization** covers scooter skins (body/trail color, 8 total)
  rather than separately swappable wheels/box/headlight/horn.
- **Achievements**: a real, working subset (first delivery, 10/100 deliveries,
  perfect driver, police escape, rain master, night rider, speed demon) rather
  than the full spec list.

Everything else — procedural generation with recycling/pooling, independent
traffic AI, police pursuit, construction/potholes, weather, day/night cycle,
delivery/money/combo/score, HUD, minimap, pause/restart/game-over, local
leaderboard, settings, debug mode (F1), and the full menu flow — is implemented
and was manually exercised end-to-end (driving, pausing, dying, navigating
every menu) before being handed off.

## License

MIT — see `LICENSE`.
