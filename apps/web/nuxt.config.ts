export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  nitro: {
    preset: 'static'
  },
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:3001'
    }
  }
})