// AI models, loaded from models.dev (https://models.dev) when the list is first opened.
//
// The Effect client in @opencode-ai/models (`@opencode-ai/models/effect`) is built
// against an older effect v4 beta and crashes on import with the effect we use,
// so this fetches models.json itself.

import { Effect, Schedule, Schema } from 'effect'
import { FetchHttpClient, HttpClient } from 'effect/unstable/http'
import { MODELS_DEV, modelOptions } from '../lib/models'
import { releasedWithin, type TierList } from '../lib/tierlist'

/**
 * `GET /models.json`, keyed by canonical model id, trimmed to the fields this
 * list uses. Modalities stay plain strings, so a new one can't break the list.
 */
const ModelsJson = Schema.Record(
  Schema.String,
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    release_date: Schema.optional(Schema.String),
    modalities: Schema.optional(
      Schema.Struct({ input: Schema.Array(Schema.String), output: Schema.Array(Schema.String) }),
    ),
  }),
)

/**
 * Colored lab logos by lab id (the file name, e.g. `moonshotai.svg`), in place
 * of models.dev's monochrome ones. Most are the `-color` icons from LobeHub
 * (@lobehub/icons-static-svg, MIT), picked for the brand the lab's models go
 * by: Qwen for alibaba, Kimi for moonshotai, Claude for anthropic.
 */
const labLogos: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../assets/logos/labs/*.svg', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.svg'.length), url]),
)

/** models.dev ids of the models the picker lists first, in this order, ahead of the newest ones. */
const FEATURED_MODELS = [
  'anthropic/claude-opus-5-5',
  'anthropic/claude-fable-5-1',
  'openai/gpt-6-astra',
  'openai/gpt-6-sol',
  'openai/gpt-6-luna',
  'xai/grok-4.7',
  'meta/muse-spark-1.3',
  'zhipuai/glm-5.3',
]

/** Fetches the models, giving each attempt 10 seconds and retrying twice with backoff. */
const loadModels = Effect.gen(function* () {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk)
  const response = yield* client.get(`${MODELS_DEV}/models.json`)
  const models = yield* Schema.decodeUnknownEffect(ModelsJson)(yield* response.json)
  return modelOptions(models, { labLogos, featured: FEATURED_MODELS })
}).pipe(
  Effect.timeout('10 seconds'),
  Effect.retry({ times: 2, schedule: Schedule.exponential('500 millis') }),
  // Trace headers would make this a CORS preflight, which models.dev rejects.
  Effect.provideService(HttpClient.TracerPropagationEnabled, false),
  Effect.provide(FetchHttpClient.layer),
)

export const models: TierList = {
  id: 'models',
  name: 'AI models',
  label: 'Models',
  tiers: ['S', 'A', 'B', 'C', 'D', 'F'],
  options: loadModels,
  pickerFilter: {
    label: 'Hide models older than 1 year',
    keep: (option) => releasedWithin(option, 12),
  },
}
