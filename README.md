# Michael Joffe — Interactive CV

The original résumé content with a playable NES-inspired skateboarding experience. All pixel artwork and synthesized sound effects are original.

## Run locally

Requires Node 22.13+.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/cv. The `/cv` base path matches the repository’s GitHub Pages deployment.

## Play

- **Career jam:** travel left to right along a layered, side-scrolling street through six career checkpoints. Jump over cones and barriers. Hold Left to brake and Right to speed up. Collisions cause a fall and cost one life and up to 100 points; recovery is automatic. Three collisions end the run. Each checkpoint earns 500 points and shows a large highlight inside the game, linked to the corresponding résumé role.
- **Freestyle:** a 60-second half-pipe session. Ride a curved ramp with visible timber supports, layered houses, trees, fencing, and spectators. The skater turns at the edges and lands automatically. Higher jumps earn more points. A larger green chyron on the audience seating scrolls through résumé highlights during the session. Spectators applaud completed jumps; turn on sound to hear cheers.
- **Left / Right or A / D:** brake / speed up in Career jam; move left and right in Freestyle.
- **Space / Up / W:** jump. There are no combinations or timed catches.
- **P / Escape:** pause or resume. **Enter:** start. Phones have three touch controls: left, right, jump.
- Leaving the game pauses the session. Sound is opt-in and high scores are stored on this device when browser storage is available.
- The full résumé remains readable below the game.

## Edit

`app/resume.ts` preserves the source repository’s roles and publications. Biography, education, and recognition are in `app/page.tsx`. Game state and fixed-step physics are in `app/game/engine.ts`. The Canvas renderer uses a shared ramp projection and horizontal street camera with parallax scenery in `app/game/render.ts`.

## Validate and build

```sh
npm test
npm run typecheck
npm run build
npm run test:export
```

Tests cover automatic landings, movement, obstacle avoidance, falls, recovery, checkpoints, session completion, crowd reactions, and scene projection. The export check verifies server-rendered résumé content and GitHub Pages asset paths.

`npm run build` produces `out/`. The GitHub Pages workflow tests and builds fresh output on pushes to `main`. No backend, API keys, external fonts, or game assets are required.
