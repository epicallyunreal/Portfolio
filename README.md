# Portfolio

A JSON-driven portfolio, CV generator and in-browser content editor. Fully static — no server, no
database, no runtime API calls.

**Live:** [nutanprabhat.dev](https://nutanprabhat.dev) · **Editor demo:**
[nutanprabhat.dev/edit](https://nutanprabhat.dev/edit) · **Print CV:**
[/cv](https://nutanprabhat.dev/cv)

Three JSON files are the only source of truth. [data/cv.json](data/cv.json) holds every string a
visitor reads and is also the full CV; [data/resume.json](data/resume.json) is the one-page
version of the same career, printed to a PDF and nothing else; [data/assets.json](data/assets.json)
maps skill keys to logos and images. From those, the build produces the website, both downloadable
PDFs, the Open Graph image, the sitemap, robots.txt and the HTML `<head>` — nothing is written into
code or config, so pointing the whole thing at different content is a JSON-only edit.

The two documents follow one schema and are held to the same rules, plus one more: `npm run
validate` fails if they disagree on a fact — name, contact, employer, title, dates, education or
version. Wording, bullet selection and `x_cv` flags may differ; a date may not.

Built with Claude Code, which is rather the point: the interesting part isn't that a portfolio
exists, it's that the pipeline around it holds the content honest.

## What's actually in here

- **Schema-validated content.** Both files are checked against JSON Schema plus cross-file rules
  (every skill key must resolve, a section listed with no data fails, CDN URLs must be
  version-pinned, the phone number must never reach committed JSON). CI fails with the offending
  key named.
- **One dataset, two artifacts.** The site and a Calibri-metric CV PDF are rendered from the same
  JSON, so they cannot drift. The PDF is printed from a hidden `/cv` route by Puppeteer in CI, and
  its text layer is checked to survive extraction — an ATS reads that, not the page.
- **An in-browser editor** at `/edit` with sectional saves, live validation, a field-level
  old-vs-new diff before writing, and semver version bumps.
- **Enforced budgets.** Lighthouse (performance ≥ 0.90, accessibility ≥ 0.95, CLS < 0.1, with LCP
  under 4 s as a backstop) and a 250 KB gzipped JS ceiling, both wired into the build.
- **Cross-filtering.** Click a skill and every role, project and certification using it is listed
  as a link — driven by the tags stored in the JSON.
- **One ordering, everywhere.** The tech chips on a role, project or certification are sorted by
  the order of the groups in **Skills** — backend before databases before frontend, and so on, on
  the page and in the PDF alike. It is derived from the group order rather than stored, so
  re-tagging a skill re-sorts every place it appears.
- **A hero that isn't one line.** `x_meta.headlines` is a list; the typewriter cycles it, five
  seconds each, lifting the `emphasis` substring of each line as it is typed. One entry types once
  and stays. Validation rejects an emphasis that isn't in its own line, since that would render
  plain with no visible symptom.

## The editor

`npm run dev`, then <http://localhost:5173/edit>. It edits everything: header and contact,
experience, skills, projects, certifications, awards, education, languages, the hero headlines,
section order and the tech/image registry.

It runs in two modes, detected at load rather than compiled in:

|                   | `npm run dev`     | Deployed                                   |
| ----------------- | ----------------- | ------------------------------------------ |
| Data source       | the files on disk | the JSON bundled into the build            |
| Validation + diff | real              | real                                       |
| Save              | writes the files  | writes a per-tab session; Download exports |

The deployed editor is fully working, just without a server behind it. On arrival it branches a
session from the published JSON; edits and saves go to that session, which is mirrored into
`sessionStorage`, so reloading `/edit` picks up exactly where you left off. **Download** hands you
the changed files, and the browser warns before you leave with work you haven't downloaded.
Landing on the portfolio itself clears the session, so opening the editor from there always starts
from the published data.

Two details that matter:

- **The version is always one step past what is published**, however many times you save in a
  session. Ten saves on top of v2.4.0 still produce v2.4.1 — because that is what the file will be
  when you commit it. Only a real deploy moves the baseline.
- **Download diffs against the committed data, not the previous save.** If an early save touched
  `assets.json` and later ones only touched `cv.json`, you still get both files.

So the workflow is: edit from any device, download, drop the files into the repo through GitHub's
web UI, and CI redeploys — with validation as the gate, so a bad edit fails the build rather than
breaking the site.

**Skills → Tags** is where the cross-filter comes from: pick a skill, tick the roles, projects and
certifications that use it. Deleting a skill there removes the registry entry _and_ every
reference in one save, because removing just the entry would leave dangling keys and fail
validation.

## Local development

```sh
npm install     # also wires the pre-commit hook (data validation)
npm run dev     # dev server, editor at /edit
```

```sh
npm run validate      # schema validation + cross-checks (pre-commit and CI run this too)
npm run typecheck     # tsc --noEmit
npm run lint          # ESLint
npm run format        # Prettier write
npm run build         # production build to dist/
npm run check:bundle  # enforce the < 250 KB gzipped JS budget
npm run build:cv      # print the /cv route → public/<Name>_CV.pdf and <Name>_Resume.pdf (needs build first)
npm run build:og      # regenerate the Open Graph image from cv.json
npm run build:favicon # regenerate the monogram favicon from cv.json
```

The CV follows [CV_PDF_Layout_Spec.md](CV_PDF_Layout_Spec.md), using self-hosted Carlito
(metrically identical to Calibri) so CI renders the same layout as Word. Page count is reported,
not asserted — the CV grows with the content. The phone number never lives in JSON or on the site;
pass it at build time (`CV_PHONE="+31..." npm run build:pdf`), and in CI it comes from the
`CV_PHONE` repository secret.

#### Rendering a variant

The same script renders an alternate dataset without touching the repo — useful
for a CV tailored to one application:

```bash
npm run build:cv -- --resume /tmp/acme.json --name acme-senior-backend
```

`--resume`, `--assets` and `--name` each default to the committed values, and
supplying any of them switches the script into generate mode: output goes to
`GenerateCV/<name>.pdf` at the repo root and nowhere else — there is no `--out`,
which is the point. The directory is git-ignored, created on demand, and
**emptied at the start of every run**, so copy the PDF out before running again.
The absolute path is the last line of stdout; everything else goes to stderr.

Inputs are read-only and validated against this repo's schemas before anything
renders, using the same validator as `npm run validate` — a variant with a
typo'd tech key fails with the JSON pointer rather than producing a plausible
but wrong CV. `--name` is a filename stem, so it accepts `[A-Za-z0-9._-]` only.
Exit codes: 1 validation, 2 bad arguments or missing input, 3 render failure.

With no flags the script behaves exactly as before, which is what CI runs.

Ligatures are switched off on the print route on purpose. Carlito's `ti`/`tt`/`tf` ligature glyphs
carry no `ToUnicode` mapping in the subset Chrome embeds, so the page looked right while text
extraction silently deleted them — "Integration" came out as "Integra on", "Portfolio" as
"Por olio". A CV is read by keyword matchers before it is read by a person, so the text layer is
the artifact that matters.

### Swapping the headshot

Never drop a camera photo straight into `public/` — everything there is published verbatim, and
phone photos carry EXIF (device model, capture time, often GPS). Put the original in `assets-src/`
(git-ignored) and run:

```bash
node scripts/optimize-headshot.mjs assets-src/your-photo.jpg headshot 512
```

That re-encodes through a canvas, which rebuilds the file from raw pixels so no metadata can
survive, square-crops it, and writes `public/images/headshot.webp`. Then point
`data/assets.json#/images/headshot` at it with matching `width`/`height` — the build preloads that
exact path, and correct dimensions are what keep CLS near zero.

## How the content layer is wired

Nothing is hardcoded to a particular person, which is what makes the validation meaningful:

1. `data/cv.json` drives everything a visitor reads. The page title, meta description, Open
   Graph tags, canonical URL, sitemap, robots.txt, the CNAME file and both PDF filenames are all
   derived from it at build time.
2. `data/assets.json` maps skill keys to logos. A skill with an empty `src` renders a generated
   initials badge, so concepts like "System design" need no artwork.
3. Images live in `public/images/`, referenced from `assets.json` with explicit dimensions.
4. `npm run validate` reports every inconsistency between the two, by key.

`basics.url` also decides deployment shape: a `*.github.io` address emits no CNAME, a custom
domain emits one. Deploying to a _project_ path (`user.github.io/repo/`) rather than a domain root
additionally needs `base: '/repo/'` in `vite.config.ts`.

## Deployment

[deploy.yml](.github/workflows/deploy.yml) runs on every push to `main`: install → lint →
format → typecheck → validate data → build → **generate the CV and Resume PDFs** → bundle
budget → Lighthouse CI → deploy to GitHub Pages.

Lighthouse audits each of the four pages once. Repeat runs exist to median away runner noise, but
they were the slowest thing in the deploy and the thresholds are not tight enough to need them; if
a score ever flakes, `numberOfRuns` in [lighthouserc.json](lighthouserc.json) is the dial.

Because GitHub Pages has no SPA rewrites, the build emits real `edit/index.html` and
`cv/index.html` files so those deep links resolve instead of 404ing.

First-time setup:

1. Push to `main`, then Settings → Pages → Source: **GitHub Actions**.
2. Add the `CV_PHONE` repository secret, or the deployed CV will have no phone number.
3. For a custom domain: point DNS at GitHub's four `185.199.10x.153` A records (proxy off if
   you're on Cloudflare, SSL mode Full), set the domain under Settings → Pages, and enable
   _Enforce HTTPS_. The CNAME file is generated from `basics.url`, so it survives every deploy.

PRs run [pr-checks.yml](.github/workflows/pr-checks.yml): the same checks plus a downloadable
preview build linked in a comment.

## Licence and credits

**No licence is granted.** This is my personal site, published so the approach can be read and
learned from — the design, layout and content are mine and aren't offered for reuse. Read it,
take ideas from it, ask me about it. Please don't redeploy it as your own.

Third-party components keep their own licences:

- [Carlito](https://github.com/googlefonts/carlito) — SIL Open Font License 1.1, redistributed in
  `public/fonts/` with its licence text at [`public/fonts/OFL.txt`](public/fonts/OFL.txt).
- [devicon](https://github.com/devicons/devicon) (MIT) and
  [simple-icons](https://github.com/simple-icons/simple-icons) (CC0) — loaded from jsDelivr at
  pinned versions, not redistributed here.
- Brand logos and names remain trademarks of their respective owners, used only to indicate
  technologies worked with.
