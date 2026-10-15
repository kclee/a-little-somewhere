# A Little Somewhere

A cozy, Codex-assisted virtual-pet experiment built with TypeScript and Canvas 2D. A tiny Maltese wanders, sits, rests, and looks toward taps or clicks in its room.

> Work in progress — current milestone: V0.3b.1 interaction and shadow polish.

## Version history

- **V0.3b.1 — Interaction & Shadow Polish:** Sit shadow aligned with the seated paws; floor arrivals pause for Attention; wall clicks move horizontally before the rear-facing wag.
- **V0.3b — Movement & Dash:** Floor-directed movement, occasional playful dashes, wall reaction, and pet status text.
- **V0.3a — Room Personalities:** Switch between the Cozy Wood and Warm Tile rooms without resetting the pet.
- **V0.2d — Rear Tail Wag:** A subtle three-frame wag while the Maltese faces away.
- **V0.2c — Warm Cream Tile Room:** A second floor style alongside the original wood room.
- **V0.2b — Walk Cycle:** Four-frame walking animation with grounded sprite and shadow alignment.
- **V0.2a — Scene Props:** Pink donut cushion, striped pet house, and frog toy.
- **V0.2 / V0.1 — First Companion:** Maltese pose artwork, then the initial room, autonomous behavior, and tap-to-look interaction.

## Work in progress

The latest milestone aligns the Sit shadow beneath the seated paws and gives floor clicks a brief arrival head tilt. Wall clicks now move the Maltese horizontally before the tail wag. The Dash is best seen in the live app.

<img src="docs/images/v0.3b.1-sit-shadow-after.png" alt="V0.3b.1 Maltese sitting with its shadow beneath its paws" width="480">
<img src="docs/images/v0.3b.1-interaction-floor-arrival.png" alt="V0.3b.1 Maltese pausing for an Attention head tilt after a floor click" width="480">

These are work-in-progress visual checkpoints, not final artwork. When a new milestone is captured, its older views move into the section below.

<details>
<summary>Earlier visual checkpoints</summary>

#### V0.3b.1 — shadow comparison and interaction sequence

Before the Sit shadow correction:

<img src="docs/images/v0.3b.1-sit-shadow-before.png" alt="Before: Sit shadow sits slightly in front of the Maltese's paws" width="480">

Floor movement → arrival Attention → wall movement → rear-facing wag:

<img src="docs/images/v0.3b.1-interaction-floor-moving.png" alt="The Maltese moving toward a floor click" width="320">
<img src="docs/images/v0.3b.1-interaction-floor-arrival.png" alt="The Maltese pausing for an Attention head tilt after arriving" width="320">
<img src="docs/images/v0.3b.1-interaction-wall-moving.png" alt="The Maltese walking toward the wall click's floor position" width="320">
<img src="docs/images/v0.3b.1-interaction-wall-wag.png" alt="The Maltese wagging after moving to the selected wall position" width="320">

Mobile portrait (390 × 844), including a room switch during the wall action:

<img src="docs/images/v0.3b.1-mobile-review-arrival.png" alt="Floor-click Attention arrival on mobile" width="260">
<img src="docs/images/v0.3b.1-mobile-review-wood-wall-wag.png" alt="Wall reaction continues after switching to the wood room on mobile" width="260">

#### V0.3a — room personalities

![A Little Somewhere in the Cozy Wood Room](docs/images/v0.3a-cozy-wood-room.png)

![A Little Somewhere in the Warm Tile Room](docs/images/v0.3a-warm-tile-room.png)

<img src="docs/images/v0.3a-scene-picker.png" alt="The two-room scene picker" width="600">
<img src="docs/images/v0.3a-shelf-tile-mobile.png" alt="Warm Tile Room at 390 by 844 mobile portrait size" width="390">

#### V0.2c — walk cycle and cream tile room

![A Little Somewhere V0.2c with the Maltese walking in the warm cream tile room](docs/images/v0.2c-cream-tile-desktop.png)

<img src="docs/images/v0.2c-cream-tile-mobile.png" alt="A Little Somewhere V0.2c in the warm cream tile room at mobile portrait size" width="390">

#### V0.2a — illustrated donut bed

![A Little Somewhere with the illustrated donut bed at desktop landscape size](docs/images/v0.2a-donut-art-desktop.png)

<img src="docs/images/v0.2a-donut-art-mobile.png" alt="A Little Somewhere with the illustrated donut bed at mobile portrait size" width="390">

#### V0.2 — provisional Maltese poses

![A Little Somewhere V0.2 with the provisional Maltese character art](docs/images/v0.2-maltese-pose-integration.png)

#### V0.2a — first scene prop pass

![A Little Somewhere V0.2a with the original drawn cushion, striped pet house, and frog toy](docs/images/v0.2a-scene-props.png)

</details>

## Run locally

Requirements: Node.js 22 or later and npm.

```powershell
npm install
npm run dev
```

Then open the local address shown by Vite. To run all checks:

```powershell
npm run check
```

The warm cream tile room is the default. Use the house button to switch rooms without restarting the pet. Add `?room=wood` to the local URL to open directly in the wood room.

The project intentionally uses only TypeScript, Vite, Vitest, and browser Canvas APIs. There is no backend or multiplayer service.

## GitHub Pages deployment

The workflow at `.github/workflows/deploy-pages.yml` tests, builds, and deploys every push to `main`.

After creating a GitHub repository and pushing this project:

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`, or run **Deploy to GitHub Pages** manually from the Actions tab.

The live project is available at [kclee.github.io/a-little-somewhere](https://kclee.github.io/a-little-somewhere/).

