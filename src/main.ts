import './lib/render'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import './style.css'
import { initTheme } from './lib/theme'
import render from './views'

const app = document.querySelector<HTMLDivElement>('#app')!

initTheme()
void render(app)
