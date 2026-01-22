// eslint.config.mjs

/**
 * Configuração mínima de ESLint para não rebentar o build no Vercel.
 * Não usa plugins externos.
 */
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
    ],
  },
]
