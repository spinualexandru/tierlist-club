// src/globals.d.ts

declare global {
  /**
   * Tagged template identity function for editor syntax highlighting.
   */
  const html: (strings: TemplateStringsArray, ...values: unknown[]) => string
}

export {} // Keeps this file an ES module augmentation
