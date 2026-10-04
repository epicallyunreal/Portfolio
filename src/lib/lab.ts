import labJson from '../../data/lab.json'
import type { Lab } from './types'

/**
 * The third source of truth, deliberately separate from cv.json.
 *
 * The résumé is a document that gets printed, versioned and sent to people;
 * this is a shelf of things I host and keep adding to. Keeping them apart
 * means adding a weekend tool never touches the file the CV is built from,
 * and the CV never has to be rebuilt because a side project shipped.
 */
export const lab = labJson as Lab
