import resumeSchema from '../../data/schema/resume.schema.json'
import assetsSchema from '../../data/schema/assets.schema.json'
// The exact rules CI runs, so the editor flags a problem before you save
// rather than after you push.
import { validateData } from '../../scripts/lib/validate-core.mjs'
import type { EditorData } from './store'

export function validateDraft({ resume, assets }: EditorData): string[] {
  return validateData({
    resume,
    assets,
    resumeSchema,
    assetsSchema,
    // Filesystem checks can't run in the browser; the save endpoint applies
    // them server-side before writing.
    fileExists: null,
  })
}
