# Magic Sort

A liquid-sorting puzzle game built in React: pour mixed elixirs between glass
flasks until each one holds a single pure colour.

It is a portfolio project, so the code and the tests are the point as much as
the game is. No backend, no network calls, no CDN assets — it builds to static
files and runs entirely in the browser.

## Playing

Tap a flask to pick it up, then tap another to pour. A pour is legal when the
target is empty, or its top layer matches what you are pouring, and it has room
to take it. The whole unbroken run of the top elixir moves at once. Sort every
flask to finish the level.

Fifty levels make up the campaign, grouped into tiers by the mechanic they
introduce. The opening five teach the game itself, climbing by the number of
elixirs in play and then by taking spare flasks away. Every tier after that
introduces one mechanic and gets exactly one roomy level to learn it on before
the extra room is taken back: taller glass, five layers to a flask instead of
four; levels of mixed glass where a three-layer vial stands beside a five-layer
flask; the deep six-layer glass and then the seven-layer decanter; every size at
once; and, on the late tiers, room that is scattered rather than pooled — no
flask stands empty at the outset, the free layers are spread through part-filled
glass, and there is nowhere to pour a whole run out to. Mixed glass changes the
puzzle: an elixir can only be sealed in a flask its layers exactly fill, so the
short elixirs have only the vials to end up in. Eight elixirs are in play by the
end, on levels of nine flasks. Solving a level opens the next.

Difficulty is measured in possibilities rather than in pours. Every level is
searched exhaustively, and what the search counts is how many of the
arrangements it can be poured into can no longer be sorted — how much of the
level is a trap. A level with a spare flask loses under a tenth of its
arrangements; a level without one loses a third or more of them, and the last
level of the campaign can be lost in more ways than any other. Pour counts do
not rank levels at all: the five-elixir level with one spare takes fewer pours
than the six-elixir level with two, and every player finds it harder.

Each level pays more than the one before it. The first is worth 1000 — half of
it shared out across the flasks you sort, half for solving in as few pours as
the level allows, minus a fortieth of the level for every pour past that — and
the fiftieth is worth 50000, so a flawless campaign comes to 1275000. That
ladder is the whole economy: pressing on into the levels that are hard to sort
has to out-earn sorting the easy ones over and over. Starting a level over is
the way out of a mistake, but it is not free: the button has to be held down
while a bar fills, and it costs a tenth of the level being thrown away, out of
the points you have banked — the half-sorted level goes down the drain with the
elixirs on it. Going back to the very first level is a separate button, and it
asks first — it is a rebirth rather than a wipe, so everything you have earned
comes with you, including what the level in hand earned, but it costs the whole
campaign behind you and the level you are standing on, which is always more than
sorting those levels again could pay back.

Nothing here is bought on credit. The score never goes below nothing, so a price
you cannot pay is not a debt: it is the end of the run. Hold the restart with
less banked than it costs, or confirm a walk back you cannot afford, and the run
ends — both buttons say so before you press them, and all that is left is to
begin again from nothing. On the first level of a fresh run there is nothing
banked at all, so those two buttons are the way out of a run as much as they are
a way back into it.

A run can also end on the level in front of you, without anything being pressed.
A level can be poured into a corner where nothing will take another drop — every
glass full, and no two tops that match — and if you cannot pay to restart it, it
is the end of the run as surely as the buttons are. The game works it out for
you rather than leaving you tapping glass that will never move.

The run is kept in the browser, so closing the tab is not a way out of one
either: the level comes back with the pours already spent on it, and the total
comes back with it. It is sealed on the way in — scrambled, and signed so that a
save which has been edited is refused rather than believed. That stops a player
editing their score in developer tools, and honestly only that: the key ships
inside the bundle, because the game has no server to keep a score on, and a key
everybody has is not a secret. Making a score truly unforgeable is a different
game to this one.

A run that ends is erased rather than zeroed — every point and every level,
gone — and the save is swept at the moment the price is refused rather than when
the card is answered, because closing the tab must not be a way out of a run
that is already over either.

## Getting set up

The toolchain is pinned with [mise](https://mise.jdx.dev), so everyone builds
and tests against the same Node version. Install mise once — on macOS or Linux,
`curl https://mise.run | sh`, then follow its instructions to activate it in
your shell — and from the project root run:

```bash
mise trust     # approve this repository's mise.toml
mise install   # install the pinned Node version
mise run setup # install dependencies and the browser the e2e test uses
```

`mise install` reads `mise.toml` and puts the right Node on your `PATH` whenever
you are inside this directory, without touching the rest of your machine. To
change the pinned version, edit `mise.toml` rather than upgrading Node globally,
so the change is reviewed like any other.

Not using mise is fine too — install Node 25.5.0 yourself and run
`npm ci && npx playwright install chromium`.

## Running it

```bash
npm run dev
```

| Command                 | What it does                                     |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Dev server                                       |
| `npm run test`          | Vitest in watch mode                             |
| `npm run test -- --run` | Single test run                                  |
| `npm run test:coverage` | Coverage report                                  |
| `npm run test:e2e`      | Playwright smoke test against the real build     |
| `npm run typecheck`     | TypeScript, no emit                              |
| `npm run lint`          | ESLint                                           |
| `npm run format`        | Prettier                                         |
| `npm run verify`        | Everything above except e2e — run before pushing |
| `npm run sounds`        | Regenerate the sound effects                     |
| `npm run social-card`   | Regenerate the link preview image                |
| `npm run build`         | Production build                                 |

On Linux the browser also needs a handful of system libraries, which are outside
what mise manages, and both the e2e test and the preview image depend on it.
Install them once with `sudo npx playwright install-deps chromium`.

## Deploying

The game is played at **<https://www./magic-sort/>**, and it is free
to host: static files on GitHub Pages, with Cloudflare lending the path.

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which verifies the commit and plays a whole level in a real browser before it
builds `dist/` and hands it to Pages. Nothing reaches the public URL without
passing the same gate a local push does.

The path is on a domain the personal site already answers for, and that site is
not on Pages — so something has to lend the path out. Cloudflare routes
`/magic-sort*` on the zone to [`infra/magic-sort-worker.ts`](infra/magic-sort-worker.ts),
a proxy that swaps the hostname for the Pages one and puts the visitor back on
the custom domain when Pages answers with a redirect. Everything else on the
zone is untouched by it. Deploy it after a change to that file or its routes:

```bash
npx wrangler deploy --config infra/wrangler.jsonc
```

Because the repository is named after the public path, that path is identical on
both sides of the proxy, which is why the proxy has no path rewriting in it:
Pages publishes a project site under the repository name, and `vite.config.ts`
matches it with `base: '/magic-sort/'`. Without that base the browser would look
for the bundle at the domain root, find nothing, and show a blank page. The e2e
test drives the same subpath the deployment uses, so getting it wrong fails the
build instead of the site.

Renaming the repository, moving the game to another path, or dropping the proxy
for a domain of its own means changing the base, the Playwright preview URL and
the worker routes together — they encode the same one path.

First-time setup, done once each:

- **Settings → Pages → Source: GitHub Actions**, in the repository.
- `npx wrangler login`, then the deploy command above.

The Pages URL, <https:///magic-sort/>, keeps working and
serves the same build. It is the origin the proxy reads from, so it cannot be
hidden, only ignored.

### Link previews

A chat client or a crawler reads `index.html` and never runs the script that
draws the game, so everything it can learn lives in that file's head: a
description, Open Graph and Twitter tags, a `<noscript>` paragraph, and a
canonical URL. Those URLs are absolute deliberately — an unfurler drops a
relative one without a word, and the link then arrives bare.

The canonical points at the apex, which is what the sitemap of the site that
owns the domain uses. Three hostnames serve this same build, and naming one
original keeps them from competing as three copies of one page — including the
Pages URL, which advertises the custom domain because it serves the same file.

The image is `public/social-card.jpg`, a screenshot of the real game taken by
`npm run social-card` through the Chromium the e2e test already needs. It is
generated rather than drawn so it cannot drift from the game it advertises, and
committed, like the sound effects, so that deploying stays a plain build. Its
weight is capped on purpose: past a few hundred kilobytes WhatsApp shows the
link without a picture and says nothing. The test suite fails if the file is
missing or too heavy, because both look perfect in a browser.

## How it is built

```
src/
  domain/       Pure TypeScript puzzle rules and the level data. No React, no DOM.
  hooks/        React state orchestration over the domain.
  components/   Presentation, driven entirely by props.
  audio/        The one impure boundary, isolated so tests can stub it.
  test/         Test support, including the search that proves each level's minimum.
e2e/            A single Playwright smoke test.
scripts/        Sound synthesis.
infra/          The Cloudflare proxy that lends the game its path, and its test.
```

Dependencies point one way: `components → hooks → domain`. The rules of the
puzzle are plain functions over immutable data, which is why they can be tested
by calling them, with no test environment at all.

### Testing

Test-first, always: the test is written and watched to fail before any
implementation exists, and a failing test has to say what broke without sending
anyone to the source.

The suite follows the pyramid — the bulk of the cost sits at the bottom:

- **Unit (Vitest)** — the puzzle rules, exhaustively. Every level is searched
  breadth-first as well, so the pour count it shows the player is proven to be
  the true minimum rather than the best route somebody happened to find, and
  every level's whole space of arrangements is walked so that the difficulty
  ladder is a measured fact rather than a claim.
- **Integration (React Testing Library)** — one per meaningful interaction,
  querying by role and label the way a player perceives the UI. No test ids.
- **E2E (Playwright)** — three, and only because no lower layer can hold them.
  One solves the starter level in a real browser and moves on to the next; the
  second proves colour-blind mode is still on after a reload; the third proves a
  run comes back after one and an edited save does not. The last two need a
  browser with working storage, and the test environment has none. Anything a
  lower layer can cover belongs in a lower layer.

Current coverage: 93% of statements, 86% of branches. The gap is deliberate —
it is the audio boundary and the confetti canvas, which only a real browser
executes, and the animation callbacks, which are visual rather than behavioural.

### Dependencies

Kept deliberately short. Beyond React and the toolchain:

- **`motion`** — spring animations for pouring, selection and the win card.
- **`howler`** — audio playback, guarded so a browser without the Web Audio API
  simply stays silent instead of crashing.
- **`canvas-confetti`** — the celebration when a flask is filled and when the
  level is solved. Physics-driven particles on a canvas are the kind of thing
  that is tedious to hand-roll and worse for it; it is dependency-free and
  degrades on its own when the player asks for reduced motion.

The sound effects are synthesised by `scripts/generate-sounds.mjs` rather than
downloaded, which keeps the repository self-contained. It takes sound names on
the command line — `npm run sounds -- defeat` — because three of the recipes are
built on noise, and regenerating the whole set to add one sound rewrites files
nobody touched with fresh random samples. Two sounds are the exception to the
recipes: the rebirth and the end of a run are recorded tracks at
`src/audio/revive.mp3` and `defeat.mp3`, and the generator has no entry for them
so that re-running it cannot overwrite them.

## Conventions

Everything in this repository is written in English. Commits follow
[Conventional Commits](https://www.conventionalcommits.org/), enforced by
commitlint through Lefthook, which also formats, lints and typechecks staged
files before a commit and runs the test suite before a push.

`CLAUDE.md` holds the full working agreement for this codebase.

## Licence

MIT — see [LICENSE](LICENSE).
