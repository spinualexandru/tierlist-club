export interface ExportHeadingProps {
  /** The list's short name, e.g. 'Harness' for "Harness Tier List". */
  label: string
}

/**
 * Top left of the PNG export: the logo, at the site header's size, and
 * "<label> Tier List", 25% smaller than the header's wordmark. The space below
 * it (with the tier list's own top padding) matches the space above it (with
 * the export's margin).
 */
export function exportHeading({ label }: ExportHeadingProps): string {
  return html`
    <div class="flex items-center gap-2 shrink-0 px-4 pt-4 pb-5">
      <img src="/logo.svg" alt="" width="48" height="48" class="h-12 w-12" />
      <span class="wordmark text-lg leading-none whitespace-nowrap text-foreground"
        >${label} Tier List</span
      >
    </div>
  `
}

/** Bottom left of the PNG export: "Build your own at tierlist.club", in the heading's type. */
export function exportFooter(): string {
  return html`
    <div class="shrink-0 px-4 pb-4">
      <span class="wordmark text-lg leading-none whitespace-nowrap text-foreground"
        >Build your own at tierlist.<span class="text-tier-s">club</span></span
      >
    </div>
  `
}
