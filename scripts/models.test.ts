import assert from 'node:assert/strict'
import type { Modality, ModelMetadata } from '@opencode-ai/models'
import { modelOptions } from '../src/lib/models.ts'

const model = (
  id: string,
  name: string,
  release_date?: string,
  input: Modality[] = ['text'],
  output: Modality[] = ['text'],
): ModelMetadata => ({ id, name, description: '', release_date, modalities: { input, output } })
const MODELS = Object.fromEntries(
  [
    model('openai/gpt-5', 'GPT-5', '2025-08-07'),
    model('anthropic/claude-opus-4-6', 'Claude Opus 4.6', '2026-02-05'),
    model('google/gemini-3-pro', 'Gemini 3 Pro', '2025-11-18'),
    model('anthropic/claude-haiku-4-6', 'Claude Haiku 4.6', '2026-02-05'),
    model('meta/llama-2', 'Llama 2'),
  ].map((m) => [m.id, m]),
)

// --- newest release first, ties by name, undated last ---
assert.deepEqual(
  modelOptions(MODELS).map((o) => o.id),
  [
    'anthropic/claude-haiku-4-6',
    'anthropic/claude-opus-4-6',
    'google/gemini-3-pro',
    'openai/gpt-5',
    'meta/llama-2',
  ],
)

// --- text models only: text in, nothing but text out ---
const textOnly = modelOptions({
  ...MODELS,
  vision: model('openai/gpt-5-vision', 'Vision', '2025-08-07', ['text', 'image', 'pdf'], ['text']),
  image: model('openai/gpt-image-1', 'GPT Image 1', '2025-04-23', ['text', 'image'], ['image']),
  mixed: model(
    'google/gemini-3-pro-image',
    'Nano Banana',
    '2025-11-20',
    ['text'],
    ['text', 'image'],
  ),
  tts: model('google/gemini-2.5-pro-tts', 'TTS', '2025-05-20', ['text'], ['audio']),
  stt: model('openai/whisper-large-v3', 'Whisper', '2023-11-06', ['audio'], ['text']),
  unknown: { id: 'lab/no-modalities', name: 'No modalities', description: '' },
}).map((o) => o.id)
assert.ok(textOnly.includes('openai/gpt-5-vision'))
for (const id of [
  'openai/gpt-image-1',
  'google/gemini-3-pro-image',
  'google/gemini-2.5-pro-tts',
  'openai/whisper-large-v3',
  'lab/no-modalities',
]) {
  assert.ok(!textOnly.includes(id), id)
}

// --- canonical id and name, the lab's monochrome logo ---
assert.deepEqual(modelOptions({ 'openai/gpt-5': MODELS['openai/gpt-5'] }), [
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    image: 'https://models.dev/logos/labs/openai.svg',
    monochrome: true,
    released: '2025-08-07',
  },
])

// --- a colored lab logo replaces models.dev's monochrome one ---
assert.deepEqual(
  modelOptions(MODELS, { labLogos: { anthropic: '/anthropic.svg' } }).map(
    ({ id, image, monochrome }) => ({
      id,
      image,
      monochrome,
    }),
  ),
  [
    { id: 'anthropic/claude-haiku-4-6', image: '/anthropic.svg', monochrome: false },
    { id: 'anthropic/claude-opus-4-6', image: '/anthropic.svg', monochrome: false },
    {
      id: 'google/gemini-3-pro',
      image: 'https://models.dev/logos/labs/google.svg',
      monochrome: true,
    },
    { id: 'openai/gpt-5', image: 'https://models.dev/logos/labs/openai.svg', monochrome: true },
    { id: 'meta/llama-2', image: 'https://models.dev/logos/labs/meta.svg', monochrome: true },
  ],
)
// Only the lab's own logos, not inherited object keys.
assert.equal(modelOptions({ x: model('constructor/x', 'X', '2025-01-01') })[0].monochrome, true)

// --- featured models first, in their order, then the rest newest first ---
assert.deepEqual(
  modelOptions(MODELS, {
    featured: ['meta/llama-2', 'lab/gone', 'openai/gpt-5'],
  }).map((o) => o.id),
  [
    'meta/llama-2',
    'openai/gpt-5',
    'anthropic/claude-haiku-4-6',
    'anthropic/claude-opus-4-6',
    'google/gemini-3-pro',
  ],
)
// Featuring a model doesn't bring back one that isn't a text model.
assert.ok(
  !modelOptions(
    { tts: model('google/gemini-2.5-pro-tts', 'TTS', '2025-05-20', ['text'], ['audio']) },
    { featured: ['google/gemini-2.5-pro-tts'] },
  ).length,
)

// --- no models, no options ---
assert.deepEqual(modelOptions({}), [])

console.log('models: all assertions passed')
