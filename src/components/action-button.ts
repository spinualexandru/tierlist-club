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
  /** Starts disabled; the view keeps it in step after that. */
  disabled?: boolean
  /** Starts hidden (the whole chip); the view keeps it in step after that. */
  hidden?: boolean
}

/**
 * Icon button in its own bordered chip, with a toast above it naming it on
 * hover (`data-action-label`, which a disabled button can use to say why). A
 * `data-armed` button (waiting for a confirming click) turns red and reveals
 * its `confirmLabel`.
 */
export default function actionButton({
  action,
  label,
  icon,
  frame,
  confirmLabel,
  disabled = false,
  hidden = false,
}: ActionButtonProps): string {
  return html`
    <div class="${frame} p-1 rounded-2xl shadow-lg shadow-shade-soft" ${hidden ? 'hidden' : ''}>
      <button
        type="button"
        data-${action}
        aria-label="${label}"
        ${disabled ? 'disabled' : ''}
        class="${
          confirmLabel ? 'confirm-action' : ''
        } group relative inline-flex items-center justify-center h-12 min-w-12 px-2.5 rounded-xl text-foreground/90 cursor-pointer select-none hover:text-foreground hover:bg-foreground/10 data-armed:text-tier-s data-armed:bg-tier-s/15 active:scale-90 disabled:text-foreground/35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:active:scale-100 transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground"
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
          data-action-label
          aria-hidden="true"
          class="pointer-events-none absolute bottom-full right-0 mb-3 translate-y-1 whitespace-nowrap rounded-lg border border-foreground/10 bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg shadow-shade-soft opacity-0 transition duration-150 ease-out group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
        >
          ${label}
        </span>
      </button>
    </div>
  `
}
