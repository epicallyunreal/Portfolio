# CV PDF — Layout Specification

The downloadable CV on the portfolio must be visually identical to the Word/PDF version already in circulation. This document specifies that layout precisely so it can be reproduced in a print stylesheet.

**Source of truth:** `data/cv.json`. Nothing in the PDF is hardcoded.
**Recommended implementation:** a hidden `/cv` route rendered with print CSS, exported by Puppeteer in CI (`scripts/build-resume-pdf.mjs`) to `public/Nutan_Prabhat_CV.pdf`.

The original is generated with the `docx` library, so all measurements below are converted from twips (1 twip = 1/20 pt) into points and millimetres.

---

## 1. Page

| Property              | Value                                        |
| --------------------- | -------------------------------------------- |
| Size                  | A4 (210 × 297 mm)                            |
| Margin — top / bottom | 34pt (≈ 12 mm)                               |
| Margin — left / right | 42.5pt (≈ 15 mm)                             |
| Columns               | Single. No tables, no sidebars, no graphics. |
| Target length         | **Exactly 2 pages** with current content     |

```css
@page {
  size: A4;
  margin: 12mm 15mm;
}
```

---

## 2. Typography

Base font is **Calibri**. Calibri is not present on Linux CI runners, so **self-host a metric-compatible font** in the repo rather than relying on the system — `Carlito` is metrically identical to Calibri and open-licensed. Ship it as WOFF2 under `public/fonts/` and `@font-face` it in the print stylesheet. Do not substitute Arial or Helvetica; the metrics differ enough to change the page count.

| Element                  | Size   | Weight  | Colour                             |
| ------------------------ | ------ | ------- | ---------------------------------- |
| Name                     | 20pt   | Bold    | `#000000`                          |
| Headline (under name)    | 12pt   | Regular | `#333333`                          |
| Contact / links line     | 10pt   | Regular | `#1F1F1F`                          |
| Section header           | 11pt   | Bold    | `#111111`                          |
| Body text, bullets       | 10.5pt | Regular | `#1F1F1F`                          |
| Job title                | 10.5pt | Bold    | `#1F1F1F`                          |
| Company name             | 10.5pt | Regular | `#1F1F1F`                          |
| Date range               | 10pt   | Regular | `#333333`                          |
| Skill label (`Backend:`) | 10.5pt | Bold    | `#1F1F1F`                          |
| Link text                | 10pt   | Regular | Default hyperlink blue, underlined |

Body line-height: **1.3**. Tune only if the page count breaks — this is the lever that matters most.

---

## 3. Spacing scale

Converted from the original. Margins are _bottom_ unless noted.

| Element                          | Space before | Space after |
| -------------------------------- | ------------ | ----------- |
| Name                             | —            | 2pt         |
| Headline                         | —            | 2pt         |
| Contact line                     | —            | 1.5pt       |
| Links line                       | —            | 3pt         |
| Section header                   | 10pt         | 4pt         |
| Summary paragraph                | —            | 3pt         |
| Job heading                      | 6pt          | 3pt         |
| Bullet                           | —            | 2pt         |
| Skill line                       | —            | 2pt         |
| Plain line (education, projects) | —            | 2pt         |

---

## 4. Elements

### 4.1 Header block — centred

```
                        NUTAN PRABHAT                          ← 20pt bold, uppercase
   Senior Software Engineer | Python · Django · REST APIs      ← 12pt, #333
              · React · AI Integration
     Pune, India  ·  +91-XXXXXXXXXX  ·  email@example.com      ← 10pt
      linkedin.com/in/nutan-prabhat · github.com/username      ← 10pt, hyperlinked
```

- Name is uppercase in the rendered output.
- Separator between contact items is `  ·  ` (two spaces either side of a middot).
- **Phone appears in the PDF but never on the website.** `basics.phone` is empty in `cv.json` by design — inject the number at PDF build time from a repository secret or a build-time env var (`CV_PHONE`), never from committed JSON.

### 4.2 Section header

Uppercase, bold, 11pt, with a hairline rule directly beneath:

```css
.section-header {
  font-size: 11pt;
  font-weight: 700;
  color: #111;
  text-transform: uppercase;
  margin: 10pt 0 4pt;
  border-bottom: 0.75pt solid #8a8a8a;
  padding-bottom: 2pt;
  break-after: avoid; /* never orphan a header at a page foot */
}
```

`break-after: avoid` is the CSS equivalent of the `keepNext` used in the Word build. It matters — without it a section header can land alone at the bottom of page one.

### 4.3 Job heading

Title bold, company regular after an em dash, dates flushed right on the same line:

```
Senior Software Developer — Aziro Technologies          Dec 2025 – Present
```

Use flexbox with `justify-content: space-between`, not tabs or tables. Date range uses an **en dash** with spaces, and `null` `endDate` renders as `Present`. Apply `break-after: avoid` so a heading never separates from its first bullet.

### 4.4 Bullets

```css
.bullet {
  padding-left: 14pt;
  text-indent: -9pt; /* hanging indent */
  margin-bottom: 2pt;
}
```

Marker is `•`. Bullets wrap to the hanging indent, not back to the margin.

### 4.5 Skill line

Bold label, colon, then a comma-separated run of items on the same line, wrapping naturally:

```
Backend: Python, Django, Django REST Framework (DRF), Flask, Node.js, REST API design, MVT architecture, OOP
```

### 4.6 Projects, Education, Certifications

Bold lead-in, em dash, then regular text on the same paragraph:

```
CreatorHub — Django 6, DRF, SimpleJWT, React 19, Vite. Multi-tenant agency operations platform...
MCA, Computer Applications — Vellore Institute of Technology (2020 – 2022) · GPA 8.7/10
```

Project names that have a `url` are hyperlinked on the name only, not the description.

---

## 5. Section order and JSON mapping

| #   | PDF section          | Source in `cv.json`                                                                                      |
| --- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | _(header)_           | `basics.name`, `x_meta.cvHeadline`, `basics.location`, `basics.email`, `basics.profiles`, `CV_PHONE` env |
| 2   | PROFESSIONAL SUMMARY | `basics.summary`                                                                                         |
| 3   | TECHNICAL SKILLS     | `skills[]` — `name` as bold label, `keywords` resolved to `assets.tech[key].label`                       |
| 4   | WORK EXPERIENCE      | `work[]` — `position`, `name`, dates, `highlights[]`                                                     |
| 5   | PROJECTS             | `projects[]` — `name`, `description`, `url`                                                              |
| 6   | EDUCATION            | `education[]` — `studyType`, `area`, `institution`, dates, `score`                                       |
| 7   | CERTIFICATIONS       | `certificates[]` — `name`, `issuer`, `date`, `x_status`                                                  |
| 8   | ACHIEVEMENTS         | `awards[]` — **not yet in cv.json, see §6**                                                              |
| 9   | LANGUAGES            | `languages[]` — comma-joined `language` values                                                           |

**Rendering rules**

- Skills render the human `label` from `assets.json`, not the raw key: `python` → `Python`, `drf` → `Django REST Framework`.
- `x_status: "in-progress"` renders as `(in progress, expected <date>)`; `"completed"` renders as `(<date>)`.
- Both Zenoti roles appear as separate dated entries, in reverse-chronological order.
- Order `work[]` and `projects[]` by start date descending; do not rely on array order.

---

## 6. Two gaps to close in `cv.json`

The current file cannot yet produce the full CV. Both need adding before the PDF build is complete.

**Achievements.** The CV carries a line the JSON has no home for:

> HackerRank: 5-star in Python, SQL, and C++ · CodeChef: peak rating 1692 across 73 contests.

Add an `awards` array (a standard JSON Resume key) and extend `resume.schema.json` to define it:

```json
"awards": [
  { "title": "HackerRank 5-star — Python, SQL, C++", "awarder": "HackerRank", "date": "2024" },
  { "title": "CodeChef — peak rating 1692 across 73 contests", "awarder": "CodeChef", "date": "2024" }
]
```

**Headline mismatch.** `basics.label` currently reads _"Senior Software Engineer — Backend & Full-Stack"_, while the CV header reads _"Senior Software Engineer | Python · Django · REST APIs · React · AI Integration"_. The site and the CV want different lengths here. Add `x_meta.cvHeadline` for the PDF and leave `basics.label` for the website, so each can change independently.

---

## 7. Build script

`scripts/build-resume-pdf.mjs`, run in `deploy.yml` before the Pages upload:

1. Start a static preview of the built site (`vite preview`) on a local port.
2. Launch Puppeteer, navigate to `/cv?print=1` — a route that renders only the CV, with the site chrome, nav and animations suppressed.
3. Wait for `document.fonts.ready` before printing, or the self-hosted font may not have loaded and the layout will shift.
4. `page.pdf({ format: 'A4', printBackground: false, margin: 0 })` — margins come from `@page`, not from Puppeteer, so they aren't applied twice.
5. Write to `public/Nutan_Prabhat_CV.pdf`.
6. **Assert the output is exactly 2 pages.** Fail the build otherwise — this catches content growth silently pushing the CV to three pages, which is the most likely regression.

The `/cv` route must be excluded from the sitemap and marked `noindex`.

---

## 8. Acceptance criteria

- [ ] Output is exactly 2 pages of A4.
- [ ] Text is selectable and copyable — not rasterised.
- [ ] The PDF parses cleanly as plain text (`pdftotext`) with sections in the order above; this is what ATS parsers see.
- [ ] No section header is orphaned at the foot of a page.
- [ ] No job heading is separated from its first bullet.
- [ ] Adding a certificate to `cv.json` changes the PDF on the next push, with no code change.
- [ ] The phone number appears in the PDF and nowhere in the deployed HTML or JSON.
- [ ] Font renders as Carlito/Calibri metrics on the CI runner, not a fallback.
