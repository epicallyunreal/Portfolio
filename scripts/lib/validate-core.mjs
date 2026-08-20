/**
 * The single definition of "valid data" for this repo.
 *
 * Used by scripts/validate-data.mjs (CLI, pre-commit, CI), by the dev-only
 * editor's save endpoint, and by the CV build when rendering an alternate
 * dataset — so none of them can accept what another would reject.
 *
 * Pure: takes the parsed documents and returns errors. `fileExists` is
 * injected so the browser can skip filesystem checks.
 *
 * Two shapes, one set of rules:
 *   validateDataDetailed() → [{ file, pointer, label, message }]
 *   validateData()         → ["<label>: <message>", ...]
 *
 * `pointer` is a JSON pointer into the offending document, for callers that
 * want to address the exact node. `label` is the human-readable location the
 * CLI has always printed. Both describe the same error.
 */
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

export function validateDataDetailed({
  resume,
  assets,
  lab = null,
  resumeSchema,
  assetsSchema,
  labSchema = null,
  // (publicRelativeSrc) => boolean. Default: skip the check.
  fileExists = null,
}) {
  const errors = []
  const add = (file, pointer, label, message) => errors.push({ file, pointer, label, message })

  // 1. Schema validation
  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true })
  addFormats(ajv)
  for (const [name, data, schema] of [
    ['resume.json', resume, resumeSchema],
    ['assets.json', assets, assetsSchema],
    // lab.json is optional: a checkout without it still validates.
    ...(lab && labSchema ? [['lab.json', lab, labSchema]] : []),
  ]) {
    const validate = ajv.compile(schema)
    if (!validate(data)) {
      for (const err of validate.errors ?? []) {
        add(name, err.instancePath, `${name}${err.instancePath || '/'}`, err.message)
      }
    }
  }

  // 2. Every tech key referenced anywhere must resolve in assets.tech —
  //    otherwise the site silently renders a broken logo.
  const techKeys = new Set(Object.keys(assets.tech ?? {}))
  const checkTech = (keys, pointer, label, file = 'resume.json') => {
    // Indexed so the pointer addresses the offending key, not just its array.
    ;(keys ?? []).forEach((key, k) => {
      if (!techKeys.has(key)) {
        add(
          file,
          `${pointer}/${k}`,
          label,
          `unknown tech key "${key}" — add it to assets.json#/tech or fix the typo`,
        )
      }
    })
  }
  resume.work?.forEach((w, i) =>
    checkTech(w.x_tech, `/work/${i}/x_tech`, `resume.json work[${i}] ("${w.name}")`),
  )
  resume.projects?.forEach((p, i) =>
    checkTech(p.x_tech, `/projects/${i}/x_tech`, `resume.json projects[${i}] ("${p.name}")`),
  )
  resume.skills?.forEach((s, i) =>
    checkTech(s.keywords, `/skills/${i}/keywords`, `resume.json skills[${i}] ("${s.name}")`),
  )
  resume.certificates?.forEach((c, i) =>
    checkTech(
      c.x_tech,
      `/certificates/${i}/x_tech`,
      `resume.json certificates[${i}] ("${c.name}")`,
    ),
  )

  lab?.items?.forEach((item, i) =>
    checkTech(item.tech, `/items/${i}/tech`, `lab.json items[${i}] ("${item.name}")`, 'lab.json'),
  )

  // A Lab banner that 404s is invisible until someone looks at the section,
  // so the file is checked here alongside every other local asset.
  lab?.items?.forEach((item, i) => {
    if (fileExists && item.image?.src && !fileExists(item.image.src)) {
      add(
        'lab.json',
        `/items/${i}/image/src`,
        `lab.json items[${i}] ("${item.name}")`,
        `image "${item.image.src}" not found under public/`,
      )
    }
  })

  // 3. A section listed in sectionOrder without data must fail, not render empty.
  const sectionHasData = {
    about: () => Boolean(resume.basics?.summary),
    experience: () => (resume.work?.length ?? 0) > 0,
    skills: () => (resume.skills?.length ?? 0) > 0,
    projects: () => (resume.projects?.length ?? 0) > 0,
    certifications: () => (resume.certificates?.length ?? 0) > 0,
    awards: () => (resume.awards?.length ?? 0) > 0,
    contact: () => Boolean(resume.basics?.email) || (resume.basics?.profiles?.length ?? 0) > 0,
    // Lab's data lives in lab.json, but the ordering that renders it is here.
    lab: () => (lab?.items?.length ?? 0) > 0,
  }
  ;(resume.x_meta?.sectionOrder ?? []).forEach((section, i) => {
    const check = sectionHasData[section]
    if (check && !check()) {
      add(
        'resume.json',
        `/x_meta/sectionOrder/${i}`,
        'resume.json x_meta.sectionOrder',
        `section "${section}" is listed but has no data to render`,
      )
    }
  })

  // 4. CDN sources pinned; local sources must exist under public/.
  for (const [key, entry] of Object.entries(assets.tech ?? {})) {
    if (entry.src?.includes('@latest')) {
      add(
        'assets.json',
        `/tech/${key}/src`,
        `assets.json tech.${key}`,
        'CDN src uses @latest — pin a version (e.g. @v2.16.0)',
      )
    }
    if (fileExists && entry.src?.startsWith('/') && !fileExists(entry.src)) {
      add(
        'assets.json',
        `/tech/${key}/src`,
        `assets.json tech.${key}`,
        `local src "${entry.src}" not found under public/`,
      )
    }
  }
  for (const [key, entry] of Object.entries(assets.images ?? {})) {
    if (fileExists && entry.src?.startsWith('/') && !fileExists(entry.src)) {
      add(
        'assets.json',
        `/images/${key}/src`,
        `assets.json images.${key}`,
        `local src "${entry.src}" not found under public/`,
      )
    }
  }
  if (fileExists && assets.defaults?.fallback && !fileExists(assets.defaults.fallback)) {
    add(
      'assets.json',
      '/defaults/fallback',
      'assets.json defaults.fallback',
      `"${assets.defaults.fallback}" not found under public/`,
    )
  }

  // 5. A hero emphasis that isn't in its own line highlights nothing — the
  //    typewriter would just render the line plain, with no visible symptom.
  resume.x_meta?.headlines?.forEach((line, i) => {
    if (line.emphasis && !line.text?.includes(line.emphasis)) {
      add(
        'resume.json',
        `/x_meta/headlines/${i}/emphasis`,
        `resume.json x_meta.headlines[${i}]`,
        `emphasis "${line.emphasis}" does not appear in text "${line.text}"`,
      )
    }
  })

  // 6. x_cv:false hides an entry from the CV. The CV prints these headings
  //    unconditionally, so excluding every entry in one leaves a bare heading
  //    over nothing — visible only in the PDF, which nobody re-reads as often
  //    as the site.
  for (const [key, heading] of [
    ['skills', 'Technical Skills'],
    ['work', 'Work Experience'],
    ['projects', 'Projects'],
    ['education', 'Education'],
    ['certificates', 'Certifications'],
  ]) {
    const entries = resume[key] ?? []
    if (entries.length > 0 && entries.every((e) => e.x_cv === false)) {
      add(
        'resume.json',
        `/${key}`,
        `resume.json ${key}`,
        `every entry is x_cv:false, so the CV would print a "${heading}" heading with nothing under it`,
      )
    }
  }

  // 7. The phone number must never reach committed JSON (it is injected at PDF
  //    build time from CV_PHONE). Guards against the editor writing it back in.
  if (resume.basics?.phone) {
    add(
      'resume.json',
      '/basics/phone',
      'resume.json basics.phone',
      'must stay empty — the CV phone comes from the CV_PHONE env var, never from committed JSON',
    )
  }

  return errors
}

/** The same rules, flattened to the one-line strings the CLI and editor print. */
export function validateData(input) {
  return validateDataDetailed(input).map((e) => `${e.label}: ${e.message}`)
}
