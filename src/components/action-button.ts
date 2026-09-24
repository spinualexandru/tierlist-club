export interface ActionButtonProps {
  /** Rendered as a `data-<action>` attribute, which the view dispatches clicks on. */
  action: string
  /** Accessible name, also shown in the toast while hovered or focused. */
  label: string
  icon: string
  /** Border classes for the chip around the button, e.g. 'rainbow-border-spin'. */
  frame: string
  /** Text that slides out beside the icon while the button is `data-armed`. */
  confirmLabel?: string
}

/**
 * Icon button in its own bordered chip, with a toast above it naming it on
 * hover. A `data-armed` button (waiting for a confirming click) turns red and
 * reveals its `confirmLabel`.
 */
export default function actionButton({
  action,
  label,
  icon,
  frame,
  confirmLabel,
}: ActionButtonProps): string {
  return html`
    <div class="${frame} p-1 rounded-2xl shadow-lg shadow-black/40">
      <button
        type="button"
        data-${action}
        aria-label="${label}"
        class="${
          confirmLabel ? 'confirm-action' : ''
        } group relative inline-flex items-center justify-center h-12 min-w-12 px-2.5 rounded-xl text-white/90 cursor-pointer select-none hover:text-white hover:bg-white/10 data-armed:text-tier-s data-armed:bg-tier-s/15 active:scale-90 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-white"
      >
        ${icon}
        ${
          confirmLabel
            ? html`<span aria-hidden="true" class="confirm-label text-sm font-semibold"
                >${confirmLabel}</span
              >`
            : ''
        }
        <span
          aria-hidden="true"
          class="pointer-events-none absolute bottom-full right-0 mb-3 translate-y-1 whitespace-nowrap rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg shadow-black/40 opacity-0 transition duration-150 ease-out group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
        >
          ${label}
        </span>
      </button>
    </div>
  `
}
