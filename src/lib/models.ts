import type { TierOption } from './tierlist'

export const MODELS_DEV = 'https://models.dev'

/** A model's metadata from models.dev's `models.json`, as far as the models list is concerned. */
export interface ModelSummary {
  /** Canonical id, `<lab>/<model>`, e.g. 'anthropic/claude-opus-4-6'. */
  readonly id: string
  readonly name: string
  /** YYYY-MM or YYYY-MM-DD. */
  readonly release_date?: string
  readonly modalities?: { readonly input: readonly string[]; readonly output: readonly string[] }
}

/**
 * Text models take text in and give only text back, which leaves out image,
 * video, music, and speech generators as well as speech-to-text and voice models.
 */
const isTextModel = ({ modalities }: ModelSummary): boolean =>
  !!modalities?.input.includes('text') &&
  modalities.output.length > 0 &&
  modalities.output.every((modality) => modality === 'text')

export interface ModelOptionsConfig {
  /** Colored logos by lab id, in place of models.dev's monochrome ones. */
  labLogos?: Record<string, string>
  /** Model ids that come first, in this order; ids models.dev doesn't have are skipped. */
  featured?: readonly string[]
}

/**
 * Every text model as an option: the `featured` ones first, then the rest
 * newest release first, so the picker opens on the latest ones. Each shows
 * its lab's logo: the colored one in `labLogos` if there is one, else
 * models.dev's monochrome one.
 */
export const modelOptions = (
  models: Record<string, ModelSummary>,
  { labLogos = {}, featured = [] }: ModelOptionsConfig = {},
): TierOption[] => {
  /** Where a model goes among the featured ones, or after them all. */
  const featuredRank = (id: string): number => {
    const rank = featured.indexOf(id)
    return rank === -1 ? featured.length : rank
  }
  return Object.values(models)
    .filter(isTextModel)
    .toSorted(
      (a, b) =>
        featuredRank(a.id) - featuredRank(b.id) ||
        (b.release_date ?? '').localeCompare(a.release_date ?? '') ||
        a.name.localeCompare(b.name),
    )
    .map((model) => {
      const lab = model.id.split('/')[0]
      const colored = Object.hasOwn(labLogos, lab)
      return {
        id: model.id,
        name: model.name,
        image: colored ? labLogos[lab] : `${MODELS_DEV}/logos/labs/${encodeURIComponent(lab)}.svg`,
        // models.dev's lab logos are drawn in currentColor, which is black in an <img>.
        monochrome: !colored,
        released: model.release_date,
      }
    })
}
