/**
 * Bootstrap (SPEC §10). Wires Pinia, vue-query, vue-router and mounts the
 * Sandbox. Vue is loaded via the runtime-compiler build (see vite.config.ts) so
 * custom components / user templates can be compiled at runtime (SPEC §4).
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

// ui-kit styles + foundation base styles.
import '@platon-rs/platon-ui-kit/style.css'
import '@/styles/base.css'

import App from './App.vue'
import { router } from '@/router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin)
app.mount('#app')
