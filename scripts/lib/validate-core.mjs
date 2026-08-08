/**
 * The single definition of "valid data" for this repo.
 *
 * Used by scripts/validate-data.mjs (CLI, pre-commit, CI) and by the dev-only
 * editor's save endpoint, so the editor cannot write anything CI would reject.
 *
 * Pure: takes the parsed documents and returns an array of readable errors.
 * `fileExists` is injected so the browser can skip filesystem checks.
 */
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

export function validateData({
  resume,
  assets,
  resumeSchema,
  assetsSchema,
  // (publicRelativeSrc) => boolean. Default: skip the check.
  fileExists = null,
}) {
  const errors = []

  // 1. Schema validation
  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true })
  addFormats(ajv)
  for (const [name, data, schema] of [
    ['resume.json', resume, resumeSchema],
    ['assets.json', assets, assetsSchema],
  ]) {
    const validate = ajv.compile(schema)
    if (!validate(data)) {
      for (const err of validate.errors ?? []) {
        errors.push(`${name}${err.instancePath || '/'}: ${err.message}`)
      }
    }
  }

  // 2. Every tech key referenced anywhere must resolve in assets.tech —
  //    otherwise the site silently renders a broken logo.
  const techKeys = new Set(Object.keys(assets.tech ?? {}))
  const checkTech = (keys, where) => {
    for (const key of keys ?? []) {
      if (!techKeys.has(key)) {
        errors.push(
          `${where}: unknown tech key "${key}" — add it to assets.json#/tech or fix the typo`,
        )
      }
    }
  }
  resume.work?.forEach((w, i) => checkTech(w.x_tech, `resume.json work[${i}] ("${w.name}")`))
  resume.projects?.forEach((p, i) =>
    checkTech(p.x_tech, `resume.json projects[${i}] ("${p.name}")`),
  )
  resume.skills?.forEach((s, i) => checkTech(s.keywords, `resume.json skills[${i}] ("${s.name}")`))
  resume.certificates?.forEach((c, i) =>
    checkTech(c.x_tech, `resume.json certificates[${i}] ("${c.name}")`),
  )

  // 3. A section listed in sectionOrder without data must fail, not render empty.
  const sectionHasData = {
    about: () => Boolean(resume.basics?.summary),
    experience: () => (resume.work?.length ?? 0) > 0,
    skills: () => (resume.skills?.length ?? 0) > 0,
    projects: () => (resume.projects?.length ?? 0) > 0,
    certifications: () => (resume.certificates?.length ?? 0) > 0,
    awards: () => (resume.awards?.length ?? 0) > 0,
    contact: () => Boolean(resume.basics?.email) || (resume.basics?.profiles?.length ?? 0) > 0,
  }
  for (const section of resume.x_meta?.sectionOrder ?? []) {
    const check = sectionHasData[section]
    if (check && !check()) {
      errors.push(
        `resume.json x_meta.sectionOrder: section "${section}" is listed but has no data to render`,
      )
    }
  }

  // 4. CDN sources pinned; local sources must exist under public/.
  for (const [key, entry] of Object.entries(assets.tech ?? {})) {
    if (entry.src?.includes('@latest')) {
      errors.push(`assets.json tech.${key}: CDN src uses @latest — pin a version (e.g. @v2.16.0)`)
    }
    if (fileExists && entry.src?.startsWith('/') && !fileExists(entry.src)) {
      errors.push(`assets.json tech.${key}: local src "${entry.src}" not found under public/`)
    }
  }
  for (const [key, entry] of Object.entries(assets.images ?? {})) {
    if (fileExists && entry.src?.startsWith('/') && !fileExists(entry.src)) {
      errors.push(`assets.json images.${key}: local src "${entry.src}" not found under public/`)
    }
  }
  if (fileExists && assets.defaults?.fallback && !fileExists(assets.defaults.fallback)) {
    errors.push(
      `assets.json defaults.fallback: "${assets.defaults.fallback}" not found under public/`,
    )
  }

  // 5. A hero emphasis that isn't in its own line highlights nothing — the
  //    typewriter would just render the line plain, with no visible symptom.
  resume.x_meta?.headlines?.forEach((line, i) => {
    if (line.emphasis && !line.text?.includes(line.emphasis)) {
      errors.push(
        `resume.json x_meta.headlines[${i}]: emphasis "${line.emphasis}" does not appear in text "${line.text}"`,
      )
    }
  })

  // 6. The phone number must never reach committed JSON (it is injected at PDF
  //    build time from CV_PHONE). Guards against the editor writing it back in.
  if (resume.basics?.phone) {
    errors.push(
      'resume.json basics.phone: must stay empty — the CV phone comes from the CV_PHONE env var, never from committed JSON',
    )
  }

  return errors
}
