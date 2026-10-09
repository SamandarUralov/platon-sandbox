/**
 * Router scaffold (SPEC §5/§10).
 *
 * In Interface mode, "navigation" is a canvas swap driven by the store, so the
 * router stays minimal. In Preview mode a later worker builds real routes from
 * `pages[]`. The instance is wired here so the plugin + history exist from the
 * foundation onward.
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { h } from 'vue'

// The shell is rendered directly by App.vue; the router is scaffolding for the
// Preview mode a later worker builds. A render-less placeholder avoids coupling
// the router chunk to the shell (and the mixed static/dynamic import warning).
const Placeholder = { name: 'SandboxPlaceholder', render: () => h('div') }

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'sandbox', component: Placeholder },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
