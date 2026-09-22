import { providersMap } from '../providers'

export interface TierProps {
  letter: string
  items?: string[]
}

const tierColorMap: Record<string, string> = {
  S: 'bg-tier-s',
  A: 'bg-tier-a',
  B: 'bg-tier-b',
  C: 'bg-tier-c',
  D: 'bg-tier-d',
  F: 'bg-tier-f',
}

export function tier(props: TierProps): string
export function tier(app: HTMLElement, props: TierProps): string
export default function tier(appOrProps: HTMLElement | TierProps, maybeProps?: TierProps): string {
  const props = (maybeProps ?? appOrProps) as TierProps
  const colorClass = tierColorMap[props.letter] ?? 'bg-neutral-600'
  const items = props.items ?? []

  return html`
    <div
      data-tier="${props.letter}"
      class="tier-row grow shrink-0 min-h-[216px] sm:min-h-[240px] md:min-h-[152px] flex md:flex-row flex-col sm:flex-col xs:flex-col items-stretch w-full overflow-hidden"
    >
      <div
        class="w-full h-24 md:h-full sm:w-full sm:h-24 xs:h-24 xs:w-full  md:w-42 lg:w-46 shrink-0 flex items-center justify-center p-2 sm:p-4 md:p-6 text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-medium leading-none select-none text-tier-text ${colorClass}"
      >
        <p class="m-0 p-0 leading-none">${props.letter}</p>
      </div>
      <div
        data-items
        class="md:flex-1 flex flex-wrap content-center items-center gap-3 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 text-white"
      >
        ${items
          .map((item) => {
            const provider = providersMap[item]
            const src = provider?.logo ?? item
            const label = provider?.name ?? item
            return html`
              <div
                data-provider="${item}"
                draggable="true"
                title="${label}"
                class="provider-cell group flex flex-col items-center gap-1.5 shrink-0 hover:scale-110 transition duration-150 ease-out cursor-grab active:cursor-grabbing select-none"
              >
                <div
                  class="provider-chip rounded-xl bg-white/5 group-hover:bg-white/15 p-1.5 sm:p-2 transition duration-150 ease-out"
                >
                  <img
                    src="${src}"
                    alt="${label}"
                    draggable="false"
                    class="h-15 w-15 sm:h-17.5 sm:w-17.5 md:h-20 md:w-20 object-contain"
                  />
                </div>
                <span
                  class="text-xs sm:text-sm leading-tight font-medium text-center text-white/70"
                >
                  ${label}
                </span>
              </div>
            `
          })
          .join('')}
      </div>
    </div>
  `
}
