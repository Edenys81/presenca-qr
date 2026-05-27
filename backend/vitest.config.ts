import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 60000, // 60 segundos para todos os testes
    globals: true,
  },
});
