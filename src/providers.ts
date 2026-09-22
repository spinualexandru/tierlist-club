// Single source of truth for the agent logos bundled from src/assets/.
// Add a provider by dropping its SVG into src/assets/ and extending the list below.

import amp from './assets/amp.svg'
import antigravity from './assets/antigravity.svg'
import claude from './assets/claude.svg'
import cline from './assets/cline.svg'
import codex from './assets/codex.svg'
import cursor from './assets/cursor.svg'
import devin from './assets/devin.svg'
import droid from './assets/droid.svg'
import fx from './assets/fx.svg'
import githubCopilot from './assets/github-copilot.svg'
import grok from './assets/grok.svg'
import nanocoder from './assets/nanocoder.svg'
import ohMyPi from './assets/oh-my-pi.svg'
import opencode from './assets/opencode.svg'
import pi from './assets/pi.svg'
import rooCode from './assets/roo-code.svg'
import warp from './assets/warp.svg'
import zed from './assets/zed.svg'

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
  { id: 'antigravity', name: 'AntiGravity', logo: antigravity },
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
