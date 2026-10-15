# A Little Somewhere

A cozy, Codex-assisted virtual-pet experiment built with TypeScript and Canvas 2D. A tiny Maltese wanders, sits, rests, and looks toward taps or clicks in its room.

> Work in progress — current milestone: V0.2c walk-cycle experiment and warm cream tile room.

## Work in progress

### Current desktop landscape

![A Little Somewhere V0.2c with the Maltese walking in the warm cream tile room](docs/images/v0.2c-cream-tile-desktop.png)

### Current mobile portrait

<img src="docs/images/v0.2c-cream-tile-mobile.png" alt="A Little Somewhere V0.2c in the warm cream tile room at mobile portrait size" width="390">

These are visual checkpoints, not final artwork. New desktop and mobile captures will be added as the room and character evolve.

<details>
<summary>Earlier visual checkpoints</summary>

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

The warm cream tile room is the current default. Add `?room=wood` to the local URL to review the preserved wood-floor scene.

The project intentionally uses only TypeScript, Vite, Vitest, and browser Canvas APIs. There is no backend or multiplayer service.

## GitHub Pages deployment

The workflow at `.github/workflows/deploy-pages.yml` tests, builds, and deploys every push to `main`.

After creating a GitHub repository and pushing this project:

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`, or run **Deploy to GitHub Pages** manually from the Actions tab.

The live project is available at [kclee.github.io/a-little-somewhere](https://kclee.github.io/a-little-somewhere/).

