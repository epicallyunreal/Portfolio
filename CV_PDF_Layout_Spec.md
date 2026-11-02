# CV PDF — Layout Specification

This document specifies the layout of the downloadable CV and Resume, so it can be reproduced in a print stylesheet. It began as a copy of the original Word CV. The font, type sizes and spacing have since been changed on purpose.

**Source of truth:** `data/cv.json`. Nothing in the PDF is hardcoded.
**Recommended implementation:** a hidden `/cv` route rendered with print CSS, exported by Puppeteer (`scripts/build-resume-pdf.mjs`) to `documents/Nutan_Prabhat_CV.pdf`.

All measurements below are in points and millimetres.

---

## 1. Page

| Property              | Value                                        |
| --------------------- | -------------------------------------------- |
| Size                  | A4 (210 × 297 mm)                            |
| Margin — top / bottom | 34pt (≈ 12 mm)                               |
| Margin — left / right | 42.5pt (≈ 15 mm)                             |
| Columns               | Single. No tables, no sidebars, no graphics. |
| Target length         | The CV has no cap. The Resume is **1 page**. |

```css
@page {
  size: A4;
  margin: 12mm 15mm;
}
```

---

## 2. Typography

Base font is **Times New Roman**, self-hosted as `Tinos`, which is metrically identical and open-licensed, because Times New Roman is not present on Linux CI runners. Ship it as WOFF2 under `public/fonts/` and `@font-face` it in the print stylesheet. A different font changes the page count, so re-measure the Resume after any swap and set the bullet indent to that font's width of `• `.

| Element                  | Size   | Weight                   | Colour                             |
| ------------------------ | ------ | ------------------------ | ---------------------------------- |
| Name                     | 16pt   | Bold                     | `#000000`                          |
| Headline (under name)    | 11.5pt | Regular                  | `#333333`                          |
| Contact / links line     | 10pt   | Regular                  | `#1F1F1F`                          |
| Section header           | 11pt   | Bold                     | `#111111`                          |
| Body text, bullets       | 10pt   | Regular, bold highlights | `#1F1F1F`                          |
| Job title and company    | 11pt   | Bold                     | `#1F1F1F`                          |
| Date range               | 10pt   | Regular                  | `#333333`                          |
| Skill label (`Backend:`) | 10pt   | Bold                     | `#1F1F1F`                          |
| Link text                | 10pt   | Regular                  | Default hyperlink blue, underlined |

Baseline to baseline is **10pt on the Resume** (line-height 1) and **11pt on the CV** (line-height 1.1). Tune only if the page count breaks — this is the lever that matters most.

---

## 3. Spacing scale

Margins are _bottom_ unless noted. Where two values are given, the first is the Resume and the second is the CV.

| Element                          | Space before | Space after |
| -------------------------------- | ------------ | ----------- |
| Name                             | —            | 2pt         |
| Headline                         | —            | 2pt         |
| Contact line                     | —            | 1.5pt       |
| Links line                       | —            | 3pt         |
| Section header                   | 5pt / 7pt    | 2pt / 3pt   |
| Summary paragraph                | —            | 3pt         |
| Job heading                      | 3pt / 4pt    | 2pt         |
| Bullet                           | —            | 1.5pt       |
| Skill line                       | —            | 2pt         |
| Plain line (education, projects) | —            | 2pt         |

---

## 4. Elements

### 4.1 Header block — centred

```
                        NUTAN PRABHAT                          ← 16pt bold, uppercase
     Software Engineer | Backend and Full-Stack | C#, .NET     ← 11.5pt, #333, one line
  Pune, India  ·  Availability  ·  +91-XXXXXXXXXX  ·  email    ← 10pt
      linkedin.com/in/nutan-prabhat · github.com/username      ← 10pt, hyperlinked
```

- Name is uppercase in the rendered output.
- The availability text comes from `x_meta.cvAvailability` and is left out when empty.
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
  margin: 5pt 0 2pt; /* CV: 7pt 0 3pt */
  border-bottom: 0.75pt solid #8a8a8a;
  padding-bottom: 1pt; /* CV: 1.5pt */
  break-after: avoid; /* never orphan a header at a page foot */
}
```

`break-after: avoid` is the CSS equivalent of the `keepNext` used in the Word build. It matters — without it a section header can land alone at the bottom of page one.

### 4.3 Job heading

Title and company bold, joined by a hyphen, dates flushed right on the same line:

```
Senior Software Engineer - Aziro (formerly MSys Technologies)          Dec 2025 – Oct 2026
```

Use flexbox with `justify-content: space-between`, not tabs or tables. Date range uses an **en dash** with spaces, and `null` `endDate` renders as `Present`. Apply `break-after: avoid` so a heading never separates from its first bullet.

### 4.4 Bullets

```css
.bullet {
  padding-left: 14pt;
  text-indent: -0.6em; /* the width of '• ' in Tinos */
  margin-bottom: 1.5pt;
}
```

Marker is `•`. Bullets wrap to the hanging indent, not back to the margin. A work highlight marks its skim points `**like this**` in the JSON, and those print bold.

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
| 8   | ACHIEVEMENTS         | `awards[]`, full CV only. The one-page Resume prints these first under ACHIEVEMENTS AND CERTIFICATIONS   |
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
5. Write to `documents/Nutan_Prabhat_CV.pdf`.
6. **Report the page count.** The CV is the full record and runs as long as its content, so nothing asserts a length. The one-page Resume is checked by eye whenever its content changes.

The `/cv` route must be excluded from the sitemap and marked `noindex`.

---

## 8. Acceptance criteria

- [ ] The Resume is exactly 1 page of A4. The CV runs as long as its content.
- [ ] Text is selectable and copyable — not rasterised.
- [ ] The PDF parses cleanly as plain text (`pdftotext`) with sections in the order above; this is what ATS parsers see.
- [ ] No section header is orphaned at the foot of a page.
- [ ] No job heading is separated from its first bullet.
- [ ] Adding a certificate to `cv.json` changes the PDF on the next push, with no code change.
- [ ] The phone number appears in the PDF and nowhere in the deployed HTML or JSON.
- [ ] Font renders as Tinos on the CI runner, not a fallback.
