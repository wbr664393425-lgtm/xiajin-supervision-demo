import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './app/router'
import './design/base.css'
import { applyTheme } from './app/theme'

applyTheme()

createApp(App).use(createPinia()).use(router).mount('#app')
