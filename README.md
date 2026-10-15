# A Little Somewhere

A small, passive virtual-pet experience. A tiny Maltese wanders, sits, rests, and looks toward taps or clicks in a cozy Canvas 2D room.

V0.2 integrates five provisional static character poses. They are deliberately mapped as poses—not treated as a finished animation sheet—and the original Canvas placeholder remains the load/error fallback.

## Local development

Requirements: Node.js 22 or later and npm.

```powershell
npm install
npm run dev
```

Checks used by V0.2:

```powershell
npm run check
```

The project intentionally uses only TypeScript, Vite, Vitest, and browser Canvas APIs. There is no backend, framework, or personal reference artwork.

## GitHub Pages deployment

The workflow at `.github/workflows/deploy-pages.yml` tests, builds, and deploys every push to `main`.

After creating a GitHub repository and pushing this project:

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main`, or run **Deploy to GitHub Pages** manually from the Actions tab.

Vite uses relative asset paths, so the build works both at a user/organization Pages root and under a repository subpath.

## Structure

- `src/behavior`: finite state machine for autonomous and attention behavior
- `src/simulation`: pet/world state and time-step updates
- `src/render`: responsive Canvas 2D drawing
- `public/assets/pets/maltese`: provisional transparent Maltese poses
- `src/input`: unified pointer handling for mouse, touch, and pen
- `src/core`: shared model types

