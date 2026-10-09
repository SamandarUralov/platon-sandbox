/**
 * Mock-studio Playground entry point (test harness).
 *
 * A standalone Vue app — NOT the sandbox. It embeds the sandbox (served at
 * `/index.html`) inside an iframe and drives it over the postMessage protocol,
 * letting the whole runtime be exercised without the real Studio. Open with
 * `ao preview http://localhost:5173/playground.html` after `npm run dev`.
 */
import { createApp } from 'vue'

// ui-kit styles are harmless here and keep any embedded previews consistent.
import '@platon-rs/platon-ui-kit/style.css'

import Playground from './Playground.vue'

createApp(Playground).mount('#playground')
