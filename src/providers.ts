// Single source of truth for the agent logos bundled from src/assets/.
// Add a provider by dropping its SVG into src/assets/ and extending the list below.

import amp from './assets/logos/amp.svg'
import antigravity from './assets/logos/antigravity.svg'
import claude from './assets/logos/claude.svg'
import cline from './assets/logos/cline.svg'
import codex from './assets/logos/codex.svg'
import cursor from './assets/logos/cursor.svg'
import devin from './assets/logos/devin.svg'
import droid from './assets/logos/droid.svg'
import fx from './assets/logos/fx.svg'
import githubCopilot from './assets/logos/github-copilot.svg'
import grok from './assets/logos/grok.svg'
import nanocoder from './assets/logos/nanocoder.svg'
import ohMyPi from './assets/logos/oh-my-pi.svg'
import opencode from './assets/logos/opencode.svg'
import pi from './assets/logos/pi.svg'
import rooCode from './assets/logos/roo-code.svg'
import warp from './assets/logos/warp.svg'
import zed from './assets/logos/zed.svg'

export interface Provider {
  /** Stable identifier used to reference the provider (e.g. in tier item lists). */
  id: string
  /** Human-readable brand name used for alt text and tooltips. */
  name: string
  /** Bundled logo URL. */
  logo: string
}

export const providers: Provider[] = [
  { id: 'amp', name: 'Amp', logo: amp },
  { id: 'antigravity', name: 'Antigravity', logo: antigravity },
  { id: 'claude', name: 'Claude', logo: claude },
  { id: 'cline', name: 'Cline', logo: cline },
  { id: 'codex', name: 'Codex', logo: codex },
  { id: 'cursor', name: 'Cursor', logo: cursor },
  { id: 'devin', name: 'Devin', logo: devin },
  { id: 'droid', name: 'Droid', logo: droid },
  { id: 'fx', name: 'fx', logo: fx },
  { id: 'github-copilot', name: 'GitHub Copilot', logo: githubCopilot },
  { id: 'grok', name: 'Grok', logo: grok },
  { id: 'nanocoder', name: 'nanocoder', logo: nanocoder },
  { id: 'oh-my-pi', name: 'Oh MyPi', logo: ohMyPi },
  { id: 'opencode', name: 'OpenCode', logo: opencode },
  { id: 'pi', name: 'Pi', logo: pi },
  { id: 'roo-code', name: 'Roo Code', logo: rooCode },
  { id: 'warp', name: 'Warp', logo: warp },
  { id: 'zed', name: 'Zed', logo: zed },
]

/** Lookup table by provider id. */
export const providersMap: Record<string, Provider> = Object.fromEntries(
  providers.map((provider) => [provider.id, provider] as const),
)

/** All provider ids, for populating tiers by default. */
export const allProviderIds = providers.map((provider) => provider.id)
