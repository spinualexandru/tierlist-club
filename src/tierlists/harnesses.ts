// AI coding harnesses. Add one by dropping its SVG into src/assets/logos/ and
// extending the options below.

import type { TierList } from '../lib/tierlist'

import amp from '../assets/logos/amp.svg'
import antigravity from '../assets/logos/antigravity.svg'
import claude from '../assets/logos/claude.svg'
import cline from '../assets/logos/cline.svg'
import codex from '../assets/logos/codex.svg'
import cursor from '../assets/logos/cursor.svg'
import devin from '../assets/logos/devin.svg'
import droid from '../assets/logos/droid.svg'
import fx from '../assets/logos/fx.svg'
import githubCopilot from '../assets/logos/github-copilot.svg'
import grok from '../assets/logos/grok.svg'
import nanocoder from '../assets/logos/nanocoder.svg'
import ohMyPi from '../assets/logos/oh-my-pi.svg'
import opencode from '../assets/logos/opencode.svg'
import pi from '../assets/logos/pi.svg'
import rooCode from '../assets/logos/roo-code.svg'
import warp from '../assets/logos/warp.svg'
import zed from '../assets/logos/zed.svg'

export const harnesses: TierList = {
  id: 'harnesses',
  name: 'AI harnesses',
  tiers: ['S', 'A', 'B', 'C', 'D', 'F'],
  options: [
    { id: 'amp', name: 'Amp', image: amp },
    { id: 'antigravity', name: 'Antigravity', image: antigravity },
    { id: 'claude', name: 'Claude', image: claude },
    { id: 'cline', name: 'Cline', image: cline },
    { id: 'codex', name: 'Codex', image: codex },
    { id: 'cursor', name: 'Cursor', image: cursor },
    { id: 'devin', name: 'Devin', image: devin },
    { id: 'droid', name: 'Droid', image: droid },
    { id: 'fx', name: 'fx', image: fx },
    { id: 'github-copilot', name: 'GitHub Copilot', image: githubCopilot },
    { id: 'grok', name: 'Grok', image: grok },
    { id: 'nanocoder', name: 'nanocoder', image: nanocoder },
    { id: 'oh-my-pi', name: 'Oh MyPi', image: ohMyPi },
    { id: 'opencode', name: 'OpenCode', image: opencode },
    { id: 'pi', name: 'Pi', image: pi },
    { id: 'roo-code', name: 'Roo Code', image: rooCode },
    { id: 'warp', name: 'Warp', image: warp },
    { id: 'zed', name: 'Zed', image: zed },
  ],
}
