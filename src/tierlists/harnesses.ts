// AI coding harnesses. Add one by dropping its SVG into src/assets/logos/ and
// extending the options below.

import type { TierList } from '../lib/tierlist'

import amp from '../assets/logos/amp.svg'
import antigravity from '../assets/logos/antigravity.svg'
import claude from '../assets/logos/claude.svg'
import cline from '../assets/logos/cline.svg'
import codex from '../assets/logos/codex.svg'
import crush from '../assets/logos/crush.png'
import cursor from '../assets/logos/cursor.svg'
import deepseekHarness from '../assets/logos/deepseek-harness.svg'
import devin from '../assets/logos/devin.svg'
import droid from '../assets/logos/droid.svg'
import fx from '../assets/logos/fx.svg'
import githubCopilot from '../assets/logos/github-copilot.svg'
import goose from '../assets/logos/goose.svg'
import grok from '../assets/logos/grok.svg'
import hermes from '../assets/logos/hermes.svg'
import jcode from '../assets/logos/jcode.svg'
import junie from '../assets/logos/junie.svg'
import kiloCode from '../assets/logos/kilo-code.svg'
import museCode from '../assets/logos/muse-code.svg'
import nanocoder from '../assets/logos/nanocoder.svg'
import ohMyPi from '../assets/logos/oh-my-pi.svg'
import openinterpreter from '../assets/logos/open-interpreter.svg'
import openclaw from '../assets/logos/openclaw.svg'
import opencode from '../assets/logos/opencode.svg'
import openhands from '../assets/logos/openhands.svg'
import pi from '../assets/logos/pi.svg'
import primeAgent from '../assets/logos/prime-agent.svg'
import qwenCode from '../assets/logos/qwen-code.svg'
import rooCode from '../assets/logos/roo-code.svg'
import vibe from '../assets/logos/vibe.svg'
import warp from '../assets/logos/warp.svg'
import zed from '../assets/logos/zed.svg'

export const harnesses: TierList = {
  id: 'harnesses',
  name: 'AI harnesses',
  label: 'Harness',
  tiers: ['S', 'A', 'B', 'C', 'D', 'F'],
  options: [
    { id: 'amp', name: 'Amp', image: amp },
    { id: 'antigravity', name: 'Antigravity', image: antigravity },
    { id: 'claude', name: 'Claude', image: claude },
    { id: 'cline', name: 'Cline', image: cline },
    { id: 'codex', name: 'Codex', image: codex },
    { id: 'crush', name: 'crush', image: crush },
    { id: 'cursor', name: 'Cursor', image: cursor },
    { id: 'deepseek-harness', name: 'DeepSeek Harness', image: deepseekHarness },
    { id: 'devin', name: 'Devin', image: devin },
    { id: 'droid', name: 'Droid', image: droid },
    { id: 'fx', name: 'fx', image: fx },
    { id: 'github-copilot', name: 'GitHub Copilot', image: githubCopilot },
    { id: 'goose', name: 'goose', image: goose },
    { id: 'grok', name: 'Grok Build', image: grok },
    { id: 'hermes', name: 'Hermes', image: hermes },
    { id: 'jcode', name: 'jcode', image: jcode },
    { id: 'junie', name: 'Junie', image: junie },
    { id: 'kilo-code', name: 'Kilo Code', image: kiloCode },
    { id: 'mistral-vibe', name: 'Mistral Vibe', image: vibe },
    { id: 'muse-code', name: 'Muse Code', image: museCode },
    { id: 'nanocoder', name: 'nanocoder', image: nanocoder },
    { id: 'oh-my-pi', name: 'Oh MyPi', image: ohMyPi },
    { id: 'open-interpreter', name: 'Open Interpreter', image: openinterpreter },
    { id: 'openclaw', name: 'OpenClaw', image: openclaw },
    { id: 'opencode', name: 'OpenCode', image: opencode },
    { id: 'openhands', name: 'OpenHands', image: openhands },
    { id: 'pi', name: 'Pi', image: pi },
    { id: 'prime-agent', name: 'Prime Agent', image: primeAgent },
    { id: 'qwen-code', name: 'Qwen Code', image: qwenCode },
    { id: 'roo-code', name: 'Roo Code', image: rooCode },
    { id: 'warp', name: 'Warp', image: warp },
    { id: 'zed', name: 'Zed', image: zed },
  ],
}
