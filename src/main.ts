import './lib/render'
import './style.css'
import render from './views'

const app = document.querySelector<HTMLDivElement>('#app')!

render(app)
