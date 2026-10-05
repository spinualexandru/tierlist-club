import type { TierList } from '../lib/tierlist'

// Grok Bot: https://asvg.app/icons/grok-bot (the mark from https://x.ai/bot).
// Dots: dots-o.svg from https://openai.com/index/introducing-dots/.
// Muse Bot: https://muse.ai/images/favicon/app-squiggle.svg.
// IronClaw: nearai/ironclaw's WebUI logo.png; nanobot: HKUDS/nanobot's WebUI icon.
// NanoClaw: https://nanoclaw.dev/favicon-192x192.png.
// Lindy: its site's 512px app icon; Manus: https://manus.im/icon.svg.
// Copilot Tasks: https://copilot.microsoft.com/static/cmc/favicon.svg.
// Perplexity Computer: pplx-icon-custom-computer in its official SVG sprite:
// https://pplx-marketing-static.perplexity.ai/assets/pplx-icons-D_S1l24Q.js.
import copilotTasks from '../assets/logos/copilot-tasks.svg'
import dots from '../assets/logos/dots.svg'
import grokBot from '../assets/logos/grok-bot.svg'
import hermes from '../assets/logos/hermes.svg'
import ironclaw from '../assets/logos/ironclaw.png'
import lindy from '../assets/logos/lindy.png'
import manus from '../assets/logos/manus.svg'
import museBot from '../assets/logos/muse-bot.svg'
import nanobot from '../assets/logos/nanobot.png'
import nanoclaw from '../assets/logos/nanoclaw.png'
import openclaw from '../assets/logos/openclaw.svg'
import perplexityComputer from '../assets/logos/perplexity-computer.svg'

export const assistants: TierList = {
  id: 'assistants',
  name: 'AI assistants',
  label: 'Assistants',
  title: 'AI Assistant Tier List Maker',
  description:
    'Rank AI assistants like Grok Bot, Dots, Manus, OpenClaw, and Perplexity Computer from S to F, then share a link or save a PNG. Free, no sign-up.',
  about:
    'These AI assistants can keep working in the background on tasks, research, planning, and ongoing projects. Compare cloud services like Grok Bot, Muse Bot, Dots, Lindy, Manus, Perplexity Computer, and Copilot Tasks alongside self-hosted assistants like Hermes, OpenClaw, IronClaw, nanobot, and NanoClaw.',
  tiers: ['S', 'A', 'B', 'C', 'D', 'F'],
  options: [
    { id: 'grok-bot', name: 'Grok Bot', image: grokBot, monochrome: true },
    { id: 'muse-bot', name: 'Muse Bot', image: museBot },
    { id: 'dots', name: 'Dots', image: dots },
    { id: 'hermes', name: 'Hermes', image: hermes },
    { id: 'openclaw', name: 'OpenClaw', image: openclaw },
    { id: 'ironclaw', name: 'IronClaw', image: ironclaw },
    { id: 'nanobot', name: 'nanobot', image: nanobot },
    { id: 'nanoclaw', name: 'NanoClaw', image: nanoclaw },
    { id: 'lindy', name: 'Lindy', image: lindy },
    { id: 'manus', name: 'Manus', image: manus },
    {
      id: 'perplexity-computer',
      name: 'Perplexity Computer',
      image: perplexityComputer,
      monochrome: true,
    },
    { id: 'copilot-tasks', name: 'Copilot Tasks', image: copilotTasks },
  ],
}
