// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // Regra para HTML: em React Native as aspas dentro de <Text> não precisam de escape.
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // As Edge Functions correm em Deno (imports por URL) e são verificadas com `deno check`.
    ignores: ["dist/*", "ios/*", "android/*", "supabase/functions/*/index.ts", "supabase/functions/_shared/runtime.ts"],
  }
]);
