# Portfolio Website — Build Specification

**Owner:** Nutan Prabhat
**Purpose:** A data-driven, highly animated personal portfolio, deployed to GitHub Pages via GitHub Actions, with all content sourced from JSON files that can be updated by pushing to the repo.

This document is the spec. Build it in the phases described in §10 — get deployment working before building features.

---

## 1. Goals & non-goals

**Goals**

- Every piece of content lives in JSON. Adding a certification or project = edit JSON, commit, push. No component changes.
- Animation-heavy and genuinely interactive, without becoming slow or inaccessible.
- Fully static. No server, no database, no runtime API calls.
- The CI pipeline does real work: validates data, enforces performance budgets, generates the resume PDF.
- Doubles as demonstrable React experience.

**Non-goals**

- No CMS, no auth, no backend.
- No blog engine (a "Writing" section may link out to external posts).
- Not a template — it should not look like one.

---

## 2. Tech stack

| Concern             | Choice                                               | Rationale                                                              |
| ------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Build               | **Vite 5**                                           | Fast, first-class static output, trivial GitHub Pages deploy.          |
| Framework           | **React 18 + TypeScript**                            | Doubles as React practice; TS catches JSON-shape errors at build time. |
| Styling             | **Tailwind CSS**                                     | Fast iteration, small production CSS, easy dark theme.                 |
| Animation           | **Motion** (`motion/react`, formerly Framer Motion)  | Declarative, React-native, handles scroll and layout animation well.   |
| Scroll choreography | **GSAP + ScrollTrigger**                             | Only where Motion isn't enough (pinned sections, scrubbed timelines).  |
| Smooth scroll       | **Lenis**                                            | Smooth scrolling that plays well with ScrollTrigger.                   |
| Graph layout        | **d3-force** (layout only, rendered in SVG by React) | For the navigation topology in §5.                                     |
| Icons               | **devicon** + **simple-icons** via jsDelivr CDN      | See §7.                                                                |
| Schema validation   | **Ajv**                                              | Validates JSON against schema in CI.                                   |
| Deploy              | **GitHub Actions → GitHub Pages**                    | See §9.                                                                |

**Do not** add a UI component library. The visual identity should be bespoke.

---

## 3. Repository

Name the repo **`nutan-prabhat.github.io`**. A user-site repo deploys at the domain root, so `vite.config.ts` needs `base: '/'`. If you use any other repo name, set `base: '/<repo-name>/'` or every asset path will 404 on Pages — this is the single most common failure in this setup.

```
.
├── .github/workflows/
│   ├── deploy.yml            # build → validate → deploy to Pages
│   └── pr-checks.yml         # lint, typecheck, schema validation, Lighthouse
├── data/
│   ├── cv.json               # JSON Resume schema — the full document, feeds the site and the CV PDF
│   ├── resume.json           # the one-page version of the same career, printed to a PDF only
│   ├── assets.json           # logo/image registry — presentation
│   └── schema/
│       ├── resume.schema.json
│       └── assets.schema.json
├── public/
│   ├── images/               # local images (headshot, project shots, og image)
│   └── logos/                # local SVGs for anything not on a CDN
├── scripts/
│   ├── validate-data.mjs     # Ajv validation, run in CI and pre-commit
│   └── build-resume-pdf.mjs  # cv.json and resume.json → PDFs, run in CI
├── src/
│   ├── components/
│   ├── sections/
│   ├── hooks/
│   ├── lib/
│   ├── styles/
│   └── main.tsx
└── vite.config.ts
```

---

## 4. Data architecture

Two JSON files, deliberately separated: **content** and **presentation**. Content changes often; the asset registry rarely.

### 4.1 `data/cv.json` — JSON Resume schema

Use the **JSON Resume** standard (`https://jsonresume.org/schema`). It's an established schema, which means the CI validation is meaningful rather than self-invented, and the data stays portable.

Top-level keys: `basics`, `work`, `education`, `certificates`, `skills`, `projects`, `languages`, `interests`, `references`, plus a custom `x_meta` block for site-only fields.

```jsonc
{
  "basics": {
    "name": "Nutan Prabhat",
    "label": "Senior Software Engineer — Backend & Full-Stack",
    "image": "/images/headshot.jpg",
    "email": "prabhat9819@gmail.com",
    "phone": "", // leave empty — do not publish
    "url": "https://nutan-prabhat.github.io",
    "summary": "Backend engineer with 4+ years in Python and Django...",
    "location": { "city": "Pune", "countryCode": "IN" },
    "profiles": [
      {
        "network": "LinkedIn",
        "username": "nutan-prabhat",
        "url": "https://www.linkedin.com/in/nutan-prabhat/",
      },
      {
        "network": "GitHub",
        "username": "epicallyunreal",
        "url": "https://github.com/epicallyunreal",
      },
    ],
  },
  "work": [
    {
      "name": "Aziro Technologies",
      "position": "Senior Software Developer",
      "startDate": "2025-12",
      "endDate": null, // null renders as "Present"
      "summary": "Sole engineer on an enterprise client account.",
      "highlights": [
        "Rebuilt a two-stage visual retrieval engine: CLIP ViT-B/16 embeddings in Qdrant for candidate recall, then a feature-based reranker for precision — Top-1 accuracy from a 41.9% baseline to 97.7%.",
      ],
      "x_tech": ["python", "django", "qdrant", "pytorch", "docker"], // keys into assets.json
    },
  ],
  "skills": [
    {
      "name": "Backend",
      "keywords": ["python", "django", "drf", "flask", "nodejs", "rest"],
    },
  ],
  "projects": [
    {
      "name": "CreatorHub",
      "description": "Multi-tenant agency operations platform...",
      "url": "https://github.com/epicallyunreal/CreatorHub",
      "highlights": ["Architected the 12-app module structure..."],
      "x_tech": ["django", "drf", "react", "vite"],
      "x_featured": true,
    },
  ],
  "certificates": [
    {
      "name": "Meta Back-End Developer",
      "issuer": "Coursera",
      "date": "2026",
      "url": "",
      "x_status": "in-progress",
    },
  ],
  "x_meta": {
    "headline": "I build backend systems that hold up in production.",
    "availability": "Open to relocation (EU) and remote roles",
    "sectionOrder": ["about", "experience", "skills", "projects", "certifications", "contact"],
  },
}
```

**Rules for the app:**

- Never hardcode content. Every string a visitor reads comes from `cv.json`.
- `x_status: "in-progress"` renders a distinct badge — do not show in-progress certs as complete.
- `endDate: null` → "Present".
- Sections render in `x_meta.sectionOrder`. Adding a section to the array without data should fail validation, not render empty.

### 4.2 `data/assets.json` — logo & image registry

Maps a stable key to an image source. Each entry supports either a CDN URL or a local path, so any logo can be swapped without touching components.

```jsonc
{
  "version": 1,
  "defaults": { "fallback": "/logos/_generic.svg" },
  "tech": {
    "python": {
      "label": "Python",
      "src": "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg",
      "color": "#3776AB",
    },
    "django": {
      "label": "Django",
      "src": "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/django/django-plain.svg",
      "color": "#092E20",
    },
    "postgres": {
      "label": "PostgreSQL",
      "src": "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg",
      "color": "#4169E1",
    },
    "qdrant": { "label": "Qdrant", "src": "/logos/qdrant.svg", "color": "#DC244C" },
  },
  "images": {
    "headshot": {
      "src": "/images/headshot.jpg",
      "alt": "Nutan Prabhat",
      "width": 640,
      "height": 640,
    },
    "og": { "src": "/images/og.png", "alt": "", "width": 1200, "height": 630 },
  },
}
```

**Rules:**

- `x_tech` keys in `cv.json` must exist in `assets.tech` — CI fails otherwise. This prevents silent broken logos.
- Prefer devicon for dev tooling, simple-icons for brands, local SVG for anything missing (Qdrant, CLIP, Aziro).
- Pin CDN versions in production (`@v2.16.0`, not `@latest`) so a CDN change can't break the site silently.
- Every image needs `alt`, `width`, `height` — layout shift is a Lighthouse failure.

---

## 5. Navigation concept — **System Topology**

Skip the galaxy. It's the most common portfolio theme and says nothing about the person. Since you're a backend and systems engineer — graph-based validation, vector retrieval, multi-tenant architecture — **navigation as a live system-architecture graph** is thematically honest and far more distinctive.

**Concept:** the nav is a node graph resembling a service topology. Each section is a node; edges connect related sections (Experience → Projects, Skills → Experience). Nodes pulse gently like healthy services. Data appears to flow along edges toward the active node.

**Behaviour:**

- Desktop: fixed left rail (~280px) rendering an SVG graph. Node positions computed once with `d3-force`, then **frozen** — the layout must be stable across reloads, not jittering on every visit.
- Hover: node scales, its edges brighten, a tooltip shows the section name and an item count from the JSON ("Experience · 4 roles").
- Click: active node scales up and its ring completes; the page scroll-animates to that section.
- Scroll: the active node updates automatically via IntersectionObserver, so the graph mirrors position.
- Mobile: the graph collapses into a bottom bar of nodes on a horizontal line, same interaction model.
- Keyboard: nodes are focusable in DOM order, Enter/Space activates, arrow keys move between them. Visible focus rings.

**Fallback:** if `prefers-reduced-motion: reduce`, render the same graph statically — no pulsing, no flow, instant scroll on click. It should still be fully usable.

_Alternatives considered — use only if the topology proves unworkable:_ a terminal/CLI nav (dev-popular but overdone), or your original tree (clean, less distinctive).

---

## 6. Sections

### 6.1 Header / Hero

Full viewport. Bold, high contrast, minimal.

- Large headshot from `assets.images.headshot`, masked into a shape (hexagon or squircle — not a plain circle), with a subtle animated gradient border.
- Name in oversized type (`clamp(3rem, 12vw, 9rem)`), animated in with a per-character stagger on load.
- Headline from `x_meta.headline` typed in beneath, once, not looped.
- Availability pill from `x_meta.availability`.
- Buttons: "Download CV" (the CI-generated PDF) and "GitHub".
- Background: an animated particle/node field echoing the topology theme, on canvas, capped at 60fps and disabled under reduced-motion.
- Scroll cue at the bottom that fades once the user scrolls.

### 6.2 About

Short prose from `basics.summary`, revealed in on scroll. Beside it, a compact stat strip: years of experience, roles shipped, projects, certifications — all counted from the JSON, never hardcoded.

### 6.3 Experience

Vertical timeline driven by `work[]`.

- Each entry is a card that animates in as it enters the viewport (fade + slight rise, staggered highlights).
- Tech logos per role from `x_tech` → `assets.tech`.
- Highlights expand and collapse; collapsed by default on mobile.
- The timeline spine draws itself as you scroll (GSAP ScrollTrigger scrub on an SVG path `stroke-dashoffset`).

### 6.4 Skills

Driven by `skills[]`, grouped by category.

- Each skill is a logo tile from `assets.tech` with the label beneath.
- Tiles animate in on a grid stagger; on hover the logo lifts, colour saturates from greyscale, and the tile's accent uses `color` from the registry.
- Clicking a skill highlights every Experience and Project entry using it (cross-filter via `x_tech`) — this is the strongest interaction on the site and worth building well.
- No proficiency bars or percentages. They're meaningless and read as padding.

### 6.5 Projects

Card grid from `projects[]`, with `x_featured: true` rendering a larger card.

- Cards tilt slightly toward the cursor on hover (subtle — max 6 degrees).
- Tech logo row, repo link, expandable highlights.

### 6.6 Certifications

Timeline or card row from `certificates[]`. In-progress entries render with a distinct dashed border and an "In progress" badge. Where `url` is present the card links to the credential.

### 6.7 Contact

Email and profile links from `basics.profiles`. No contact form — it needs a backend and this is static. Use a `mailto:` with the address lightly obfuscated in the DOM against scrapers.

---

## 7. Animation rules

Animations should feel engineered, not decorative. Hold to these:

- **Timing:** entrances 300–500ms, micro-interactions 150–250ms. Easing `cubic-bezier(0.16, 1, 0.3, 1)` for entrances, standard ease-out for hovers.
- **Stagger:** 40–60ms between siblings. More than that feels sluggish.
- **Animate only `transform` and `opacity`.** Never animate `width`, `height`, `top`, `left` — they force layout on every frame.
- **Trigger once.** Entrance animations should not replay on every scroll past. Use `whileInView` with `viewport={{ once: true }}`.
- **`prefers-reduced-motion` is non-negotiable.** Build a `useReducedMotion` hook, gate every non-essential animation through it, and make the site fully usable with all motion off. This is a genuine quality signal, and interviewers do check.
- **Cap the particle field** at a fixed device-pixel-ratio and pause it when the tab is hidden (`visibilitychange`).

---

## 8. Performance & accessibility budgets

Enforced in CI (§9) — the build fails if breached.

| Metric                   | Budget   |
| ------------------------ | -------- |
| Lighthouse Performance   | ≥ 90     |
| Lighthouse Accessibility | ≥ 95     |
| Largest Contentful Paint | < 2.5s   |
| Cumulative Layout Shift  | < 0.1    |
| Total JS (gzipped)       | < 250 KB |

**Requirements:**

- Lazy-load every section below the fold with `React.lazy` + `Suspense`.
- Headshot served as WebP with explicit dimensions.
- GSAP and the canvas background load only on desktop and only when motion is allowed.
- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`), one `<h1>`, logical heading order.
- Visible focus states throughout. Full keyboard operation including the topology nav.
- Contrast ≥ 4.5:1 for body text.

---

## 9. CI/CD

Two workflows. This is the part that makes the project more than a page.

### `pr-checks.yml` — on pull request

1. Install (`npm ci`).
2. ESLint + Prettier check.
3. `tsc --noEmit`.
4. **`scripts/validate-data.mjs`** — Ajv-validate both JSON files against their schemas, then cross-check that every `x_tech` key resolves in `assets.json`. Fail with a readable message naming the offending key.
5. Build.
6. **Lighthouse CI** against the built output, asserting the §8 budgets.
7. Deploy a preview to a PR-specific path and comment the URL.

### `deploy.yml` — on push to `main`

1. Everything in `pr-checks` except the preview.
2. **`scripts/build-resume-pdf.mjs`** — serve `documents/Nutan_Prabhat_CV.pdf`, rendering it from `cv.json` only when it is missing or stale (Puppeteer against a print-styled route). This is the single-source-of-truth detail: one JSON produces both the site and the downloadable CV.
3. Upload the artifact and deploy with `actions/deploy-pages@v4`.
4. Use concurrency control so overlapping pushes don't race.

Add a `pre-commit` hook running `validate-data.mjs`, so bad JSON never reaches CI.

---

## 10. Build phases

Build in this order. **Do not** start on animation before deployment works end to end.

**Phase 0 — Deploy first.**
Scaffold Vite + React + TS + Tailwind. One page reading `basics.name` from JSON. Write `deploy.yml`. Push and confirm it's live at the Pages URL. Verify the `base` path is right. Everything else is easier once this loop is closed.

**Phase 1 — Data layer.**
Write both JSON files with real content. Write the schemas. Write `validate-data.mjs`. Generate TypeScript types from the schemas. Wire `pr-checks.yml`.

**Phase 2 — Structure, no animation.**
All sections rendering real data, responsive, semantic, accessible. Deliberately plain. Confirm the JSON drives everything — add a fake certificate, see it appear, remove it.

**Phase 3 — Navigation.**
Build the topology nav: graph layout, scroll-spy, click-to-scroll, keyboard support, mobile variant.

**Phase 4 — Animation.**
Hero sequence, scroll reveals, timeline draw, skill grid, hover states, particle field. Implement `useReducedMotion` first and gate everything through it as you go, not afterwards.

**Phase 5 — Cross-filter.**
The skill → experience/project highlight interaction. Left late because it touches every section.

**Phase 6 — Pipeline hardening.**
Lighthouse CI, PDF generation, preview deploys, budgets. Fix whatever the budgets surface.

**Phase 7 — Polish.**
OG image and meta tags, favicon, 404 page, `sitemap.xml`, `robots.txt`, print stylesheet.

---

## 11. Acceptance criteria

- [ ] Adding a certificate to `cv.json` and pushing puts it live with no component change.
- [ ] A typo'd `x_tech` key fails CI with a message naming the key.
- [ ] The site is fully usable with `prefers-reduced-motion: reduce`.
- [ ] The site is fully navigable by keyboard, including the topology nav.
- [ ] Lighthouse ≥ 90 performance, ≥ 95 accessibility on mobile emulation.
- [ ] The downloadable CV is generated in CI from `cv.json`, not committed by hand.
- [ ] No phone number anywhere in the deployed output.
- [ ] Nothing a visitor reads is hardcoded in a component.

---

## 12. Notes

- **Don't publish your phone number.** The site is public and scraped continuously. Email and LinkedIn are enough.
- **Keep `cv.json` in sync with the real CV.** Divergence between your site and the document you email is exactly the inconsistency a screener notices.
- **Pin CDN versions** before you consider this finished.
- Consider a custom domain later; it's a DNS record plus a `CNAME` file and looks materially more professional than a `github.io` subdomain.
