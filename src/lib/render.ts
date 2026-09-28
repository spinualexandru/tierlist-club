;(globalThis as unknown as { html: typeof String.raw }).html = String.raw

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Makes text safe to interpolate into `html` markup, as content or a quoted attribute value. */
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => ESCAPES[char])
